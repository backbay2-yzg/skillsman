package service

import (
	"bytes"
	"strings"
	"testing"

	"skillsman/docs"
)

func TestEmbeddedDocsHTMLPresentAndHasPlaceholder(t *testing.T) {
	if len(docs.IndexHTML) < 10000 {
		t.Fatalf("expected substantial embedded docs HTML, got %d bytes", len(docs.IndexHTML))
	}
	if !bytes.Contains(docs.IndexHTML, []byte(docsLaunchPlaceholder)) {
		t.Fatalf("embedded docs HTML missing launch placeholder %q", docsLaunchPlaceholder)
	}
}

func TestBuildLaunchDocsHTMLWhitelistAndInjectionSafety(t *testing.T) {
	out := BuildLaunchDocsHTML(docs.IndexHTML, "features", "en-US", "dark", 123456789)
	if bytes.Contains(out, []byte(docsLaunchPlaceholder)) {
		t.Fatalf("expected launch placeholder to be replaced")
	}
	want := `{"tab":"features","lang":"en-US","theme":"dark","ts":123456789}`
	if !bytes.Contains(out, []byte(want)) {
		t.Fatalf("expected injected pref %s not found", want)
	}

	// Malicious or invalid values must be sanitized to safe defaults via whitelist
	sanitized := BuildLaunchDocsHTML(docs.IndexHTML, "<script>alert(1)</script>", "fr-FR", "evil", 99)
	wantSafe := `{"tab":"guide","lang":"zh-CN","theme":"system","ts":99}`
	if !bytes.Contains(sanitized, []byte(wantSafe)) {
		t.Fatalf("expected whitelisted defaults %s, got mismatch", wantSafe)
	}
	if strings.Contains(string(sanitized), "<script>alert(1)</script>") {
		t.Fatalf("unsafe script payload leaked into HTML")
	}
}
