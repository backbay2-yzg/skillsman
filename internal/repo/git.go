package repo

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"skillsman/internal/model"
	"skillsman/internal/skillpkg"
)

// NormalizeRepoURL expands owner/repo shorthand into a full GitHub clone URL.
func NormalizeRepoURL(raw string) string {
	u := strings.TrimSpace(raw)
	if u == "" {
		return ""
	}
	if strings.HasPrefix(u, "http://") || strings.HasPrefix(u, "https://") || strings.HasPrefix(u, "git@") || strings.HasPrefix(u, "ssh://") {
		return u
	}
	// Strip leading github.com/ if typed without scheme
	if strings.HasPrefix(strings.ToLower(u), "github.com/") {
		u = "https://" + u
		if !strings.HasSuffix(u, ".git") {
			u += ".git"
		}
		return u
	}
	// Support owner/repo shorthand
	parts := strings.Split(strings.Trim(u, "/"), "/")
	if len(parts) == 2 && !strings.Contains(parts[0], ".") {
		return fmt.Sprintf("https://github.com/%s/%s.git", parts[0], strings.TrimSuffix(parts[1], ".git"))
	}
	return u
}

// RewriteGitURL optionally applies a GitHub mirror prefix to https://github.com/ URLs.
func RewriteGitURL(rawURL string, mirror string) string {
	norm := NormalizeRepoURL(rawURL)
	mirror = strings.TrimSpace(mirror)
	if mirror == "" {
		return norm
	}
	lower := strings.ToLower(norm)
	if strings.HasPrefix(lower, "https://github.com/") || strings.HasPrefix(lower, "http://github.com/") {
		if !strings.HasSuffix(mirror, "/") {
			mirror += "/"
		}
		return mirror + norm
	}
	return norm
}

func runGit(ctx context.Context, settings model.Settings, dir string, urlForAuth string, args ...string) (string, error) {
	fullArgs := make([]string, 0, len(args)+2)
	if tok := strings.TrimSpace(settings.GitHubToken); tok != "" && strings.Contains(strings.ToLower(urlForAuth), "github.com") {
		fullArgs = append(fullArgs, "-c", "http.extraHeader=Authorization: Bearer "+tok)
	}
	fullArgs = append(fullArgs, args...)

	cmd := exec.CommandContext(ctx, "git", fullArgs...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if dir != "" {
		cmd.Dir = dir
	}

	env := append(os.Environ(), "GIT_TERMINAL_PROMPT=0", "GCM_INTERACTIVE=never")
	if proxy := strings.TrimSpace(settings.HTTPProxy); proxy != "" {
		env = append(env, "HTTP_PROXY="+proxy, "HTTPS_PROXY="+proxy, "http_proxy="+proxy, "https_proxy="+proxy)
	}
	cmd.Env = env

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return stdout.String(), fmt.Errorf("git %s: %s", strings.Join(args, " "), msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}

// SyncRepo clones or updates a repository into reposCacheRoot and scans all SKILL.md packages.
func SyncRepo(repo *model.RepoSource, reposCacheRoot string, settings model.Settings) error {
	if repo.ID == "" {
		return errors.New("repo id is required")
	}
	normURL := NormalizeRepoURL(repo.URL)
	if normURL == "" {
		return errors.New("repository URL is required")
	}
	repo.URL = normURL
	remoteURL := RewriteGitURL(normURL, settings.GitHubMirror)

	if repo.CachePath == "" {
		repo.CachePath = filepath.Join(reposCacheRoot, repo.ID)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	gitDir := filepath.Join(repo.CachePath, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		_ = os.RemoveAll(repo.CachePath)
		if err := os.MkdirAll(filepath.Dir(repo.CachePath), 0755); err != nil {
			return err
		}
		cloneArgs := []string{"clone", "--depth", "1"}
		if strings.TrimSpace(repo.Branch) != "" {
			cloneArgs = append(cloneArgs, "-b", strings.TrimSpace(repo.Branch))
		}
		cloneArgs = append(cloneArgs, remoteURL, repo.CachePath)
		if _, err := runGit(ctx, settings, "", remoteURL, cloneArgs...); err != nil {
			// Retry without -b in case repository uses a different default branch name
			if strings.TrimSpace(repo.Branch) != "" {
				_ = os.RemoveAll(repo.CachePath)
				if _, retryErr := runGit(ctx, settings, "", remoteURL, "clone", "--depth", "1", remoteURL, repo.CachePath); retryErr != nil {
					return retryErr
				}
			} else {
				return err
			}
		}
	} else {
		_, _ = runGit(ctx, settings, repo.CachePath, remoteURL, "remote", "set-url", "origin", remoteURL)
		fetchTarget := "HEAD"
		if strings.TrimSpace(repo.Branch) != "" {
			fetchTarget = strings.TrimSpace(repo.Branch)
		}
		if _, err := runGit(ctx, settings, repo.CachePath, remoteURL, "fetch", "--depth", "1", "origin", fetchTarget); err != nil {
			// Fallback to fetching default HEAD
			if _, retryErr := runGit(ctx, settings, repo.CachePath, remoteURL, "fetch", "--depth", "1", "origin"); retryErr != nil {
				return retryErr
			}
		}
		if _, err := runGit(ctx, settings, repo.CachePath, remoteURL, "reset", "--hard", "FETCH_HEAD"); err != nil {
			return err
		}
	}

	if headSHA, err := runGit(ctx, settings, repo.CachePath, remoteURL, "rev-parse", "HEAD"); err == nil {
		repo.LastCommit = headSHA
		repo.RemoteCommit = headSHA
		repo.HasUpdate = false
	}
	if strings.TrimSpace(repo.Branch) == "" {
		if br, err := runGit(ctx, settings, repo.CachePath, remoteURL, "rev-parse", "--abbrev-ref", "HEAD"); err == nil && br != "" && br != "HEAD" {
			repo.Branch = br
		}
	}

	repo.LastCheckedAt = time.Now().Format(time.RFC3339)
	skills, err := DiscoverSkillsInDir(repo.CachePath)
	if err != nil {
		return err
	}
	repo.DiscoveredSkills = skills
	if strings.TrimSpace(repo.Name) == "" {
		repo.Name = inferRepoName(repo.URL)
	}
	return nil
}

// CheckRepoUpdate queries the remote repository via git ls-remote to detect new commits.
func CheckRepoUpdate(repo *model.RepoSource, settings model.Settings) error {
	remoteURL := RewriteGitURL(repo.URL, settings.GitHubMirror)
	if remoteURL == "" {
		return errors.New("empty repository url")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	ref := "HEAD"
	if strings.TrimSpace(repo.Branch) != "" {
		ref = "refs/heads/" + strings.TrimSpace(repo.Branch)
	}
	out, err := runGit(ctx, settings, "", remoteURL, "ls-remote", remoteURL, ref)
	if err != nil || out == "" {
		out, err = runGit(ctx, settings, "", remoteURL, "ls-remote", remoteURL, "HEAD")
		if err != nil {
			return err
		}
	}
	fields := strings.Fields(out)
	if len(fields) > 0 {
		repo.RemoteCommit = fields[0]
		repo.HasUpdate = repo.LastCommit != "" && repo.RemoteCommit != "" && repo.RemoteCommit != repo.LastCommit
	}
	repo.LastCheckedAt = time.Now().Format(time.RFC3339)
	return nil
}

// DiscoverSkillsInDir recursively finds all directories containing a SKILL.md inside rootDir.
func DiscoverSkillsInDir(rootDir string) ([]model.DiscoveredSkill, error) {
	var found []model.DiscoveredSkill
	seenSubpaths := make(map[string]bool)

	err := filepath.WalkDir(rootDir, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil
		}
		if d.IsDir() {
			name := d.Name()
			if p != rootDir && (strings.HasPrefix(name, ".") || name == "node_modules" || name == "dist" || name == "build") {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.EqualFold(d.Name(), "SKILL.md") {
			return nil
		}
		skillDir := filepath.Dir(p)
		rel, err := filepath.Rel(rootDir, skillDir)
		if err != nil {
			return nil
		}
		subpath := filepath.ToSlash(rel)
		if seenSubpaths[subpath] {
			return nil
		}
		seenSubpaths[subpath] = true

		meta, _, _, err := skillpkg.ParseSkillDir(skillDir)
		if err != nil {
			return nil
		}
		slugBase := filepath.Base(skillDir)
		if subpath == "." {
			slugBase = meta.Name
		}
		slug := skillpkg.SanitizeSlug(slugBase)
		found = append(found, model.DiscoveredSkill{
			Slug:        slug,
			Name:        meta.Name,
			Description: meta.Description,
			Subpath:     subpath,
			Tags:        meta.Tags,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(found, func(i, j int) bool {
		return strings.ToLower(found[i].Name) < strings.ToLower(found[j].Name)
	})
	return found, nil
}

// InstallSkillFromRepo copies or updates a discovered skill from a synced repo cache into storeRoot.
func InstallSkillFromRepo(repo model.RepoSource, subpath string, storeRoot string, existing []model.Skill) (model.Skill, bool, error) {
	cleanSub := filepath.FromSlash(strings.TrimSpace(subpath))
	srcDir := repo.CachePath
	if cleanSub != "" && cleanSub != "." {
		srcDir = filepath.Join(repo.CachePath, cleanSub)
	}
	meta, _, files, err := skillpkg.ParseSkillDir(srcDir)
	if err != nil {
		return model.Skill{}, false, err
	}

	now := time.Now().Format(time.RFC3339)
	// Check if already installed from this repo+subpath -> update in place
	for _, sk := range existing {
		if sk.SourceRepoID == repo.ID && filepath.ToSlash(sk.SourceSubpath) == filepath.ToSlash(subpath) {
			if err := os.RemoveAll(sk.StorePath); err != nil {
				return model.Skill{}, false, err
			}
			if err := skillpkg.CopyDir(srcDir, sk.StorePath); err != nil {
				return model.Skill{}, false, err
			}
			hash, _ := skillpkg.HashDir(sk.StorePath)
			sk.Name = meta.Name
			sk.Description = meta.Description
			sk.Author = meta.Author
			sk.Version = meta.Version
			sk.Tags = meta.Tags
			sk.Files = files
			sk.ContentHash = hash
			sk.CommitHash = repo.LastCommit
			sk.RemoteCommit = repo.LastCommit
			sk.HasUpdate = false
			sk.UpdatedAt = now
			return sk, true, nil
		}
	}

	baseSlug := skillpkg.SanitizeSlug(filepath.Base(srcDir))
	if subpath == "." || subpath == "" || baseSlug == "skill" {
		baseSlug = skillpkg.SanitizeSlug(meta.Name)
	}
	slug := uniqueSlug(existing, baseSlug, storeRoot)
	destDir := filepath.Join(storeRoot, slug)
	if err := skillpkg.CopyDir(srcDir, destDir); err != nil {
		return model.Skill{}, false, err
	}
	hash, err := skillpkg.HashDir(destDir)
	if err != nil {
		return model.Skill{}, false, err
	}

	sk := model.Skill{
		ID:            "sk-" + slug + "-" + fmt.Sprintf("%d", time.Now().UnixNano()%100000),
		Slug:          slug,
		Name:          meta.Name,
		Description:   meta.Description,
		Author:        meta.Author,
		Version:       meta.Version,
		Tags:          meta.Tags,
		SourceType:    "git",
		SourceRepoID:  repo.ID,
		SourceSubpath: filepath.ToSlash(subpath),
		SourceURL:     repo.URL,
		CommitHash:    repo.LastCommit,
		RemoteCommit:  repo.LastCommit,
		StorePath:     destDir,
		ContentHash:   hash,
		CreatedAt:     now,
		UpdatedAt:     now,
		Files:         files,
	}
	return sk, false, nil
}

func uniqueSlug(existing []model.Skill, base, storeRoot string) string {
	used := make(map[string]bool, len(existing))
	for _, s := range existing {
		used[strings.ToLower(s.Slug)] = true
	}
	candidate := base
	for i := 2; ; i++ {
		if !used[strings.ToLower(candidate)] {
			if _, err := os.Stat(filepath.Join(storeRoot, candidate)); os.IsNotExist(err) {
				return candidate
			}
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
}

func inferRepoName(u string) string {
	trimmed := strings.TrimSuffix(strings.TrimSuffix(u, "/"), ".git")
	parts := strings.Split(trimmed, "/")
	if len(parts) >= 2 {
		return parts[len(parts)-2] + "/" + parts[len(parts)-1]
	}
	return trimmed
}
