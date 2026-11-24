package repo

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRepoURLRewriteAndMonorepoDiscovery(t *testing.T) {
	if got := NormalizeRepoURL("anthropics/skills"); got != "https://github.com/anthropics/skills.git" {
		t.Fatalf("unexpected normalized URL: %s", got)
	}
	if got := RewriteGitURL("anthropics/skills", "https://gh-proxy.com"); got != "https://gh-proxy.com/https://github.com/anthropics/skills.git" {
		t.Fatalf("unexpected mirrored URL: %s", got)
	}

	tmp := t.TempDir()
	// Create monorepo with nested skills and ignored .git / node_modules
	s1 := filepath.Join(tmp, "skills", "alpha")
	s2 := filepath.Join(tmp, "skills", "beta")
	ignored := filepath.Join(tmp, "node_modules", "fake")
	for _, d := range []string{s1, s2, ignored} {
		if err := os.MkdirAll(d, 0755); err != nil {
			t.Fatal(err)
		}
	}
	_ = os.WriteFile(filepath.Join(s1, "SKILL.md"), []byte("---\nname: Alpha\ndescription: First\n---\n"), 0644)
	_ = os.WriteFile(filepath.Join(s2, "SKILL.md"), []byte("---\nname: Beta\ndescription: Second\n---\n"), 0644)
	_ = os.WriteFile(filepath.Join(ignored, "SKILL.md"), []byte("---\nname: Ignored\n---\n"), 0644)

	discovered, err := DiscoverSkillsInDir(tmp)
	if err != nil {
		t.Fatal(err)
	}
	if len(discovered) != 2 {
		t.Fatalf("expected 2 discovered skills, got %d: %+v", len(discovered), discovered)
	}
	if discovered[0].Subpath != "skills/alpha" || discovered[1].Subpath != "skills/beta" {
		t.Fatalf("unexpected subpaths: %+v", discovered)
	}
}

func TestParseRegistryJSON(t *testing.T) {
	payload := `{
		"skills": [
			{
				"id": "vercel-labs/agent-skills/react-best-practices",
				"name": "React Best Practices",
				"description": "Official React guide",
				"source": "vercel-labs/agent-skills",
				"subpath": "skills/react-best-practices",
				"installs": 1240,
				"tags": ["react", "frontend"]
			}
		]
	}`
	items, err := ParseRegistryJSON([]byte(payload), "reg-skills-sh")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 registry item, got %d", len(items))
	}
	it := items[0]
	if it.RepoURL != "https://github.com/vercel-labs/agent-skills.git" || it.Subpath != "skills/react-best-practices" || it.Installs != 1240 {
		t.Fatalf("unexpected parsed item: %+v", it)
	}
}
