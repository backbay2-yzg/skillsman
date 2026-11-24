package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

type bootstrapConfig struct {
	CustomStoreRoot string `json:"customStoreRoot"`
}

// Paths holds resolved filesystem directories for SkillsMan's data root.
type Paths struct {
	Root     string
	Store    string
	Repos    string
	Backups  string
	Guides   string
	State    string
	Portable bool
}

// ExeDir returns the directory containing the running executable.
func ExeDir() string {
	exe, err := os.Executable()
	if err != nil {
		wd, _ := os.Getwd()
		return wd
	}
	resolved, err := filepath.EvalSymlinks(exe)
	if err == nil {
		exe = resolved
	}
	return filepath.Dir(exe)
}

func bootstrapFilePath() string {
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" {
		home, _ := os.UserHomeDir()
		localAppData = filepath.Join(home, "AppData", "Local")
	}
	return filepath.Join(localAppData, "SkillsMan", "bootstrap.json")
}

// LoadBootstrapCustomRoot reads any persisted custom store root (ignored in portable mode).
func LoadBootstrapCustomRoot() string {
	b, err := os.ReadFile(bootstrapFilePath())
	if err != nil {
		return ""
	}
	var cfg bootstrapConfig
	if err := json.Unmarshal(b, &cfg); err != nil {
		return ""
	}
	return strings.TrimSpace(cfg.CustomStoreRoot)
}

// SaveBootstrapCustomRoot persists the custom store root pointer so restarts find the moved store.
func SaveBootstrapCustomRoot(customRoot string) error {
	p := bootstrapFilePath()
	customRoot = strings.TrimSpace(customRoot)
	if customRoot == "" {
		err := os.Remove(p)
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(bootstrapConfig{CustomStoreRoot: customRoot}, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0644)
}

// ResolveRoot determines the active data root using portable markers, custom root, or ~/.skillsman.
func ResolveRoot(customRoot string) (string, bool) {
	exeDir := ExeDir()
	portableMarker := filepath.Join(exeDir, "portable")
	portableData := filepath.Join(exeDir, "data")
	if _, err := os.Stat(portableMarker); err == nil {
		return portableData, true
	}
	if st, err := os.Stat(portableData); err == nil && st.IsDir() {
		return portableData, true
	}

	if strings.TrimSpace(customRoot) != "" {
		return filepath.Clean(customRoot), false
	}
	if boot := LoadBootstrapCustomRoot(); boot != "" {
		return filepath.Clean(boot), false
	}

	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".skillsman"), false
}

// BuildPaths computes and ensures all standard subdirectories under root.
func BuildPaths(root string, portable bool) (Paths, error) {
	p := Paths{
		Root:     filepath.Clean(root),
		Store:    filepath.Join(root, "store"),
		Repos:    filepath.Join(root, "repos"),
		Backups:  filepath.Join(root, "backups"),
		Guides:   filepath.Join(root, "guides"),
		State:    filepath.Join(root, "state.json"),
		Portable: portable,
	}
	for _, dir := range []string{p.Root, p.Store, p.Repos, p.Backups, p.Guides} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return Paths{}, err
		}
	}
	return p, nil
}
