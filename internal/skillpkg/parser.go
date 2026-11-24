package skillpkg

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// SkillMeta holds parsed metadata from a skill's SKILL.md frontmatter.
type SkillMeta struct {
	Name        string
	Description string
	Author      string
	Version     string
	Tags        []string
}

// ParseSkillDir reads SKILL.md (or skill.md) inside dir and extracts metadata, body, and relative file list.
func ParseSkillDir(dir string) (SkillMeta, string, []string, error) {
	info, err := os.Stat(dir)
	if err != nil {
		return SkillMeta{}, "", nil, err
	}
	if !info.IsDir() {
		return SkillMeta{}, "", nil, fmt.Errorf("not a directory: %s", dir)
	}

	var files []string
	var skillMDPath string
	err = filepath.WalkDir(dir, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if d.Name() == ".git" || d.Name() == "node_modules" {
				return filepath.SkipDir
			}
			return nil
		}
		rel, err := filepath.Rel(dir, p)
		if err != nil {
			return err
		}
		relSlash := filepath.ToSlash(rel)
		files = append(files, relSlash)
		if skillMDPath == "" && strings.EqualFold(relSlash, "SKILL.md") {
			skillMDPath = p
		}
		return nil
	})
	if err != nil {
		return SkillMeta{}, "", nil, err
	}
	sort.Strings(files)

	if skillMDPath == "" {
		return SkillMeta{}, "", files, errors.New("SKILL.md not found in directory")
	}

	raw, err := os.ReadFile(skillMDPath)
	if err != nil {
		return SkillMeta{}, "", files, err
	}
	meta, body := ParseSkillMD(string(raw), filepath.Base(dir))
	return meta, body, files, nil
}

// ParseSkillMD extracts YAML frontmatter fields and the markdown body from raw SKILL.md content.
func ParseSkillMD(raw string, fallbackName string) (SkillMeta, string) {
	normalized := strings.ReplaceAll(raw, "\r\n", "\n")
	meta := SkillMeta{Name: fallbackName}
	body := normalized

	if strings.HasPrefix(normalized, "---\n") {
		rest := normalized[4:]
		if idx := strings.Index(rest, "\n---\n"); idx >= 0 {
			fm := rest[:idx]
			body = strings.TrimLeft(rest[idx+5:], "\n")
			parseFrontmatter(fm, &meta)
		} else if strings.HasSuffix(rest, "\n---") {
			fm := strings.TrimSuffix(rest, "\n---")
			body = ""
			parseFrontmatter(fm, &meta)
		}
	}

	if strings.TrimSpace(meta.Name) == "" {
		meta.Name = fallbackName
		for _, line := range strings.Split(body, "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "# ") {
				meta.Name = strings.TrimSpace(strings.TrimPrefix(trimmed, "# "))
				break
			}
		}
	}

	if strings.TrimSpace(meta.Description) == "" {
		meta.Description = inferDescription(body)
	}

	return meta, body
}

func parseFrontmatter(fm string, meta *SkillMeta) {
	lines := strings.Split(fm, "\n")
	inTagsList := false
	inMultilineDesc := false
	var descLines []string

	flushDesc := func() {
		if inMultilineDesc {
			meta.Description = strings.TrimSpace(strings.Join(descLines, " "))
			descLines = nil
			inMultilineDesc = false
		}
	}

	for _, rawLine := range lines {
		trimmed := strings.TrimSpace(rawLine)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		isIndented := strings.HasPrefix(rawLine, " ") || strings.HasPrefix(rawLine, "\t")
		if inTagsList && (strings.HasPrefix(trimmed, "- ") || isIndented) {
			if strings.HasPrefix(trimmed, "- ") {
				tag := cleanYAMLValue(strings.TrimPrefix(trimmed, "- "))
				if tag != "" {
					meta.Tags = append(meta.Tags, tag)
				}
			}
			continue
		}
		if inMultilineDesc && isIndented {
			descLines = append(descLines, trimmed)
			continue
		}

		inTagsList = false
		flushDesc()

		colonIdx := strings.Index(trimmed, ":")
		if colonIdx <= 0 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(trimmed[:colonIdx]))
		val := strings.TrimSpace(trimmed[colonIdx+1:])

		switch key {
		case "name":
			meta.Name = cleanYAMLValue(val)
		case "author":
			meta.Author = cleanYAMLValue(val)
		case "version":
			meta.Version = cleanYAMLValue(val)
		case "description":
			if val == "|" || val == ">" || val == "|-" || val == ">-" {
				inMultilineDesc = true
			} else {
				meta.Description = cleanYAMLValue(val)
			}
		case "tags", "keywords":
			if val == "" {
				inTagsList = true
			} else {
				meta.Tags = append(meta.Tags, parseInlineList(val)...)
			}
		}
	}
	flushDesc()
	meta.Tags = dedupStrings(meta.Tags)
}

func cleanYAMLValue(v string) string {
	v = strings.TrimSpace(v)
	if len(v) >= 2 {
		if (v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'') {
			return v[1 : len(v)-1]
		}
	}
	return v
}

func parseInlineList(v string) []string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "[")
	v = strings.TrimSuffix(v, "]")
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	var out []string
	for _, p := range parts {
		if cleaned := cleanYAMLValue(p); cleaned != "" {
			out = append(out, cleaned)
		}
	}
	return out
}

func inferDescription(body string) string {
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "```") {
			continue
		}
		if len(trimmed) > 180 {
			return trimmed[:177] + "..."
		}
		return trimmed
	}
	return ""
}

func dedupStrings(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	var out []string
	for _, item := range items {
		t := strings.TrimSpace(item)
		if t == "" {
			continue
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
	}
	return out
}

// SerializeSkillMD formats clean YAML frontmatter and body into SKILL.md text.
func SerializeSkillMD(name, description, author, version string, tags []string, body string) string {
	var sb strings.Builder
	sb.WriteString("---\n")
	sb.WriteString("name: ")
	sb.WriteString(yamlQuote(name))
	sb.WriteString("\n")
	if strings.TrimSpace(description) != "" {
		sb.WriteString("description: ")
		sb.WriteString(yamlQuote(description))
		sb.WriteString("\n")
	}
	if strings.TrimSpace(author) != "" {
		sb.WriteString("author: ")
		sb.WriteString(yamlQuote(author))
		sb.WriteString("\n")
	}
	if strings.TrimSpace(version) != "" {
		sb.WriteString("version: ")
		sb.WriteString(yamlQuote(version))
		sb.WriteString("\n")
	}
	cleanedTags := dedupStrings(tags)
	if len(cleanedTags) > 0 {
		sb.WriteString("tags: [")
		for i, t := range cleanedTags {
			if i > 0 {
				sb.WriteString(", ")
			}
			sb.WriteString(yamlQuote(t))
		}
		sb.WriteString("]\n")
	}
	sb.WriteString("---\n\n")
	sb.WriteString(strings.TrimLeft(strings.ReplaceAll(body, "\r\n", "\n"), "\n"))
	if !strings.HasSuffix(sb.String(), "\n") {
		sb.WriteString("\n")
	}
	return sb.String()
}

func yamlQuote(s string) string {
	s = strings.TrimSpace(strings.ReplaceAll(s, "\n", " "))
	if s == "" {
		return `""`
	}
	needsQuote := strings.ContainsAny(s, ":#{}[]&*!|>\"'%@`") || strings.HasPrefix(s, "-") || strings.HasPrefix(s, " ")
	if needsQuote {
		escaped := strings.ReplaceAll(s, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `"`, `\"`)
		return `"` + escaped + `"`
	}
	return s
}

// SanitizeSlug converts an arbitrary name into a safe Windows directory slug.
func SanitizeSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var sb strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			sb.WriteRune(r)
			prevDash = false
		case r == '-' || r == '_' || r == ' ' || r == '.' || r == '/':
			if sb.Len() > 0 && !prevDash {
				sb.WriteRune('-')
				prevDash = true
			}
		default:
			// Preserve non-ASCII letters (e.g., CJK) stripped of Windows forbidden path symbols
			if r > 127 && !strings.ContainsRune(`<>:"/\|?*`, r) {
				sb.WriteRune(r)
				prevDash = false
			}
		}
	}
	out := strings.Trim(sb.String(), "-_.")
	if out == "" {
		return "skill"
	}
	return out
}

// HashDir computes a deterministic SHA-256 digest of all files inside dir (excluding .git).
func HashDir(dir string) (string, error) {
	var paths []string
	err := filepath.WalkDir(dir, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if d.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		rel, err := filepath.Rel(dir, p)
		if err != nil {
			return err
		}
		paths = append(paths, filepath.ToSlash(rel))
		return nil
	})
	if err != nil {
		return "", err
	}
	sort.Strings(paths)

	h := sha256.New()
	for _, rel := range paths {
		h.Write([]byte(rel))
		h.Write([]byte{0})
		f, err := os.Open(filepath.Join(dir, filepath.FromSlash(rel)))
		if err != nil {
			return "", err
		}
		if _, err := io.Copy(h, f); err != nil {
			f.Close()
			return "", err
		}
		f.Close()
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// CopyDir recursively copies src directory to dst, excluding .git.
func CopyDir(src, dst string) error {
	if err := os.MkdirAll(dst, 0755); err != nil {
		return err
	}
	return filepath.WalkDir(src, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() && d.Name() == ".git" {
			return filepath.SkipDir
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return copyFile(p, target)
	})
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

// ExtractZipSkill extracts a ZIP archive into destDir with zip-slip protection and finds the folder containing SKILL.md.
func ExtractZipSkill(zipPath, destDir string) (string, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	cleanDest := filepath.Clean(destDir)
	if err := os.MkdirAll(cleanDest, 0755); err != nil {
		return "", err
	}

	for _, f := range r.File {
		target := filepath.Join(cleanDest, filepath.FromSlash(f.Name))
		cleanTarget := filepath.Clean(target)
		// Reject zip-slip traversal outside destDir
		if cleanTarget != cleanDest && !strings.HasPrefix(cleanTarget, cleanDest+string(filepath.Separator)) {
			return "", fmt.Errorf("illegal zip entry path: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(cleanTarget, 0755); err != nil {
				return "", err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(cleanTarget), 0755); err != nil {
			return "", err
		}
		rc, err := f.Open()
		if err != nil {
			return "", err
		}
		out, err := os.Create(cleanTarget)
		if err != nil {
			rc.Close()
			return "", err
		}
		_, copyErr := io.Copy(out, rc)
		closeErr := out.Close()
		rc.Close()
		if copyErr != nil {
			return "", copyErr
		}
		if closeErr != nil {
			return "", closeErr
		}
	}

	// Find SKILL.md at root or first shallowest directory containing SKILL.md
	var candidates []string
	_ = filepath.WalkDir(cleanDest, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil
		}
		if !d.IsDir() && strings.EqualFold(d.Name(), "SKILL.md") {
			candidates = append(candidates, filepath.Dir(p))
		}
		return nil
	})
	if len(candidates) == 0 {
		return "", errors.New("ZIP archive does not contain a SKILL.md file")
	}
	sort.Slice(candidates, func(i, j int) bool {
		return len(candidates[i]) < len(candidates[j])
	})
	return candidates[0], nil
}
