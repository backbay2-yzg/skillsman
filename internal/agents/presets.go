package agents

import (
	"os"
	"path/filepath"
	"strings"

	"skillsman/internal/model"
)

// ExpandPath resolves leading ~ and common Windows environment variables.
func ExpandPath(p string) string {
	p = strings.TrimSpace(p)
	if p == "" {
		return ""
	}
	home, _ := os.UserHomeDir()
	if p == "~" {
		return home
	}
	if strings.HasPrefix(p, "~/") || strings.HasPrefix(p, `~\`) {
		p = filepath.Join(home, p[2:])
	}
	for _, envName := range []string{"USERPROFILE", "APPDATA", "LOCALAPPDATA"} {
		token := "%" + envName + "%"
		if strings.Contains(strings.ToUpper(p), token) {
			if val := os.Getenv(envName); val != "" {
				p = replaceInsensitive(p, token, val)
			}
		}
	}
	return filepath.Clean(p)
}

func replaceInsensitive(s, old, replacement string) string {
	lowerS := strings.ToLower(s)
	lowerOld := strings.ToLower(old)
	idx := strings.Index(lowerS, lowerOld)
	if idx < 0 {
		return s
	}
	return s[:idx] + replacement + s[idx+len(old):]
}

// BuiltinPresets returns the built-in supported AI agent presets.
func BuiltinPresets() []model.AgentProfile {
	home, _ := os.UserHomeDir()
	traeUserDir := filepath.Join(home, ".trae", "skills")
	if _, err := os.Stat(filepath.Join(home, ".trae-cn")); err == nil {
		traeUserDir = filepath.Join(home, ".trae-cn", "skills")
	}

	return []model.AgentProfile{
		{
			ID:                  "agents-universal",
			Name:                "Universal (.agents)",
			Icon:                "Layers",
			Builtin:             true,
			UserSkillsDir:       "~/.agents/skills",
			ProjectSkillsRelDir: ".agents/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "claude",
			Name:                "Claude Code",
			Icon:                "Sparkles",
			Builtin:             true,
			UserSkillsDir:       "~/.claude/skills",
			ProjectSkillsRelDir: ".claude/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "codex",
			Name:                "OpenAI Codex",
			Icon:                "Terminal",
			Builtin:             true,
			UserSkillsDir:       "~/.codex/skills",
			ProjectSkillsRelDir: ".codex/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "antigravity",
			Name:                "Antigravity / Gemini",
			Icon:                "Orbit",
			Builtin:             true,
			UserSkillsDir:       "~/.gemini/antigravity/skills",
			ProjectSkillsRelDir: ".agent/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "cursor",
			Name:                "Cursor",
			Icon:                "MousePointer",
			Builtin:             true,
			UserSkillsDir:       "~/.cursor/skills",
			ProjectSkillsRelDir: ".cursor/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "windsurf",
			Name:                "Windsurf",
			Icon:                "Wind",
			Builtin:             true,
			UserSkillsDir:       "~/.codeium/windsurf/skills",
			ProjectSkillsRelDir: ".windsurf/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "copilot",
			Name:                "VS Code Copilot",
			Icon:                "Code2",
			Builtin:             true,
			UserSkillsDir:       "~/.copilot/skills",
			ProjectSkillsRelDir: ".github/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "opencode",
			Name:                "OpenCode",
			Icon:                "Braces",
			Builtin:             true,
			UserSkillsDir:       "~/.config/opencode/skills",
			ProjectSkillsRelDir: ".opencode/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "trae",
			Name:                "Trae",
			Icon:                "Cpu",
			Builtin:             true,
			UserSkillsDir:       replaceHomePrefix(traeUserDir, home),
			ProjectSkillsRelDir: ".trae/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "qoder",
			Name:                "Qoder",
			Icon:                "Boxes",
			Builtin:             true,
			UserSkillsDir:       "~/.qoder/skills",
			ProjectSkillsRelDir: ".qoder/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
		{
			ID:                  "codebuddy",
			Name:                "CodeBuddy",
			Icon:                "Bot",
			Builtin:             true,
			UserSkillsDir:       "~/.codebuddy/skills",
			ProjectSkillsRelDir: ".codebuddy/skills",
			DefaultDeployMode:    model.DeployJunction,
			WorkflowGuideEnabled: true,
		},
	}
}

func replaceHomePrefix(p, home string) string {
	if home == "" {
		return p
	}
	if strings.HasPrefix(strings.ToLower(p), strings.ToLower(home)) {
		rest := p[len(home):]
		return "~" + filepath.ToSlash(rest)
	}
	return p
}

// DetectInstalledAgents checks whether each agent's parent config directory exists on disk.
// When enableNewlyDetected is true, any detected agent becomes enabled.
func DetectInstalledAgents(profiles []model.AgentProfile, enableNewlyDetected bool) []model.AgentProfile {
	home, _ := os.UserHomeDir()
	appData := os.Getenv("APPDATA")

	extraMarkers := map[string][]string{
		"agents-universal": {filepath.Join(home, ".agents")},
		"claude":           {filepath.Join(home, ".claude")},
		"codex":            {filepath.Join(home, ".codex")},
		"antigravity":      {filepath.Join(home, ".gemini", "antigravity"), filepath.Join(appData, "Antigravity")},
		"cursor":           {filepath.Join(home, ".cursor"), filepath.Join(appData, "Cursor")},
		"windsurf":         {filepath.Join(home, ".codeium", "windsurf"), filepath.Join(appData, "Windsurf")},
		"copilot":          {filepath.Join(home, ".copilot"), filepath.Join(appData, "Code", "User", "globalStorage", "github.copilot-chat")},
		"opencode":         {filepath.Join(home, ".config", "opencode")},
		"trae":             {filepath.Join(home, ".trae-cn"), filepath.Join(home, ".trae"), filepath.Join(appData, "Trae CN"), filepath.Join(appData, "Trae")},
		"qoder":            {filepath.Join(home, ".qoder"), filepath.Join(appData, "Qoder")},
		"codebuddy":        {filepath.Join(home, ".codebuddy"), filepath.Join(home, ".codebuddycn"), filepath.Join(appData, "CodeBuddy CN")},
	}

	out := make([]model.AgentProfile, len(profiles))
	for i, a := range profiles {
		detected := false
		if expanded := ExpandPath(a.UserSkillsDir); expanded != "" {
			if dirExists(expanded) || dirExists(filepath.Dir(expanded)) {
				detected = true
			}
		}
		if !detected {
			for _, m := range extraMarkers[a.ID] {
				if dirExists(m) {
					detected = true
					break
				}
			}
		}
		a.Detected = detected
		if enableNewlyDetected && detected {
			a.Enabled = true
		}
		if a.DefaultDeployMode == "" {
			a.DefaultDeployMode = model.DeployJunction
		}
		out[i] = a
	}
	return out
}

func dirExists(p string) bool {
	if p == "" {
		return false
	}
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}
