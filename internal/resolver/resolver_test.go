package resolver

import (
	"testing"

	"skillsman/internal/model"
)

func TestResolvePrecedenceAndOverrides(t *testing.T) {
	state := model.AppState{
		Skills: []model.Skill{
			{ID: "s1", Slug: "global-skill", Name: "Global Skill", StorePath: `C:\store\global-skill`},
			{ID: "s2", Slug: "wf-skill", Name: "Workflow Skill", StorePath: `C:\store\wf-skill`},
			{ID: "s3", Slug: "user-skill", Name: "User Skill", StorePath: `C:\store\user-skill`},
			{ID: "s4", Slug: "proj-extra", Name: "Project Extra", StorePath: `C:\store\proj-extra`},
		},
		Workflows: []model.Workflow{
			{
				ID:   "wf1",
				Name: "DevFlow",
				Slug: "devflow",
				Stages: []model.WorkflowStage{
					{ID: "st1", Name: "Dev", Order: 1, SkillIDs: []string{"s2"}},
				},
			},
		},
		Global: model.GlobalAssignment{
			SkillIDs:    []string{"s1"},
			WorkflowIDs: []string{"wf1"},
		},
		Agents: []model.AgentProfile{
			{
				ID:                  "claude",
				Name:                "Claude Code",
				Enabled:             true,
				UserSkillsDir:       `C:\users\demo\.claude\skills`,
				ProjectSkillsRelDir: ".claude/skills",
				DefaultDeployMode:   model.DeployJunction,
				GlobalMutedSkillIDs: []string{"s1"},
				UserSkillIDs:        []string{"s3"},
			},
			{
				ID:                  "codex",
				Name:                "Codex",
				Enabled:             true,
				UserSkillsDir:       `C:\users\demo\.codex\skills`,
				ProjectSkillsRelDir: ".codex/skills",
				DefaultDeployMode:   model.DeployCopy,
			},
		},
		Projects: []model.Project{
			{
				ID:              "p1",
				Name:            "DemoApp",
				Path:            `C:\work\demoapp`,
				EnabledAgentIDs: []string{"claude", "codex"},
				WorkflowIDs:     []string{"wf1"},
				DirectSkillIDs:  []string{"s1"},
				ExcludedSkillIDs: []string{"s1"},
				AgentOverrides: map[string]model.ProjectAgentOverride{
					"claude": {
						DeployMode:    "copy",
						ExtraSkillIDs: []string{"s4", "s1"}, // explicitly overrides project exclusion for claude
					},
				},
			},
		},
	}

	// Claude user level: s1 is muted, s2 active via workflow, s3 active via direct
	claudeUser := ResolveForUserAgent(state, "claude")
	byID := map[string]model.EffectiveSkillEntry{}
	for _, e := range claudeUser {
		byID[e.SkillID] = e
	}
	if byID["s1"].Active || !byID["s1"].Muted {
		t.Fatalf("expected s1 muted for claude user, got %+v", byID["s1"])
	}
	if !byID["s2"].Active || len(byID["s2"].Sources) == 0 || byID["s2"].Sources[0] != "workflow:DevFlow" {
		t.Fatalf("expected s2 active via workflow:DevFlow, got %+v", byID["s2"])
	}
	if !byID["s3"].Active || byID["s3"].DeployMode != model.DeployJunction {
		t.Fatalf("expected s3 active via junction, got %+v", byID["s3"])
	}

	// Project level for claude: override copy mode, s1 restored by agent extra, s4 active, s2 active via wf1
	claudeProj := ResolveForProjectAgent(state, "p1", "claude")
	pByID := map[string]model.EffectiveSkillEntry{}
	for _, e := range claudeProj {
		pByID[e.SkillID] = e
	}
	if !pByID["s1"].Active || pByID["s1"].DeployMode != model.DeployCopy {
		t.Fatalf("expected s1 overridden active+copy for claude project, got %+v", pByID["s1"])
	}
	if !pByID["s4"].Active {
		t.Fatalf("expected s4 active for claude project")
	}

	// Project level for codex: s1 excluded project-wide, s2 active
	codexProj := ResolveForProjectAgent(state, "p1", "codex")
	cByID := map[string]model.EffectiveSkillEntry{}
	for _, e := range codexProj {
		cByID[e.SkillID] = e
	}
	if cByID["s1"].Active || !cByID["s1"].Muted {
		t.Fatalf("expected s1 excluded for codex project, got %+v", cByID["s1"])
	}
	if !cByID["s2"].Active {
		t.Fatalf("expected s2 active for codex project")
	}

	matrix := BuildMatrix(state, model.ScopeUser, "")
	if len(matrix.Agents) != 2 || len(matrix.Rows) != 5 {
		t.Fatalf("unexpected matrix dimensions: agents=%d rows=%d", len(matrix.Agents), len(matrix.Rows))
	}
}
