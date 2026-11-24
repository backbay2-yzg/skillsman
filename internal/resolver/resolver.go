package resolver

import (
	"path/filepath"
	"sort"
	"strings"

	"skillsman/internal/agents"
	"skillsman/internal/model"
)

func indexSkills(skills []model.Skill) map[string]model.Skill {
	m := make(map[string]model.Skill, len(skills))
	for _, s := range skills {
		m[s.ID] = s
	}
	return m
}

func indexWorkflows(wfs []model.Workflow) map[string]model.Workflow {
	m := make(map[string]model.Workflow, len(wfs))
	for _, w := range wfs {
		m[w.ID] = w
	}
	return m
}

func toSet(ids []string) map[string]bool {
	s := make(map[string]bool, len(ids))
	for _, id := range ids {
		s[id] = true
	}
	return s
}

func workflowSkillIDs(wf model.Workflow) []string {
	stages := make([]model.WorkflowStage, len(wf.Stages))
	copy(stages, wf.Stages)
	sort.Slice(stages, func(i, j int) bool {
		return stages[i].Order < stages[j].Order
	})
	seen := make(map[string]bool)
	var out []string
	for _, stg := range stages {
		for _, sid := range stg.SkillIDs {
			if !seen[sid] {
				seen[sid] = true
				out = append(out, sid)
			}
		}
	}
	return out
}

func appendUnique(dst []string, val string) []string {
	for _, x := range dst {
		if x == val {
			return dst
		}
	}
	return append(dst, val)
}

// NormalizePathKey returns a normalized lowercase key for Windows deployment lookup.
func NormalizePathKey(p string) string {
	return strings.ToLower(filepath.Clean(p))
}

func computeTargetStatus(state model.AppState, targetPath string, active bool, desiredMode model.DeployMode, storePath string) string {
	key := NormalizePathKey(targetPath)
	for _, c := range state.Conflicts {
		if NormalizePathKey(c.TargetPath) == key {
			return "conflict"
		}
	}
	rec, ok := state.Deployments[key]
	if !active {
		if ok {
			return "pending-remove"
		}
		return "inactive"
	}
	if !ok {
		return "pending"
	}
	if rec.Mode != desiredMode {
		return "pending"
	}
	if !strings.EqualFold(filepath.Clean(rec.SourceStorePath), filepath.Clean(storePath)) {
		return "pending"
	}
	return "synced"
}

// ResolveForUserAgent computes effective skill assignments for a single agent's user directory.
func ResolveForUserAgent(state model.AppState, agentID string) []model.EffectiveSkillEntry {
	var agent *model.AgentProfile
	for i := range state.Agents {
		if state.Agents[i].ID == agentID {
			agent = &state.Agents[i]
			break
		}
	}
	if agent == nil {
		return nil
	}

	skillsByID := indexSkills(state.Skills)
	wfsByID := indexWorkflows(state.Workflows)
	mutedSkills := toSet(agent.GlobalMutedSkillIDs)
	mutedWfs := toSet(agent.GlobalMutedWorkflowIDs)

	type acc struct {
		globalActive bool
		globalMuted  bool
		userActive   bool
		sources      []string
	}
	entries := make(map[string]*acc)
	ensure := func(sid string) *acc {
		if a, ok := entries[sid]; ok {
			return a
		}
		a := &acc{}
		entries[sid] = a
		return a
	}

	// Global direct skills
	for _, sid := range state.Global.SkillIDs {
		if _, ok := skillsByID[sid]; !ok {
			continue
		}
		a := ensure(sid)
		a.sources = appendUnique(a.sources, "global")
		if mutedSkills[sid] {
			a.globalMuted = true
		} else {
			a.globalActive = true
		}
	}

	// Global workflows
	for _, wid := range state.Global.WorkflowIDs {
		wf, ok := wfsByID[wid]
		if !ok {
			continue
		}
		for _, sid := range workflowSkillIDs(wf) {
			if _, ok := skillsByID[sid]; !ok {
				continue
			}
			a := ensure(sid)
			a.sources = appendUnique(a.sources, "workflow:"+wf.Name)
			if mutedWfs[wid] || mutedSkills[sid] {
				a.globalMuted = true
			} else {
				a.globalActive = true
			}
		}
	}

	// Agent-specific user skills
	for _, sid := range agent.UserSkillIDs {
		if _, ok := skillsByID[sid]; !ok {
			continue
		}
		a := ensure(sid)
		a.userActive = true
		a.sources = appendUnique(a.sources, "direct")
	}

	// Agent-specific user workflows
	for _, wid := range agent.UserWorkflowIDs {
		wf, ok := wfsByID[wid]
		if !ok {
			continue
		}
		for _, sid := range workflowSkillIDs(wf) {
			if _, ok := skillsByID[sid]; !ok {
				continue
			}
			a := ensure(sid)
			a.userActive = true
			a.sources = appendUnique(a.sources, "user-workflow:"+wf.Name)
		}
	}

	baseDir := agents.ExpandPath(agent.UserSkillsDir)
	mode := agent.DefaultDeployMode
	if mode == "" {
		mode = model.DeployJunction
	}

	var out []model.EffectiveSkillEntry
	for sid, a := range entries {
		sk := skillsByID[sid]
		active := a.userActive || a.globalActive
		muted := !active && a.globalMuted
		targetPath := ""
		if baseDir != "" {
			targetPath = filepath.Join(baseDir, sk.Slug)
		}
		status := computeTargetStatus(state, targetPath, active, mode, sk.StorePath)
		out = append(out, model.EffectiveSkillEntry{
			SkillID:    sk.ID,
			SkillSlug:  sk.Slug,
			SkillName:  sk.Name,
			Active:     active,
			Muted:      muted,
			Sources:    a.sources,
			DeployMode: mode,
			Status:     status,
			TargetPath: targetPath,
		})
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].SkillName) < strings.ToLower(out[j].SkillName)
	})
	return out
}

// ResolveUserActiveWorkflows returns the workflows active for an agent's user level.
func ResolveUserActiveWorkflows(state model.AppState, agent model.AgentProfile) []model.Workflow {
	wfsByID := indexWorkflows(state.Workflows)
	mutedWfs := toSet(agent.GlobalMutedWorkflowIDs)
	activeIDs := make(map[string]bool)
	var out []model.Workflow

	for _, wid := range state.Global.WorkflowIDs {
		if !mutedWfs[wid] {
			if wf, ok := wfsByID[wid]; ok && !activeIDs[wid] {
				activeIDs[wid] = true
				out = append(out, wf)
			}
		}
	}
	for _, wid := range agent.UserWorkflowIDs {
		if wf, ok := wfsByID[wid]; ok && !activeIDs[wid] {
			activeIDs[wid] = true
			out = append(out, wf)
		}
	}
	return out
}

// ResolveForProjectAgent computes effective skill assignments for one agent inside a project.
func ResolveForProjectAgent(state model.AppState, projectID, agentID string) []model.EffectiveSkillEntry {
	var proj *model.Project
	for i := range state.Projects {
		if state.Projects[i].ID == projectID {
			proj = &state.Projects[i]
			break
		}
	}
	var agent *model.AgentProfile
	for i := range state.Agents {
		if state.Agents[i].ID == agentID {
			agent = &state.Agents[i]
			break
		}
	}
	if proj == nil || agent == nil {
		return nil
	}

	skillsByID := indexSkills(state.Skills)
	wfsByID := indexWorkflows(state.Workflows)
	projExcluded := toSet(proj.ExcludedSkillIDs)
	ov := proj.AgentOverrides[agentID]
	agentMutedSkills := toSet(ov.MutedSkillIDs)
	agentMutedWfs := toSet(ov.MutedWorkflowIDs)
	agentExtraSkills := toSet(ov.ExtraSkillIDs)

	type acc struct {
		projectActive bool
		extraActive   bool
		muted         bool
		sources       []string
	}
	entries := make(map[string]*acc)
	ensure := func(sid string) *acc {
		if a, ok := entries[sid]; ok {
			return a
		}
		a := &acc{}
		entries[sid] = a
		return a
	}

	for _, sid := range proj.DirectSkillIDs {
		if _, ok := skillsByID[sid]; !ok {
			continue
		}
		a := ensure(sid)
		a.sources = appendUnique(a.sources, "project-direct")
		if projExcluded[sid] || agentMutedSkills[sid] {
			a.muted = true
		} else {
			a.projectActive = true
		}
	}

	for _, wid := range proj.WorkflowIDs {
		wf, ok := wfsByID[wid]
		if !ok {
			continue
		}
		for _, sid := range workflowSkillIDs(wf) {
			if _, ok := skillsByID[sid]; !ok {
				continue
			}
			a := ensure(sid)
			a.sources = appendUnique(a.sources, "workflow:"+wf.Name)
			if agentMutedWfs[wid] || projExcluded[sid] || agentMutedSkills[sid] {
				a.muted = true
			} else {
				a.projectActive = true
			}
		}
	}

	for _, sid := range ov.ExtraSkillIDs {
		if _, ok := skillsByID[sid]; !ok {
			continue
		}
		a := ensure(sid)
		a.extraActive = true
		a.sources = appendUnique(a.sources, "agent-override")
	}

	for _, wid := range ov.ExtraWorkflowIDs {
		wf, ok := wfsByID[wid]
		if !ok {
			continue
		}
		for _, sid := range workflowSkillIDs(wf) {
			if _, ok := skillsByID[sid]; !ok {
				continue
			}
			a := ensure(sid)
			a.extraActive = true
			a.sources = appendUnique(a.sources, "agent-workflow:"+wf.Name)
		}
	}

	mode := agent.DefaultDeployMode
	if mode == "" {
		mode = model.DeployJunction
	}
	if proj.DeployModeOverride != "" {
		mode = model.DeployMode(proj.DeployModeOverride)
	}
	if ov.DeployMode != "" {
		mode = model.DeployMode(ov.DeployMode)
	}

	relDir := filepath.FromSlash(strings.TrimSpace(agent.ProjectSkillsRelDir))
	var out []model.EffectiveSkillEntry
	for sid, a := range entries {
		sk := skillsByID[sid]
		active := a.extraActive || (a.projectActive && !projExcluded[sid] && !agentMutedSkills[sid])
		muted := !active && (a.muted || projExcluded[sid] || agentMutedSkills[sid]) && !agentExtraSkills[sid]
		targetPath := ""
		if proj.Path != "" && relDir != "" {
			targetPath = filepath.Join(proj.Path, relDir, sk.Slug)
		}
		status := computeTargetStatus(state, targetPath, active, mode, sk.StorePath)
		out = append(out, model.EffectiveSkillEntry{
			SkillID:    sk.ID,
			SkillSlug:  sk.Slug,
			SkillName:  sk.Name,
			Active:     active,
			Muted:      muted,
			Sources:    a.sources,
			DeployMode: mode,
			Status:     status,
			TargetPath: targetPath,
		})
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].SkillName) < strings.ToLower(out[j].SkillName)
	})
	return out
}

// ResolveProjectActiveWorkflows returns workflows active for a specific agent in a project.
func ResolveProjectActiveWorkflows(state model.AppState, proj model.Project, agentID string) []model.Workflow {
	wfsByID := indexWorkflows(state.Workflows)
	ov := proj.AgentOverrides[agentID]
	mutedWfs := toSet(ov.MutedWorkflowIDs)
	activeIDs := make(map[string]bool)
	var out []model.Workflow

	for _, wid := range proj.WorkflowIDs {
		if !mutedWfs[wid] {
			if wf, ok := wfsByID[wid]; ok && !activeIDs[wid] {
				activeIDs[wid] = true
				out = append(out, wf)
			}
		}
	}
	for _, wid := range ov.ExtraWorkflowIDs {
		if wf, ok := wfsByID[wid]; ok && !activeIDs[wid] {
			activeIDs[wid] = true
			out = append(out, wf)
		}
	}
	return out
}

// BuildMatrix produces an Agent x Skill/Workflow matrix for Global, User, or Project scope.
func BuildMatrix(state model.AppState, scope model.ScopeKind, projectID string) model.MatrixSnapshot {
	snap := model.MatrixSnapshot{
		Scope:     scope,
		ProjectID: projectID,
		Agents:    []model.AgentProfile{},
		Rows:      []model.MatrixRow{},
	}

	var proj *model.Project
	if scope == model.ScopeProject {
		for i := range state.Projects {
			if state.Projects[i].ID == projectID {
				proj = &state.Projects[i]
				break
			}
		}
		if proj == nil && len(state.Projects) > 0 {
			proj = &state.Projects[0]
			snap.ProjectID = proj.ID
		}
	}

	projAgents := map[string]bool{}
	if proj != nil {
		projAgents = toSet(proj.EnabledAgentIDs)
	}

	for _, a := range state.Agents {
		if scope == model.ScopeProject && proj != nil && len(projAgents) > 0 {
			if projAgents[a.ID] {
				snap.Agents = append(snap.Agents, a)
			}
		} else if a.Enabled {
			snap.Agents = append(snap.Agents, a)
		}
	}
	if len(snap.Agents) == 0 && len(state.Agents) > 0 {
		snap.Agents = append(snap.Agents, state.Agents...)
	}

	globalSkillSet := toSet(state.Global.SkillIDs)
	globalWfSet := toSet(state.Global.WorkflowIDs)

	// Precompute effective entries per agent
	effByAgent := make(map[string]map[string]model.EffectiveSkillEntry, len(snap.Agents))
	for _, a := range snap.Agents {
		var entries []model.EffectiveSkillEntry
		if scope == model.ScopeProject && proj != nil {
			entries = ResolveForProjectAgent(state, proj.ID, a.ID)
		} else {
			entries = ResolveForUserAgent(state, a.ID)
		}
		m := make(map[string]model.EffectiveSkillEntry, len(entries))
		for _, e := range entries {
			m[e.SkillID] = e
		}
		effByAgent[a.ID] = m
	}

	// Build workflow rows first
	for _, wf := range state.Workflows {
		row := model.MatrixRow{
			ID:          wf.ID,
			Kind:        "workflow",
			Slug:        wf.Slug,
			Name:        wf.Name,
			Description: wf.Description,
			Color:       wf.Color,
			GlobalBound: globalWfSet[wf.ID],
			Cells:       make([]model.MatrixCell, 0, len(snap.Agents)),
		}
		for _, a := range snap.Agents {
			cell := model.MatrixCell{
				AgentID:    a.ID,
				RowID:      wf.ID,
				DeployMode: a.DefaultDeployMode,
				Sources:    []string{},
				Status:     "inactive",
			}
			if scope == model.ScopeProject && proj != nil {
				ov := proj.AgentOverrides[a.ID]
				projHas := toSet(proj.WorkflowIDs)[wf.ID]
				extraHas := toSet(ov.ExtraWorkflowIDs)[wf.ID]
				muted := toSet(ov.MutedWorkflowIDs)[wf.ID]
				cell.Direct = projHas || extraHas
				cell.Muted = projHas && muted && !extraHas
				cell.Active = (projHas && !muted) || extraHas
				if projHas {
					cell.Sources = append(cell.Sources, "project")
				}
				if extraHas {
					cell.Sources = append(cell.Sources, "agent-override")
				}
			} else {
				userHas := toSet(a.UserWorkflowIDs)[wf.ID]
				globHas := globalWfSet[wf.ID]
				muted := toSet(a.GlobalMutedWorkflowIDs)[wf.ID]
				cell.Direct = userHas
				cell.Inherited = globHas && !muted
				cell.Muted = globHas && muted && !userHas
				cell.Active = userHas || (globHas && !muted)
				if globHas {
					cell.Sources = append(cell.Sources, "global")
				}
				if userHas {
					cell.Sources = append(cell.Sources, "direct")
				}
			}
			if cell.Active {
				cell.Status = "synced"
			}
			row.Cells = append(row.Cells, cell)
		}
		snap.Rows = append(snap.Rows, row)
	}

	// Build skill rows
	for _, sk := range state.Skills {
		row := model.MatrixRow{
			ID:          sk.ID,
			Kind:        "skill",
			Slug:        sk.Slug,
			Name:        sk.Name,
			Description: sk.Description,
			GlobalBound: globalSkillSet[sk.ID],
			Cells:       make([]model.MatrixCell, 0, len(snap.Agents)),
		}
		for _, a := range snap.Agents {
			cell := model.MatrixCell{
				AgentID:    a.ID,
				RowID:      sk.ID,
				DeployMode: a.DefaultDeployMode,
				Sources:    []string{},
				Status:     "inactive",
			}
			if eff, ok := effByAgent[a.ID][sk.ID]; ok {
				cell.Active = eff.Active
				cell.Muted = eff.Muted
				cell.Sources = eff.Sources
				cell.DeployMode = eff.DeployMode
				cell.Status = eff.Status
				cell.TargetPath = eff.TargetPath
				for _, src := range eff.Sources {
					if src == "direct" || src == "project-direct" || src == "agent-override" {
						cell.Direct = true
					}
					if src == "global" || strings.HasPrefix(src, "workflow:") {
						cell.Inherited = true
					}
				}
			}
			row.Cells = append(row.Cells, cell)
		}
		snap.Rows = append(snap.Rows, row)
	}

	return snap
}

// TraceSkill computes all user & project deployment locations where a skill is active or muted.
func TraceSkill(state model.AppState, skillID string) []model.SkillTraceItem {
	var trace []model.SkillTraceItem

	for _, a := range state.Agents {
		if !a.Enabled {
			continue
		}
		for _, e := range ResolveForUserAgent(state, a.ID) {
			if e.SkillID == skillID {
				trace = append(trace, model.SkillTraceItem{
					Scope:      model.ScopeUser,
					AgentID:    a.ID,
					AgentName:  a.Name,
					Active:     e.Active,
					Muted:      e.Muted,
					Sources:    e.Sources,
					DeployMode: e.DeployMode,
					Status:     e.Status,
					TargetPath: e.TargetPath,
				})
			}
		}
	}

	agentNameByID := map[string]string{}
	for _, a := range state.Agents {
		agentNameByID[a.ID] = a.Name
	}

	for _, p := range state.Projects {
		for _, aid := range p.EnabledAgentIDs {
			for _, e := range ResolveForProjectAgent(state, p.ID, aid) {
				if e.SkillID == skillID {
					trace = append(trace, model.SkillTraceItem{
						Scope:      model.ScopeProject,
						AgentID:    aid,
						AgentName:  agentNameByID[aid],
						ProjectID:  p.ID,
						Project:    p.Name,
						Active:     e.Active,
						Muted:      e.Muted,
						Sources:    e.Sources,
						DeployMode: e.DeployMode,
						Status:     e.Status,
						TargetPath: e.TargetPath,
					})
				}
			}
		}
	}

	return trace
}
