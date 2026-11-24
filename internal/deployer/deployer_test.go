//go:build windows

package deployer

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"skillsman/internal/model"
	"skillsman/internal/skillpkg"
	"skillsman/internal/winutil"
)

func makeTestSkill(t *testing.T, storeRoot, id, slug, body string) model.Skill {
	t.Helper()
	dir := filepath.Join(storeRoot, slug)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	md := skillpkg.SerializeSkillMD(slug, "desc "+slug, "tester", "1.0", []string{"test"}, body)
	if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(md), 0644); err != nil {
		t.Fatal(err)
	}
	hash, err := skillpkg.HashDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	return model.Skill{
		ID:          id,
		Slug:        slug,
		Name:        slug,
		StorePath:   dir,
		ContentHash: hash,
	}
}

func TestDeployJunctionCopyDotProtectionConflictsAndGitignore(t *testing.T) {
	tmp := t.TempDir()
	storeRoot := filepath.Join(tmp, "store")
	guidesRoot := filepath.Join(tmp, "guides")
	backupsRoot := filepath.Join(tmp, "backups")
	codexUserDir := filepath.Join(tmp, "codex-user")
	projDir := filepath.Join(tmp, "my-project")

	// Pre-populate protected .system folder and unmanaged existing skill conflict
	sysFile := filepath.Join(codexUserDir, ".system", "built-in.txt")
	if err := os.MkdirAll(filepath.Dir(sysFile), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(sysFile, []byte("keep-me"), 0644); err != nil {
		t.Fatal(err)
	}
	conflictDir := filepath.Join(codexUserDir, "alpha-skill")
	if err := os.MkdirAll(conflictDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(conflictDir, "SKILL.md"), []byte("# Unmanaged custom version\n"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projDir, ".gitignore"), []byte("node_modules/\n"), 0644); err != nil {
		t.Fatal(err)
	}

	skAlpha := makeTestSkill(t, storeRoot, "sk1", "alpha-skill", "Alpha canonical body")
	skBeta := makeTestSkill(t, storeRoot, "sk2", "beta-skill", "Beta canonical body")

	state := model.AppState{
		Skills: []model.Skill{skAlpha, skBeta},
		Workflows: []model.Workflow{
			{
				ID:            "wf1",
				Name:          "TestFlow",
				Slug:          "testflow",
				GenerateGuide: true,
				Stages: []model.WorkflowStage{
					{ID: "stg1", Name: "Plan", Order: 1, SkillIDs: []string{"sk2"}},
				},
			},
		},
		Agents: []model.AgentProfile{
			{
				ID:                   "codex",
				Name:                 "Codex",
				Enabled:              true,
				UserSkillsDir:        codexUserDir,
				ProjectSkillsRelDir:  ".codex/skills",
				DefaultDeployMode:    model.DeployJunction,
				UserSkillIDs:         []string{"sk1", "sk2"},
				WorkflowGuideEnabled: true,
			},
		},
		Projects: []model.Project{
			{
				ID:                   "p1",
				Name:                 "MyProject",
				Path:                 projDir,
				EnabledAgentIDs:      []string{"codex"},
				WorkflowIDs:          []string{"wf1"},
				DeployModeOverride:   "copy",
				ManageGitignore:      true,
				WorkflowGuideEnabled: true,
			},
		},
		Deployments: map[string]model.DeploymentRecord{},
	}

	summary := SyncAll(&state, guidesRoot)
	if len(summary.Errors) > 0 {
		t.Fatalf("unexpected sync errors: %v", summary.Errors)
	}
	// alpha-skill at codexUserDir must trigger conflict without overwriting unmanaged file
	if len(state.Conflicts) != 1 || !winutil.PathsEqualFold(state.Conflicts[0].TargetPath, conflictDir) {
		t.Fatalf("expected 1 conflict at %s, got %+v", conflictDir, state.Conflicts)
	}
	unmanagedBytes, err := os.ReadFile(filepath.Join(conflictDir, "SKILL.md"))
	if err != nil || !strings.Contains(string(unmanagedBytes), "Unmanaged custom version") {
		t.Fatalf("unmanaged skill directory was overwritten!")
	}
	// .system must remain untouched
	if b, err := os.ReadFile(sysFile); err != nil || string(b) != "keep-me" {
		t.Fatalf("protected .system file was altered!")
	}

	// beta-skill at codexUserDir must be a live Junction
	betaLink := filepath.Join(codexUserDir, "beta-skill")
	if isJ, _ := winutil.IsJunction(betaLink); !isJ {
		t.Fatalf("expected %s to be a junction", betaLink)
	}

	// Project beta-skill & workflow-testflow guide must be real Copy dirs and in .gitignore
	projBeta := filepath.Join(projDir, ".codex", "skills", "beta-skill")
	if isJ, _ := winutil.IsJunction(projBeta); isJ {
		t.Fatalf("expected project copy mode not to be a junction")
	}
	if _, err := os.Stat(filepath.Join(projDir, ".codex", "skills", "workflow-testflow", "SKILL.md")); err != nil {
		t.Fatalf("expected generated workflow guide in project: %v", err)
	}
	giBytes, err := os.ReadFile(filepath.Join(projDir, ".gitignore"))
	if err != nil || !strings.Contains(string(giBytes), "node_modules/") || !strings.Contains(string(giBytes), ".codex/skills/beta-skill/") {
		t.Fatalf("unexpected .gitignore content:\n%s", string(giBytes))
	}

	// Simulate local drift in Copy deployment and verify CheckHealth detects it
	if err := os.WriteFile(filepath.Join(projBeta, "SKILL.md"), []byte("drifted"), 0644); err != nil {
		t.Fatal(err)
	}
	issues := CheckHealth(state)
	hasDrift := false
	for _, iss := range issues {
		if iss.Kind == "drift" && winutil.PathsEqualFold(iss.TargetPath, projBeta) {
			hasDrift = true
		}
	}
	if !hasDrift {
		t.Fatalf("expected drift issue for %s, got %+v", projBeta, issues)
	}

	// Resolve conflict via BackupOverwrite
	if _, err := ResolveConflictBackupOverwrite(&state, conflictDir, backupsRoot, guidesRoot); err != nil {
		t.Fatalf("ResolveConflictBackupOverwrite failed: %v", err)
	}
	for _, c := range state.Conflicts {
		if winutil.PathsEqualFold(c.TargetPath, conflictDir) {
			t.Fatalf("expected %s conflict cleared, still present: %+v", conflictDir, c)
		}
	}
	if isJ, _ := winutil.IsJunction(conflictDir); !isJ {
		t.Fatalf("expected %s to now be a managed junction", conflictDir)
	}
	backupEntries, _ := os.ReadDir(backupsRoot)
	if len(backupEntries) == 0 {
		t.Fatalf("expected backup copy created in %s", backupsRoot)
	}

	// ForceSyncDrift restores canonical copy and clears remaining drift conflict
	if _, err := ForceSyncDrift(&state, projBeta, guidesRoot); err != nil {
		t.Fatalf("ForceSyncDrift failed: %v", err)
	}
	if len(state.Conflicts) != 0 {
		t.Fatalf("expected all conflicts cleared after ForceSyncDrift, got %+v", state.Conflicts)
	}
	restored, _ := os.ReadFile(filepath.Join(projBeta, "SKILL.md"))
	if !strings.Contains(string(restored), "Beta canonical body") {
		t.Fatalf("expected canonical body restored after ForceSyncDrift, got %q", string(restored))
	}

	// Unassign beta-skill from codex user & sync: junction must be removed while store stays intact
	state.Agents[0].UserSkillIDs = []string{"sk1"}
	SyncAll(&state, guidesRoot)
	if _, err := os.Lstat(betaLink); !os.IsNotExist(err) {
		t.Fatalf("expected unassigned junction %s removed", betaLink)
	}
	if _, err := os.Stat(filepath.Join(skBeta.StorePath, "SKILL.md")); err != nil {
		t.Fatalf("expected central store skill untouched after junction removal: %v", err)
	}
}
