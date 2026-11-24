package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"skillsman/internal/model"
	"skillsman/internal/skillpkg"
)

func buildHTTPClient(settings model.Settings) *http.Client {
	tr := &http.Transport{}
	if p := strings.TrimSpace(settings.HTTPProxy); p != "" {
		if parsed, err := url.Parse(p); err == nil {
			tr.Proxy = http.ProxyURL(parsed)
		}
	}
	return &http.Client{
		Transport: tr,
		Timeout:   15 * time.Second,
	}
}

// SearchRegistry queries skills.sh or a custom JSON registry source for matching skills.
func SearchRegistry(reg model.RegistrySource, query string, settings model.Settings) ([]model.RegistryItem, error) {
	client := buildHTTPClient(settings)
	q := strings.TrimSpace(query)

	var endpoints []string
	if reg.Kind == "skills.sh" {
		base := strings.TrimRight(reg.URL, "/")
		if base == "" {
			base = "https://skills.sh"
		}
		searchTerm := q
		if searchTerm == "" {
			searchTerm = "skill"
		}
		endpoints = []string{
			fmt.Sprintf("%s/api/search?q=%s&limit=30", base, url.QueryEscape(searchTerm)),
			fmt.Sprintf("%s/api/v1/skills?q=%s&limit=30", base, url.QueryEscape(searchTerm)),
		}
	} else {
		u := strings.TrimSpace(reg.URL)
		if u == "" {
			return nil, fmt.Errorf("registry URL is empty")
		}
		if q != "" && strings.Contains(u, "{query}") {
			endpoints = []string{strings.ReplaceAll(u, "{query}", url.QueryEscape(q))}
		} else {
			endpoints = []string{u}
		}
	}

	var lastErr error
	for _, ep := range endpoints {
		items, err := fetchRegistryEndpoint(client, ep, reg.ID, settings.GitHubToken)
		if err == nil {
			if q != "" && reg.Kind != "skills.sh" {
				return filterRegistryItems(items, q), nil
			}
			return items, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no registry endpoints responded")
	}
	return nil, lastErr
}

func fetchRegistryEndpoint(client *http.Client, endpoint, registryID, token string) ([]model.RegistryItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SkillsMan/1.0")
	req.Header.Set("Accept", "application/json")
	if token != "" && strings.Contains(strings.ToLower(endpoint), "github") {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, endpoint)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	return ParseRegistryJSON(body, registryID)
}

// ParseRegistryJSON parses common registry JSON schemas into uniform RegistryItem entries.
func ParseRegistryJSON(raw []byte, registryID string) ([]model.RegistryItem, error) {
	var rawRecords []map[string]any

	trimmed := strings.TrimSpace(string(raw))
	if strings.HasPrefix(trimmed, "[") {
		if err := json.Unmarshal(raw, &rawRecords); err != nil {
			return nil, err
		}
	} else {
		var envelope map[string]any
		if err := json.Unmarshal(raw, &envelope); err != nil {
			return nil, err
		}
		for _, key := range []string{"skills", "items", "results", "data"} {
			if arr, ok := envelope[key].([]any); ok {
				for _, item := range arr {
					if m, ok := item.(map[string]any); ok {
						rawRecords = append(rawRecords, m)
					}
				}
				break
			}
		}
	}

	out := make([]model.RegistryItem, 0, len(rawRecords))
	for _, rec := range rawRecords {
		item := parseRegistryRecord(rec, registryID)
		if item.Name == "" && item.Slug == "" {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func parseRegistryRecord(m map[string]any, registryID string) model.RegistryItem {
	str := func(keys ...string) string {
		for _, k := range keys {
			if v, ok := m[k]; ok {
				if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
					return strings.TrimSpace(s)
				}
			}
		}
		return ""
	}
	num := func(keys ...string) int {
		for _, k := range keys {
			if v, ok := m[k]; ok {
				switch t := v.(type) {
				case float64:
					return int(t)
				case int:
					return t
				}
			}
		}
		return 0
	}

	id := str("id", "skillId", "slug", "name")
	slug := str("slug", "skillId", "name", "id")
	name := str("name", "title", "skillId", "slug")
	desc := str("description", "summary", "desc")
	author := str("author", "owner", "publisher")
	repoURL := str("repoUrl", "repo_url", "repository", "repo", "source", "github")
	subpath := str("subpath", "path", "dir", "skillPath")
	installs := num("installs", "installCount", "downloads", "stars")

	// skills.sh style "source": "owner/repo" or "owner/repo/skills/foo"
	if repoURL != "" && !strings.HasPrefix(repoURL, "http") && !strings.HasPrefix(repoURL, "git@") {
		parts := strings.Split(strings.Trim(repoURL, "/"), "/")
		if len(parts) >= 2 {
			ownerRepo := parts[0] + "/" + parts[1]
			if subpath == "" && len(parts) > 2 {
				subpath = strings.Join(parts[2:], "/")
			}
			repoURL = NormalizeRepoURL(ownerRepo)
			if author == "" {
				author = parts[0]
			}
		}
	}
	// Handle "id": "owner/repo/skillSlug" when repoURL is omitted
	if repoURL == "" && strings.Count(id, "/") >= 1 {
		parts := strings.Split(strings.Trim(id, "/"), "/")
		if len(parts) >= 2 {
			repoURL = NormalizeRepoURL(parts[0] + "/" + parts[1])
			if author == "" {
				author = parts[0]
			}
			if subpath == "" && len(parts) > 2 {
				subpath = strings.Join(parts[2:], "/")
			}
			if slug == id && len(parts) >= 3 {
				slug = parts[len(parts)-1]
			}
		}
	}

	var tags []string
	if rawTags, ok := m["tags"].([]any); ok {
		for _, t := range rawTags {
			if ts, ok := t.(string); ok && strings.TrimSpace(ts) != "" {
				tags = append(tags, strings.TrimSpace(ts))
			}
		}
	}

	return model.RegistryItem{
		ID:          id,
		Slug:        skillpkg.SanitizeSlug(slug),
		Name:        name,
		Description: desc,
		Author:      author,
		RepoURL:     repoURL,
		Subpath:     subpath,
		Installs:    installs,
		Tags:        tags,
		RegistryID:  registryID,
	}
}

func filterRegistryItems(items []model.RegistryItem, query string) []model.RegistryItem {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return items
	}
	var out []model.RegistryItem
	for _, it := range items {
		hay := strings.ToLower(it.Name + " " + it.Slug + " " + it.Description + " " + it.Author + " " + strings.Join(it.Tags, " "))
		if strings.Contains(hay, q) {
			out = append(out, it)
		}
	}
	return out
}

// InstallFromRegistryItem clones/updates the item's source repo and installs the target skill.
func InstallFromRegistryItem(
	item model.RegistryItem,
	reposCacheRoot string,
	storeRoot string,
	existing []model.Skill,
	settings model.Settings,
) (model.Skill, bool, error) {
	if strings.TrimSpace(item.RepoURL) == "" {
		return model.Skill{}, false, fmt.Errorf("registry item %q has no repository URL", item.Name)
	}
	repoKey := "reg-" + skillpkg.SanitizeSlug(inferRepoName(item.RepoURL))
	tmpRepo := model.RepoSource{
		ID:        repoKey,
		Name:      inferRepoName(item.RepoURL),
		URL:       NormalizeRepoURL(item.RepoURL),
		CachePath: filepath.Join(reposCacheRoot, repoKey),
	}
	if err := SyncRepo(&tmpRepo, reposCacheRoot, settings); err != nil {
		return model.Skill{}, false, err
	}

	subpath := strings.TrimSpace(item.Subpath)
	if subpath == "" {
		// Match by slug or name among discovered skills
		want := strings.ToLower(item.Slug)
		for _, d := range tmpRepo.DiscoveredSkills {
			if strings.ToLower(d.Slug) == want || strings.ToLower(skillpkg.SanitizeSlug(d.Name)) == want {
				subpath = d.Subpath
				break
			}
		}
		if subpath == "" && len(tmpRepo.DiscoveredSkills) == 1 {
			subpath = tmpRepo.DiscoveredSkills[0].Subpath
		}
		if subpath == "" && len(tmpRepo.DiscoveredSkills) > 0 {
			for _, d := range tmpRepo.DiscoveredSkills {
				if strings.Contains(strings.ToLower(d.Subpath), want) {
					subpath = d.Subpath
					break
				}
			}
		}
		if subpath == "" {
			subpath = "."
		}
	}

	sk, updated, err := InstallSkillFromRepo(tmpRepo, subpath, storeRoot, existing)
	if err != nil {
		return model.Skill{}, false, err
	}
	sk.SourceType = "registry"
	return sk, updated, nil
}
