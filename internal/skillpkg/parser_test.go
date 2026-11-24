package skillpkg

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

func TestFrontmatterRoundtripAndHash(t *testing.T) {
	md := SerializeSkillMD(
		"Go Reviewer: Clean",
		"Reviews Go code for clarity & safety.",
		"Alice",
		"1.2.0",
		[]string{"go", "review", "go"},
		"## Rules\n\nKeep functions concise.\n",
	)
	meta, body := ParseSkillMD(md, "fallback")
	if meta.Name != "Go Reviewer: Clean" {
		t.Fatalf("unexpected name: %q", meta.Name)
	}
	if meta.Description != "Reviews Go code for clarity & safety." {
		t.Fatalf("unexpected desc: %q", meta.Description)
	}
	if meta.Author != "Alice" || meta.Version != "1.2.0" {
		t.Fatalf("unexpected author/version: %+v", meta)
	}
	if len(meta.Tags) != 2 || meta.Tags[0] != "go" || meta.Tags[1] != "review" {
		t.Fatalf("unexpected tags: %+v", meta.Tags)
	}
	if body != "## Rules\n\nKeep functions concise.\n" {
		t.Fatalf("unexpected body: %q", body)
	}

	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(md), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, ".git"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ".git", "HEAD"), []byte("ref: refs/heads/main"), 0644); err != nil {
		t.Fatal(err)
	}
	h1, err := HashDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	// Mutating .git should not alter skill content hash
	if err := os.WriteFile(filepath.Join(dir, ".git", "HEAD"), []byte("ref: refs/heads/dev"), 0644); err != nil {
		t.Fatal(err)
	}
	h2, err := HashDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if h1 == "" || h1 != h2 {
		t.Fatalf("hash mismatch across .git change: %s vs %s", h1, h2)
	}
}

func TestExtractZipSkillAndZipSlipRejection(t *testing.T) {
	tmp := t.TempDir()

	// 1. Valid nested skill zip
	goodZip := filepath.Join(tmp, "good.zip")
	f, err := os.Create(goodZip)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(f)
	w1, _ := zw.Create("my-skill/SKILL.md")
	_, _ = w1.Write([]byte("---\nname: Nested Skill\n---\nBody\n"))
	w2, _ := zw.Create("my-skill/notes.txt")
	_, _ = w2.Write([]byte("hello"))
	_ = zw.Close()
	_ = f.Close()

	extractOut := filepath.Join(tmp, "out")
	skillDir, err := ExtractZipSkill(goodZip, extractOut)
	if err != nil {
		t.Fatalf("ExtractZipSkill valid zip failed: %v", err)
	}
	if filepath.Base(skillDir) != "my-skill" {
		t.Fatalf("expected my-skill folder, got %s", skillDir)
	}

	// 2. Malicious zip-slip archive
	badZip := filepath.Join(tmp, "evil.zip")
	bf, _ := os.Create(badZip)
	bzw := zip.NewWriter(bf)
	bw, _ := bzw.Create("../../escaped.txt")
	_, _ = bw.Write([]byte("pwn"))
	_ = bzw.Close()
	_ = bf.Close()

	if _, err := ExtractZipSkill(badZip, filepath.Join(tmp, "badout")); err == nil {
		t.Fatalf("expected zip-slip error, got nil")
	}
}
