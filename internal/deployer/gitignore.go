package deployer

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const (
	gitignoreStartMarker = "# >>> SkillsMan Managed >>>"
	gitignoreEndMarker   = "# <<< SkillsMan Managed <<<"
)

// UpdateGitignore atomically updates or removes SkillsMan's managed ignore block inside projectRoot/.gitignore.
func UpdateGitignore(projectRoot string, managedRelPaths []string) error {
	giPath := filepath.Join(projectRoot, ".gitignore")
	var existing string
	if b, err := os.ReadFile(giPath); err == nil {
		existing = strings.ReplaceAll(string(b), "\r\n", "\n")
	} else if !os.IsNotExist(err) {
		return err
	}

	cleanedLines := stripManagedBlock(existing)

	// Normalize & deduplicate managed relative paths
	seen := make(map[string]bool)
	var normalized []string
	for _, p := range managedRelPaths {
		slash := strings.TrimSpace(filepath.ToSlash(p))
		slash = strings.TrimPrefix(slash, "./")
		if slash == "" {
			continue
		}
		if !strings.HasSuffix(slash, "/") {
			slash += "/"
		}
		if !seen[slash] {
			seen[slash] = true
			normalized = append(normalized, slash)
		}
	}
	sort.Strings(normalized)

	var outLines []string
	outLines = append(outLines, cleanedLines...)

	if len(normalized) > 0 {
		if len(outLines) > 0 && strings.TrimSpace(outLines[len(outLines)-1]) != "" {
			outLines = append(outLines, "")
		}
		outLines = append(outLines, gitignoreStartMarker)
		outLines = append(outLines, normalized...)
		outLines = append(outLines, gitignoreEndMarker)
	}

	content := strings.Join(outLines, "\n")
	if content != "" && !strings.HasSuffix(content, "\n") {
		content += "\n"
	}

	if content == "" {
		// Do not leave an empty new .gitignore if none existed
		if _, err := os.Stat(giPath); os.IsNotExist(err) {
			return nil
		}
	}

	tmpPath := giPath + ".skillsman.tmp"
	if err := os.WriteFile(tmpPath, []byte(content), 0644); err != nil {
		return err
	}
	return os.Rename(tmpPath, giPath)
}

func stripManagedBlock(content string) []string {
	if content == "" {
		return nil
	}
	lines := strings.Split(content, "\n")
	var out []string
	inBlock := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == gitignoreStartMarker {
			inBlock = true
			continue
		}
		if trimmed == gitignoreEndMarker {
			inBlock = false
			continue
		}
		if !inBlock {
			out = append(out, line)
		}
	}
	// Trim trailing blank lines
	for len(out) > 0 && strings.TrimSpace(out[len(out)-1]) == "" {
		out = out[:len(out)-1]
	}
	return out
}
