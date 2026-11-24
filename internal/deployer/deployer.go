package deployer

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"skillsman/internal/agents"
	"skillsman/internal/model"
	"skillsman/internal/resolver"
	"skillsman/internal/skillpkg"
	"skillsman/internal/winutil"
)

type desiredTarget struct {
	Key             string
	TargetPath      string
	SkillID         string
	SkillSlug       string
	AgentID         string
	Scope           model.ScopeKind
	ProjectID       string
	Mode            model.DeployMode
	SourceStorePath string
	SourceHash      string
	IsWorkflowGuide bool
	WorkflowID      string
}

func isProtectedName(name string) bool {
	return name == "" || strings.HasPrefix(name, ".")
}

func findAgent(state model.AppState, id string) (model.AgentProfile, bool) {
	for _, a := range state.Agents {
		if a.ID == id {
			return a, true
		}
	}
	return model.AgentProfile{}, false
}

func findSkill(state model.AppState, id string) (model.Skill, bool) {
	for _, s := range state.Skills {
		if s.ID == id {
			return s, true
		}
	}
	return model.Skill{}, false
}

func buildWorkflowGuideDir(guidesRoot string, state model.AppState, wf model.Workflow) (string, string, error) {
	skillsByID := make(map[string]model.Skill, len(state.Skills))
	for _, s := range state.Skills {
		skillsByID[s.ID] = s
	}

	stages := make([]model.WorkflowStage, len(wf.Stages))
	copy(stages, wf.Stages)
	sort.Slice(stages, func(i, j int) bool {
		return stages[i].Order < stages[j].Order
	})

	var body strings.Builder
	body.WriteString("# 工作流编排指引: " + wf.Name + "\n\n")
	if strings.TrimSpace(wf.Description) != "" {
		body.WriteString(wf.Description + "\n\n")
	}
	body.WriteString("## 执行阶段与技能顺序\n\n")
	for idx, stg := range stages {
		body.WriteString(fmt.Sprintf("### %d. %s\n", idx+1, stg.Name))
		if strings.TrimSpace(stg.Description) != "" {
			body.WriteString(stg.Description + "\n")
		}
		if len(stg.SkillIDs) == 0 {
			body.WriteString("- （暂无分配技能）\n\n")
			continue
		}
		for _, sid := range stg.SkillIDs {
			if sk, ok := skillsByID[sid]; ok {
				if sk.Description != "" {
					body.WriteString(fmt.Sprintf("- **%s** (`%s`): %s\n", sk.Name, sk.Slug, sk.Description))
				} else {
					body.WriteString(fmt.Sprintf("- **%s** (`%s`)\n", sk.Name, sk.Slug))
				}
			}
		}
		body.WriteString("\n")
	}

	slug := "workflow-" + skillpkg.SanitizeSlug(wf.Slug)
	if slug == "workflow-" || slug == "workflow-skill" {
		slug = "workflow-" + skillpkg.SanitizeSlug(wf.Name)
	}
	guideDir := filepath.Join(guidesRoot, slug)
	if err := os.MkdirAll(guideDir, 0755); err != nil {
		return "", "", err
	}
	md := skillpkg.SerializeSkillMD(
		"Workflow: "+wf.Name,
		"SkillsMan generated workflow orchestration guide for "+wf.Name,
		"SkillsMan",
		"1.0",
		[]string{"workflow", wf.Slug},
		body.String(),
	)
	if err := os.WriteFile(filepath.Join(guideDir, "SKILL.md"), []byte(md), 0644); err != nil {
		return "", "", err
	}
	hash, err := skillpkg.HashDir(guideDir)
	return guideDir, hash, err
}

func collectDesiredForAgentUser(state *model.AppState, guidesRoot string, agent model.AgentProfile, desired map[string]desiredTarget) error {
	if !agent.Enabled {
		return nil
	}
	baseDir := agents.ExpandPath(agent.UserSkillsDir)
	if baseDir == "" {
		return nil
	}

	for _, entry := range resolver.ResolveForUserAgent(*state, agent.ID) {
		if !entry.Active {
			continue
		}
		sk, ok := findSkill(*state, entry.SkillID)
		if !ok || isProtectedName(sk.Slug) {
			continue
		}
		target := filepath.Join(baseDir, sk.Slug)
		key := resolver.NormalizePathKey(target)
		desired[key] = desiredTarget{
			Key:             key,
			TargetPath:      target,
			SkillID:         sk.ID,
			SkillSlug:       sk.Slug,
			AgentID:         agent.ID,
			Scope:           model.ScopeUser,
			Mode:            entry.DeployMode,
			SourceStorePath: sk.StorePath,
			SourceHash:      sk.ContentHash,
		}
	}

	if agent.WorkflowGuideEnabled {
		for _, wf := range resolver.ResolveUserActiveWorkflows(*state, agent) {
			if !wf.GenerateGuide {
				continue
			}
			guideDir, hash, err := buildWorkflowGuideDir(guidesRoot, *state, wf)
			if err != nil {
				return err
			}
			slug := filepath.Base(guideDir)
			target := filepath.Join(baseDir, slug)
			key := resolver.NormalizePathKey(target)
			desired[key] = desiredTarget{
				Key:             key,
				TargetPath:      target,
				SkillID:         "guide:" + wf.ID,
				SkillSlug:       slug,
				AgentID:         agent.ID,
				Scope:           model.ScopeUser,
				Mode:            agent.DefaultDeployMode,
				SourceStorePath: guideDir,
				SourceHash:      hash,
				IsWorkflowGuide: true,
				WorkflowID:      wf.ID,
			}
		}
	}
	return nil
}

func collectDesiredForProject(state *model.AppState, guidesRoot string, proj model.Project, desired map[string]desiredTarget) ([]string, error) {
	if proj.Path == "" {
		return nil, nil
	}
	if st, err := os.Stat(proj.Path); err != nil || !st.IsDir() {
		return nil, fmt.Errorf("project directory unavailable: %s", proj.Path)
	}

	var managedRelPaths []string
	for _, agentID := range proj.EnabledAgentIDs {
		agent, ok := findAgent(*state, agentID)
		if !ok || strings.TrimSpace(agent.ProjectSkillsRelDir) == "" {
			continue
		}
		relDir := filepath.FromSlash(agent.ProjectSkillsRelDir)

		for _, entry := range resolver.ResolveForProjectAgent(*state, proj.ID, agentID) {
			if !entry.Active {
				continue
			}
			sk, ok := findSkill(*state, entry.SkillID)
			if !ok || isProtectedName(sk.Slug) {
				continue
			}
			target := filepath.Join(proj.Path, relDir, sk.Slug)
			key := resolver.NormalizePathKey(target)
			desired[key] = desiredTarget{
				Key:             key,
				TargetPath:      target,
				SkillID:         sk.ID,
				SkillSlug:       sk.Slug,
				AgentID:         agent.ID,
				Scope:           model.ScopeProject,
				ProjectID:       proj.ID,
				Mode:            entry.DeployMode,
				SourceStorePath: sk.StorePath,
				SourceHash:      sk.ContentHash,
			}
			if rel, err := filepath.Rel(proj.Path, target); err == nil {
				managedRelPaths = append(managedRelPaths, rel)
			}
		}

		if proj.WorkflowGuideEnabled {
			for _, wf := range resolver.ResolveProjectActiveWorkflows(*state, proj, agentID) {
				if !wf.GenerateGuide {
					continue
				}
				guideDir, hash, err := buildWorkflowGuideDir(guidesRoot, *state, wf)
				if err != nil {
					return managedRelPaths, err
				}
				slug := filepath.Base(guideDir)
				target := filepath.Join(proj.Path, relDir, slug)
				key := resolver.NormalizePathKey(target)
				mode := agent.DefaultDeployMode
				if proj.DeployModeOverride != "" {
					mode = model.DeployMode(proj.DeployModeOverride)
				}
				if ov, ok := proj.AgentOverrides[agentID]; ok && ov.DeployMode != "" {
					mode = model.DeployMode(ov.DeployMode)
				}
				desired[key] = desiredTarget{
					Key:             key,
					TargetPath:      target,
					SkillID:         "guide:" + wf.ID,
					SkillSlug:       slug,
					AgentID:         agent.ID,
					Scope:           model.ScopeProject,
					ProjectID:       proj.ID,
					Mode:            mode,
					SourceStorePath: guideDir,
					SourceHash:      hash,
					IsWorkflowGuide: true,
					WorkflowID:      wf.ID,
				}
				if rel, err := filepath.Rel(proj.Path, target); err == nil {
					managedRelPaths = append(managedRelPaths, rel)
				}
			}
		}
	}
	return managedRelPaths, nil
}

// SyncAll reconciles every enabled agent's user directory and every project.
func SyncAll(state *model.AppState, guidesRoot string) model.SyncSummary {
	desired := make(map[string]desiredTarget)
	summary := model.SyncSummary{
		Conflicts: []model.ConflictItem{},
		Errors:    []string{},
		SyncedAt:  time.Now().Format(time.RFC3339),
	}

	for _, a := range state.Agents {
		if err := collectDesiredForAgentUser(state, guidesRoot, a, desired); err != nil {
			summary.Errors = append(summary.Errors, err.Error())
		}
	}

	for i := range state.Projects {
		relPaths, err := collectDesiredForProject(state, guidesRoot, state.Projects[i], desired)
		if err != nil {
			summary.Errors = append(summary.Errors, err.Error())
			continue
		}
		if state.Projects[i].ManageGitignore {
			if giErr := UpdateGitignore(state.Projects[i].Path, relPaths); giErr != nil {
				summary.Errors = append(summary.Errors, giErr.Error())
			}
		} else {
			_ = UpdateGitignore(state.Projects[i].Path, nil)
		}
		state.Projects[i].LastSyncedAt = summary.SyncedAt
	}

	reconcile(state, desired, func(_ model.DeploymentRecord) bool { return true }, func(_ model.ConflictItem) bool { return false }, false, &summary)
	return summary
}

// SyncProject reconciles deployments only for the specified project ID.
func SyncProject(state *model.AppState, guidesRoot string, projectID string) model.SyncSummary {
	desired := make(map[string]desiredTarget)
	summary := model.SyncSummary{
		Conflicts: []model.ConflictItem{},
		Errors:    []string{},
		SyncedAt:  time.Now().Format(time.RFC3339),
	}

	for i := range state.Projects {
		if state.Projects[i].ID == projectID {
			relPaths, err := collectDesiredForProject(state, guidesRoot, state.Projects[i], desired)
			if err != nil {
				summary.Errors = append(summary.Errors, err.Error())
				return summary
			}
			if state.Projects[i].ManageGitignore {
				if giErr := UpdateGitignore(state.Projects[i].Path, relPaths); giErr != nil {
					summary.Errors = append(summary.Errors, giErr.Error())
				}
			} else {
				_ = UpdateGitignore(state.Projects[i].Path, nil)
			}
			state.Projects[i].LastSyncedAt = summary.SyncedAt
			break
		}
	}

	reconcile(
		state,
		desired,
		func(rec model.DeploymentRecord) bool {
			return rec.Scope == model.ScopeProject && rec.ProjectID == projectID
		},
		func(c model.ConflictItem) bool {
			return c.Scope != model.ScopeProject || c.ProjectID != projectID
		},
		false,
		&summary,
	)
	return summary
}

func reconcile(
	state *model.AppState,
	desired map[string]desiredTarget,
	inScope func(model.DeploymentRecord) bool,
	preserveConflict func(model.ConflictItem) bool,
	forceDrift bool,
	summary *model.SyncSummary,
) {
	if state.Deployments == nil {
		state.Deployments = map[string]model.DeploymentRecord{}
	}

	// Keep conflicts outside current scope; rebuild conflicts inside current scope
	var preservedConflicts []model.ConflictItem
	for _, c := range state.Conflicts {
		if preserveConflict(c) {
			preservedConflicts = append(preservedConflicts, c)
		}
	}

	// 1. Remove tracked deployments inside scope that are no longer desired
	for key, rec := range state.Deployments {
		if !inScope(rec) {
			continue
		}
		if _, ok := desired[key]; ok {
			continue
		}
		if err := removeManagedPath(rec); err != nil {
			summary.Errors = append(summary.Errors, err.Error())
			continue
		}
		delete(state.Deployments, key)
		summary.Removed++
	}

	// 2. Apply desired targets in deterministic sorted key order
	keys := make([]string, 0, len(desired))
	for k := range desired {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	newConflicts := make([]model.ConflictItem, 0)
	for _, key := range keys {
		d := desired[key]
		if isProtectedName(filepath.Base(d.TargetPath)) {
			summary.Skipped++
			continue
		}
		if d.SourceStorePath == "" {
			summary.Skipped++
			continue
		}
		if _, err := os.Stat(d.SourceStorePath); err != nil {
			summary.Errors = append(summary.Errors, fmt.Sprintf("source missing for %s: %v", d.SkillSlug, err))
			continue
		}

		action, rec, conflict, err := applyTarget(state.Deployments, d, forceDrift, summary.SyncedAt)
		if err != nil {
			summary.Errors = append(summary.Errors, err.Error())
			continue
		}
		if conflict != nil {
			newConflicts = append(newConflicts, *conflict)
			summary.Skipped++
			continue
		}
		if rec != nil {
			state.Deployments[key] = *rec
		}
		switch action {
		case "created":
			summary.Created++
		case "updated":
			summary.Updated++
		case "skipped":
			summary.Skipped++
		}
	}

	state.Conflicts = append(preservedConflicts, newConflicts...)
	summary.Conflicts = state.Conflicts
}

func removeManagedPath(rec model.DeploymentRecord) error {
	if isProtectedName(filepath.Base(rec.TargetPath)) {
		return nil
	}
	isJ, err := winutil.IsJunction(rec.TargetPath)
	if err != nil {
		return err
	}
	if isJ {
		return winutil.RemoveJunction(rec.TargetPath)
	}
	if _, err := os.Lstat(rec.TargetPath); os.IsNotExist(err) {
		return nil
	}
	// Only remove non-junction directories if SkillsMan explicitly recorded them as Copy mode.
	if rec.Mode == model.DeployCopy {
		return os.RemoveAll(rec.TargetPath)
	}
	return nil
}

func applyTarget(
	deployments map[string]model.DeploymentRecord,
	d desiredTarget,
	forceDrift bool,
	now string,
) (action string, newRec *model.DeploymentRecord, conflict *model.ConflictItem, err error) {
	rec, tracked := deployments[d.Key]
	_, lstatErr := os.Lstat(d.TargetPath)
	exists := lstatErr == nil

	// Unmanaged existing folder/file -> never overwrite!
	if exists && !tracked {
		// Special benign case: already a junction pointing to exact canonical source
		if isJ, _ := winutil.IsJunction(d.TargetPath); isJ {
			if target, rerr := winutil.ReadJunctionTarget(d.TargetPath); rerr == nil && winutil.PathsEqualFold(target, d.SourceStorePath) && d.Mode == model.DeployJunction {
				r := buildRecord(d, d.SourceHash, now)
				return "updated", &r, nil, nil
			}
		}
		return "skipped", nil, &model.ConflictItem{
			TargetPath: d.TargetPath,
			SkillID:    d.SkillID,
			SkillSlug:  d.SkillSlug,
			AgentID:    d.AgentID,
			Scope:      d.Scope,
			ProjectID:  d.ProjectID,
			Reason:     "Target directory already exists and is not managed by SkillsMan",
			DetectedAt: now,
		}, nil
	}

	if d.Mode == "" {
		d.Mode = model.DeployJunction
	}

	// Ensure source hash is accurate
	srcHash := d.SourceHash
	if srcHash == "" {
		srcHash, _ = skillpkg.HashDir(d.SourceStorePath)
	}

	if d.Mode == model.DeployJunction {
		if exists {
			isJ, jerr := winutil.IsJunction(d.TargetPath)
			if jerr != nil {
				return "", nil, nil, jerr
			}
			if isJ {
				target, rerr := winutil.ReadJunctionTarget(d.TargetPath)
				if rerr == nil && winutil.PathsEqualFold(target, d.SourceStorePath) {
					r := buildRecord(d, srcHash, now)
					return "skipped", &r, nil, nil
				}
				if err := winutil.RemoveJunction(d.TargetPath); err != nil {
					return "", nil, nil, err
				}
			} else if tracked && rec.Mode == model.DeployCopy {
				// Switching tracked Copy -> Junction: protect local edits unless forceDrift
				diskHash, _ := skillpkg.HashDir(d.TargetPath)
				if rec.DeployedHash != "" && diskHash != rec.DeployedHash && !forceDrift {
					return "skipped", nil, &model.ConflictItem{
						TargetPath: d.TargetPath,
						SkillID:    d.SkillID,
						SkillSlug:  d.SkillSlug,
						AgentID:    d.AgentID,
						Scope:      d.Scope,
						ProjectID:  d.ProjectID,
						Reason:     "Local copy has un-synced edits before switching to Junction",
						DetectedAt: now,
					}, nil
				}
				if err := os.RemoveAll(d.TargetPath); err != nil {
					return "", nil, nil, err
				}
			} else {
				return "skipped", nil, &model.ConflictItem{
					TargetPath: d.TargetPath,
					SkillID:    d.SkillID,
					SkillSlug:  d.SkillSlug,
					AgentID:    d.AgentID,
					Scope:      d.Scope,
					ProjectID:  d.ProjectID,
					Reason:     "Target exists as non-junction directory",
					DetectedAt: now,
				}, nil
			}
		}

		if err := winutil.CreateJunction(d.TargetPath, d.SourceStorePath); err != nil {
			return "", nil, nil, err
		}
		r := buildRecord(d, srcHash, now)
		if tracked {
			return "updated", &r, nil, nil
		}
		return "created", &r, nil, nil
	}

	// Copy deployment mode
	if exists {
		isJ, jerr := winutil.IsJunction(d.TargetPath)
		if jerr != nil {
			return "", nil, nil, jerr
		}
		if isJ {
			if err := winutil.RemoveJunction(d.TargetPath); err != nil {
				return "", nil, nil, err
			}
			if err := skillpkg.CopyDir(d.SourceStorePath, d.TargetPath); err != nil {
				return "", nil, nil, err
			}
			r := buildRecord(d, srcHash, now)
			return "updated", &r, nil, nil
		}

		diskHash, err := skillpkg.HashDir(d.TargetPath)
		if err != nil {
			return "", nil, nil, err
		}
		if diskHash == srcHash {
			r := buildRecord(d, srcHash, now)
			return "skipped", &r, nil, nil
		}
		// Disk content differs from central store: check if local copy was edited
		if tracked && rec.DeployedHash != "" && diskHash != rec.DeployedHash && !forceDrift {
			return "skipped", nil, &model.ConflictItem{
				TargetPath: d.TargetPath,
				SkillID:    d.SkillID,
				SkillSlug:  d.SkillSlug,
				AgentID:    d.AgentID,
				Scope:      d.Scope,
				ProjectID:  d.ProjectID,
				Reason:     "Copy target has local modifications (drift detected)",
				DetectedAt: now,
			}, nil
		}

		if err := os.RemoveAll(d.TargetPath); err != nil {
			return "", nil, nil, err
		}
		if err := skillpkg.CopyDir(d.SourceStorePath, d.TargetPath); err != nil {
			return "", nil, nil, err
		}
		r := buildRecord(d, srcHash, now)
		return "updated", &r, nil, nil
	}

	if err := skillpkg.CopyDir(d.SourceStorePath, d.TargetPath); err != nil {
		return "", nil, nil, err
	}
	r := buildRecord(d, srcHash, now)
	return "created", &r, nil, nil
}

func buildRecord(d desiredTarget, hash string, now string) model.DeploymentRecord {
	return model.DeploymentRecord{
		Key:             d.Key,
		TargetPath:      d.TargetPath,
		SkillID:         d.SkillID,
		SkillSlug:       d.SkillSlug,
		AgentID:         d.AgentID,
		Scope:           d.Scope,
		ProjectID:       d.ProjectID,
		Mode:            d.Mode,
		SourceStorePath: d.SourceStorePath,
		DeployedHash:    hash,
		IsWorkflowGuide: d.IsWorkflowGuide,
		WorkflowID:      d.WorkflowID,
		SyncedAt:        now,
	}
}

// CheckHealth inspects all tracked deployments and conflicts for broken links, missing targets, or drift.
func CheckHealth(state model.AppState) []model.HealthIssue {
	var issues []model.HealthIssue
	conflictSet := make(map[string]bool)
	for _, c := range state.Conflicts {
		conflictSet[resolver.NormalizePathKey(c.TargetPath)] = true
		issues = append(issues, model.HealthIssue{
			Kind:       "conflict",
			TargetPath: c.TargetPath,
			SkillID:    c.SkillID,
			SkillSlug:  c.SkillSlug,
			AgentID:    c.AgentID,
			Scope:      c.Scope,
			ProjectID:  c.ProjectID,
			Message:    c.Reason,
		})
	}

	keys := make([]string, 0, len(state.Deployments))
	for k := range state.Deployments {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		rec := state.Deployments[k]
		if conflictSet[k] {
			continue
		}
		if _, err := os.Lstat(rec.TargetPath); os.IsNotExist(err) {
			issues = append(issues, model.HealthIssue{
				Kind:       "missing-target",
				TargetPath: rec.TargetPath,
				SkillID:    rec.SkillID,
				SkillSlug:  rec.SkillSlug,
				AgentID:    rec.AgentID,
				Scope:      rec.Scope,
				ProjectID:  rec.ProjectID,
				Message:    "Deployed skill path does not exist on disk",
			})
			continue
		}

		if rec.Mode == model.DeployJunction {
			isJ, _ := winutil.IsJunction(rec.TargetPath)
			if !isJ {
				issues = append(issues, model.HealthIssue{
					Kind:       "broken-junction",
					TargetPath: rec.TargetPath,
					SkillID:    rec.SkillID,
					SkillSlug:  rec.SkillSlug,
					AgentID:    rec.AgentID,
					Scope:      rec.Scope,
					ProjectID:  rec.ProjectID,
					Message:    "Expected junction but found regular directory",
				})
				continue
			}
			target, err := winutil.ReadJunctionTarget(rec.TargetPath)
			if err != nil || !winutil.PathsEqualFold(target, rec.SourceStorePath) {
				issues = append(issues, model.HealthIssue{
					Kind:       "broken-junction",
					TargetPath: rec.TargetPath,
					SkillID:    rec.SkillID,
					SkillSlug:  rec.SkillSlug,
					AgentID:    rec.AgentID,
					Scope:      rec.Scope,
					ProjectID:  rec.ProjectID,
					Message:    "Junction target points to an outdated path",
				})
				continue
			}
			if _, err := os.Stat(rec.TargetPath); err != nil {
				issues = append(issues, model.HealthIssue{
					Kind:       "broken-junction",
					TargetPath: rec.TargetPath,
					SkillID:    rec.SkillID,
					SkillSlug:  rec.SkillSlug,
					AgentID:    rec.AgentID,
					Scope:      rec.Scope,
					ProjectID:  rec.ProjectID,
					Message:    "Junction target directory is missing",
				})
			}
		} else if rec.Mode == model.DeployCopy {
			diskHash, err := skillpkg.HashDir(rec.TargetPath)
			if err == nil && rec.DeployedHash != "" && diskHash != rec.DeployedHash {
				issues = append(issues, model.HealthIssue{
					Kind:       "drift",
					TargetPath: rec.TargetPath,
					SkillID:    rec.SkillID,
					SkillSlug:  rec.SkillSlug,
					AgentID:    rec.AgentID,
					Scope:      rec.Scope,
					ProjectID:  rec.ProjectID,
					Message:    "Copied skill files were modified locally",
				})
			}
		}
	}

	return issues
}

// ResolveConflictBackupOverwrite moves an unmanaged conflicting folder into backups/ and re-syncs.
func ResolveConflictBackupOverwrite(state *model.AppState, targetPath, backupsDir, guidesDir string) (model.SyncSummary, error) {
	clean := filepath.Clean(targetPath)
	if isProtectedName(filepath.Base(clean)) {
		return model.SyncSummary{}, fmt.Errorf("protected directory cannot be overwritten: %s", clean)
	}
	if _, err := os.Lstat(clean); err == nil {
		stamp := time.Now().Format("20060102-150405")
		backupDest := filepath.Join(backupsDir, stamp+"_"+filepath.Base(clean))
		if err := os.MkdirAll(backupsDir, 0755); err != nil {
			return model.SyncSummary{}, err
		}
		if err := moveOrCopyReplace(clean, backupDest); err != nil {
			return model.SyncSummary{}, err
		}
	}

	// Remove from conflict list and ensure deployment tracking is fresh
	key := resolver.NormalizePathKey(clean)
	delete(state.Deployments, key)
	filtered := state.Conflicts[:0]
	for _, c := range state.Conflicts {
		if resolver.NormalizePathKey(c.TargetPath) != key {
			filtered = append(filtered, c)
		}
	}
	state.Conflicts = filtered
	return SyncAll(state, guidesDir), nil
}

// ForceSyncDrift overwrites a locally modified Copy-mode deployment from the central store.
func ForceSyncDrift(state *model.AppState, targetPath, guidesDir string) (model.SyncSummary, error) {
	key := resolver.NormalizePathKey(targetPath)
	rec, ok := state.Deployments[key]
	if !ok {
		return ResolveConflictBackupOverwrite(state, targetPath, filepath.Join(filepath.Dir(guidesDir), "backups"), guidesDir)
	}
	if _, err := os.Lstat(rec.TargetPath); err == nil {
		isJ, _ := winutil.IsJunction(rec.TargetPath)
		if isJ {
			_ = winutil.RemoveJunction(rec.TargetPath)
		} else {
			_ = os.RemoveAll(rec.TargetPath)
		}
	}
	delete(state.Deployments, key)
	filtered := state.Conflicts[:0]
	for _, c := range state.Conflicts {
		if resolver.NormalizePathKey(c.TargetPath) != key {
			filtered = append(filtered, c)
		}
	}
	state.Conflicts = filtered
	return SyncAll(state, guidesDir), nil
}

func moveOrCopyReplace(src, dst string) error {
	if err := os.Rename(src, dst); err == nil {
		return nil
	}
	isJ, _ := winutil.IsJunction(src)
	if isJ {
		return winutil.RemoveJunction(src)
	}
	if err := skillpkg.CopyDir(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(src)
}

// AdoptSkillDir imports an existing local skill directory into the central store.
func AdoptSkillDir(state *model.AppState, sourceDir, storeRoot, sourceType string) (model.Skill, error) {
	cleanSrc := filepath.Clean(sourceDir)
	meta, _, files, err := skillpkg.ParseSkillDir(cleanSrc)
	if err != nil {
		return model.Skill{}, err
	}

	baseSlug := skillpkg.SanitizeSlug(filepath.Base(cleanSrc))
	if baseSlug == "skill" && meta.Name != "" {
		baseSlug = skillpkg.SanitizeSlug(meta.Name)
	}
	slug := uniqueSlug(state.Skills, baseSlug, storeRoot)
	destDir := filepath.Join(storeRoot, slug)

	if err := skillpkg.CopyDir(cleanSrc, destDir); err != nil {
		return model.Skill{}, err
	}
	hash, err := skillpkg.HashDir(destDir)
	if err != nil {
		return model.Skill{}, err
	}
	now := time.Now().Format(time.RFC3339)
	sk := model.Skill{
		ID:          "sk-" + slug + "-" + fmt.Sprintf("%d", time.Now().UnixNano()%100000),
		Slug:        slug,
		Name:        meta.Name,
		Description: meta.Description,
		Author:      meta.Author,
		Version:     meta.Version,
		Tags:        meta.Tags,
		SourceType:  sourceType,
		SourceURL:   cleanSrc,
		StorePath:   destDir,
		ContentHash: hash,
		CreatedAt:   now,
		UpdatedAt:   now,
		Files:       files,
	}
	state.Skills = append(state.Skills, sk)
	return sk, nil
}

func uniqueSlug(existing []model.Skill, base, storeRoot string) string {
	used := make(map[string]bool, len(existing))
	for _, s := range existing {
		used[strings.ToLower(s.Slug)] = true
	}
	candidate := base
	for i := 2; ; i++ {
		if !used[strings.ToLower(candidate)] {
			if _, err := os.Stat(filepath.Join(storeRoot, candidate)); os.IsNotExist(err) {
				return candidate
			}
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
}

// ResolveConflictAdopt adopts an existing conflicting folder into the central store, assigns it, and syncs.
func ResolveConflictAdopt(state *model.AppState, targetPath, storeRoot, guidesDir string) (model.Skill, model.SyncSummary, error) {
	clean := filepath.Clean(targetPath)
	key := resolver.NormalizePathKey(clean)

	var matchedConflict *model.ConflictItem
	for i := range state.Conflicts {
		if resolver.NormalizePathKey(state.Conflicts[i].TargetPath) == key {
			matchedConflict = &state.Conflicts[i]
			break
		}
	}

	sk, err := AdoptSkillDir(state, clean, storeRoot, "adopted")
	if err != nil {
		return model.Skill{}, model.SyncSummary{}, err
	}

	if matchedConflict != nil {
		// Remove old unmanaged dir now that it is safely copied into central store
		isJ, _ := winutil.IsJunction(clean)
		if isJ {
			_ = winutil.RemoveJunction(clean)
		} else {
			_ = os.RemoveAll(clean)
		}
		// Remove old skill assignment if same slug? Bind new skill on same scope/agent if desired
		if matchedConflict.Scope == model.ScopeUser {
			for i := range state.Agents {
				if state.Agents[i].ID == matchedConflict.AgentID {
					state.Agents[i].UserSkillIDs = appendStringUnique(state.Agents[i].UserSkillIDs, sk.ID)
				}
			}
		} else if matchedConflict.Scope == model.ScopeProject {
			for i := range state.Projects {
				if state.Projects[i].ID == matchedConflict.ProjectID {
					state.Projects[i].DirectSkillIDs = appendStringUnique(state.Projects[i].DirectSkillIDs, sk.ID)
				}
			}
		}
	}

	filtered := state.Conflicts[:0]
	for _, c := range state.Conflicts {
		if resolver.NormalizePathKey(c.TargetPath) != key {
			filtered = append(filtered, c)
		}
	}
	state.Conflicts = filtered

	summary := SyncAll(state, guidesDir)
	return sk, summary, nil
}

func appendStringUnique(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

// ScanLocalUnmanagedSkills discovers existing non-hidden skills inside configured agent folders.
func ScanLocalUnmanagedSkills(state model.AppState, storeRoot string) []model.LocalDetectedSkill {
	var found []model.LocalDetectedSkill
	seenPaths := make(map[string]bool)

	slugSet := make(map[string]bool, len(state.Skills))
	for _, sk := range state.Skills {
		slugSet[strings.ToLower(sk.Slug)] = true
	}

	for _, a := range state.Agents {
		dir := agents.ExpandPath(a.UserSkillsDir)
		if dir == "" {
			continue
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() || isProtectedName(entry.Name()) {
				continue
			}
			full := filepath.Join(dir, entry.Name())
			key := resolver.NormalizePathKey(full)
			if seenPaths[key] {
				continue
			}
			if _, managed := state.Deployments[key]; managed {
				continue
			}
			if isJ, _ := winutil.IsJunction(full); isJ {
				if target, err := winutil.ReadJunctionTarget(full); err == nil {
					if strings.HasPrefix(strings.ToLower(target), strings.ToLower(filepath.Clean(storeRoot))) {
						continue
					}
				}
			}
			meta, _, _, err := skillpkg.ParseSkillDir(full)
			if err != nil {
				continue
			}
			seenPaths[key] = true
			found = append(found, model.LocalDetectedSkill{
				Path:        full,
				Slug:        entry.Name(),
				Name:        meta.Name,
				Description: meta.Description,
				Tags:        meta.Tags,
				AgentID:     a.ID,
				AgentName:   a.Name,
				AlreadyInDB: slugSet[strings.ToLower(skillpkg.SanitizeSlug(entry.Name()))],
			})
		}
	}

	return found
}
