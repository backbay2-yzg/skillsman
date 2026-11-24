//go:build windows

package winutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestJunctionLifecycleAndSafety(t *testing.T) {
	tmp := t.TempDir()
	targetDir := filepath.Join(tmp, "store", "my skill")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		t.Fatal(err)
	}
	targetFile := filepath.Join(targetDir, "SKILL.md")
	if err := os.WriteFile(targetFile, []byte("# Hello\n"), 0644); err != nil {
		t.Fatal(err)
	}

	linkDir := filepath.Join(tmp, "agent skills", "my skill")
	if err := CreateJunction(linkDir, targetDir); err != nil {
		t.Fatalf("CreateJunction failed: %v", err)
	}

	isJ, err := IsJunction(linkDir)
	if err != nil {
		t.Fatalf("IsJunction failed: %v", err)
	}
	if !isJ {
		t.Fatalf("expected %s to be recognized as a junction", linkDir)
	}

	gotTarget, err := ReadJunctionTarget(linkDir)
	if err != nil {
		t.Fatalf("ReadJunctionTarget failed: %v", err)
	}
	if !PathsEqualFold(gotTarget, targetDir) {
		t.Fatalf("expected junction target %q, got %q", targetDir, gotTarget)
	}

	// Verify junction actually resolves file content
	data, err := os.ReadFile(filepath.Join(linkDir, "SKILL.md"))
	if err != nil || string(data) != "# Hello\n" {
		t.Fatalf("reading through junction failed: %v %q", err, string(data))
	}

	// Verify RemoveJunction refuses regular directories
	if err := RemoveJunction(targetDir); err == nil {
		t.Fatalf("expected RemoveJunction to refuse regular directory %s", targetDir)
	}

	// Remove junction and verify original target files stay intact
	if err := RemoveJunction(linkDir); err != nil {
		t.Fatalf("RemoveJunction failed: %v", err)
	}
	if _, err := os.Lstat(linkDir); !os.IsNotExist(err) {
		t.Fatalf("expected junction %s to be gone", linkDir)
	}
	if _, err := os.Stat(targetFile); err != nil {
		t.Fatalf("expected target file %s to remain intact, got err: %v", targetFile, err)
	}
}

func TestGetSystemTheme(t *testing.T) {
	theme := GetSystemTheme()
	if len(theme.AccentColor) != 7 || theme.AccentColor[0] != '#' {
		t.Fatalf("unexpected accent color format: %q", theme.AccentColor)
	}
}
