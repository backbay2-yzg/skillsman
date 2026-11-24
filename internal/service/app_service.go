package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"skillsman/docs"
	"skillsman/internal/agents"
	"skillsman/internal/deployer"
	"skillsman/internal/model"
	"skillsman/internal/repo"
	"skillsman/internal/resolver"
	"skillsman/internal/skillpkg"
	"skillsman/internal/storage"
	"skillsman/internal/winutil"
)

const AppVersion = "1.0.0"

// RuntimeHooks decouples Wails runtime/window/tray references from exported RPC signatures.
type RuntimeHooks struct {
	App          *application.App
	MainWindow   *application.WebviewWindow
	RebuildTray  func()
	ApplyTheme   func(model.ThemeMode)
	SetCloseTray func(bool)
}

// SkillsService exposes all backend operations to the Wails v3 frontend.
type SkillsService struct {
	store *storage.Store
	hooks *RuntimeHooks
}

// NewSkillsService constructs a new SkillsService instance.
func NewSkillsService(store *storage.Store, hooks *RuntimeHooks) *SkillsService {
	if hooks == nil {
		hooks = &RuntimeHooks{}
	}
	return &SkillsService{
		store: store,
		hooks: hooks,
	}
}

func (s *SkillsService) emitStateChanged(reason string) {
	if s.hooks != nil && s.hooks.RebuildTray != nil {
		s.hooks.RebuildTray()
	}
	if s.hooks != nil && s.hooks.App != nil {
		s.hooks.App.Event.Emit("state:changed", reason)
	}
}

// GetSnapshot returns the full current application state, paths, and system theme.
func (s *SkillsService) GetSnapshot() model.AppSnapshot {
	st := s.store.StateSnapshot()
	st.Settings.AutoStart = winutil.IsAutoStartEnabled()
	paths := s.store.Paths()
	return model.AppSnapshot{
		State:       st,
		StoreRoot:   paths.Root,
		Portable:    paths.Portable,
		SystemTheme: winutil.GetSystemTheme(),
		AppVersion:  AppVersion,
	}
}

// GetSystemTheme reads current Windows light/dark mode and DWM accent color.
func (s *SkillsService) GetSystemTheme() model.SystemThemeInfo {
	return winutil.GetSystemTheme()
}

// GetMatrix computes the Agent x Skill/Workflow assignment matrix for a given scope.
func (s *SkillsService) GetMatrix(scope string, projectID string) model.MatrixSnapshot {
	st := s.store.StateSnapshot()
	sk := model.ScopeKind(scope)
	if sk == "" {
		sk = model.ScopeGlobal
	}
	return resolver.BuildMatrix(st, sk, projectID)
}

// TraceSkill returns all active/muted deployment locations for a skill.
func (s *SkillsService) TraceSkill(skillID string) []model.SkillTraceItem {
	st := s.store.StateSnapshot()
	return resolver.TraceSkill(st, skillID)
}

// CreateSkill creates a new skill package in the central store.
func (s *SkillsService) CreateSkill(name, desc, author, version string, tags []string, body string) (model.Skill, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return model.Skill{}, errors.New("skill name is required")
	}
	if strings.TrimSpace(body) == "" {
		body = fmt.Sprintf("# %s\n\nDescribe when and how the AI agent should apply this skill.\n", name)
	}

	var created model.Skill
	err := s.store.Update(func(st *model.AppState) error {
		slug := uniqueSkillSlug(st.Skills, skillpkg.SanitizeSlug(name), s.store.Paths().Store)
		dir := s.store.SkillStorePath(slug)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
		md := skillpkg.SerializeSkillMD(name, desc, author, version, tags, body)
		if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(md), 0644); err != nil {
			return err
		}
		meta, _, files, err := skillpkg.ParseSkillDir(dir)
		if err != nil {
			return err
		}
		hash, err := skillpkg.HashDir(dir)
		if err != nil {
			return err
		}
		now := time.Now().Format(time.RFC3339)
		created = model.Skill{
			ID:          fmt.Sprintf("sk-%s-%d", slug, time.Now().UnixNano()%100000),
			Slug:        slug,
			Name:        meta.Name,
			Description: meta.Description,
			Author:      meta.Author,
			Version:     meta.Version,
			Tags:        meta.Tags,
			SourceType:  "local",
			StorePath:   dir,
			ContentHash: hash,
			CreatedAt:   now,
			UpdatedAt:   now,
			Files:       files,
		}
		st.Skills = append(st.Skills, created)
		return nil
	})
	if err == nil {
		s.emitStateChanged("skill:created")
	}
	return created, err
}

// ReadSkillContent loads SKILL.md metadata and markdown body for viewing/editing.
func (s *SkillsService) ReadSkillContent(skillID string) (model.SkillContent, error) {
	st := s.store.StateSnapshot()
	var sk *model.Skill
	for i := range st.Skills {
		if st.Skills[i].ID == skillID {
			sk = &st.Skills[i]
			break
		}
	}
	if sk == nil {
		return model.SkillContent{}, fmt.Errorf("skill not found: %s", skillID)
	}
	meta, body, files, err := skillpkg.ParseSkillDir(sk.StorePath)
	if err != nil {
		return model.SkillContent{}, err
	}
	rawBytes, _ := os.ReadFile(filepath.Join(sk.StorePath, "SKILL.md"))
	return model.SkillContent{
		SkillID:     sk.ID,
		Name:        meta.Name,
		Description: meta.Description,
		Author:      meta.Author,
		Version:     meta.Version,
		Tags:        meta.Tags,
		Body:        body,
		RawMarkdown: string(rawBytes),
		StorePath:   sk.StorePath,
		Files:       files,
	}, nil
}

// SaveSkillContent updates a skill's SKILL.md, refreshes its content hash, and syncs Copy deployments.
func (s *SkillsService) SaveSkillContent(skillID, name, desc, author, version string, tags []string, body string) (model.Skill, error) {
	var updated model.Skill
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Skills {
			if st.Skills[i].ID == skillID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("skill not found: %s", skillID)
		}
		sk := &st.Skills[idx]
		if strings.TrimSpace(name) == "" {
			name = sk.Name
		}
		md := skillpkg.SerializeSkillMD(name, desc, author, version, tags, body)
		if err := os.WriteFile(filepath.Join(sk.StorePath, "SKILL.md"), []byte(md), 0644); err != nil {
			return err
		}
		meta, _, files, err := skillpkg.ParseSkillDir(sk.StorePath)
		if err != nil {
			return err
		}
		hash, err := skillpkg.HashDir(sk.StorePath)
		if err != nil {
			return err
		}
		sk.Name = meta.Name
		sk.Description = meta.Description
		sk.Author = meta.Author
		sk.Version = meta.Version
		sk.Tags = meta.Tags
		sk.Files = files
		sk.ContentHash = hash
		sk.UpdatedAt = time.Now().Format(time.RFC3339)
		updated = *sk

		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("skill:updated")
	}
	return updated, err
}

// DeleteSkill removes a skill from all assignments, cleans up deployments, and deletes its central store folder.
func (s *SkillsService) DeleteSkill(skillID string) error {
	paths := s.store.Paths()
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Skills {
			if st.Skills[i].ID == skillID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("skill not found: %s", skillID)
		}
		storePath := st.Skills[idx].StorePath
		st.Skills = append(st.Skills[:idx], st.Skills[idx+1:]...)

		st.Global.SkillIDs = removeStr(st.Global.SkillIDs, skillID)
		for i := range st.Agents {
			st.Agents[i].UserSkillIDs = removeStr(st.Agents[i].UserSkillIDs, skillID)
			st.Agents[i].GlobalMutedSkillIDs = removeStr(st.Agents[i].GlobalMutedSkillIDs, skillID)
		}
		for i := range st.Projects {
			st.Projects[i].DirectSkillIDs = removeStr(st.Projects[i].DirectSkillIDs, skillID)
			st.Projects[i].ExcludedSkillIDs = removeStr(st.Projects[i].ExcludedSkillIDs, skillID)
			for aid, ov := range st.Projects[i].AgentOverrides {
				ov.ExtraSkillIDs = removeStr(ov.ExtraSkillIDs, skillID)
				ov.MutedSkillIDs = removeStr(ov.MutedSkillIDs, skillID)
				st.Projects[i].AgentOverrides[aid] = ov
			}
		}
		for i := range st.Workflows {
			for j := range st.Workflows[i].Stages {
				st.Workflows[i].Stages[j].SkillIDs = removeStr(st.Workflows[i].Stages[j].SkillIDs, skillID)
			}
		}

		// Sync first so all junctions/copies pointing to storePath are removed cleanly
		deployer.SyncAll(st, paths.Guides)

		// Only delete store folder if it resides inside canonical storeRoot
		cleanStore := filepath.Clean(paths.Store)
		cleanTarget := filepath.Clean(storePath)
		if strings.HasPrefix(strings.ToLower(cleanTarget), strings.ToLower(cleanStore+string(filepath.Separator))) {
			_ = os.RemoveAll(cleanTarget)
		}
		return nil
	})
	if err == nil {
		s.emitStateChanged("skill:deleted")
	}
	return err
}

// ImportSkillFolder opens a native folder picker and imports the chosen skill folder into store/.
func (s *SkillsService) ImportSkillFolder() (*model.Skill, error) {
	if s.hooks == nil || s.hooks.App == nil {
		return nil, errors.New("dialog runtime not initialized")
	}
	dlg := s.hooks.App.Dialog.OpenFile().
		SetTitle("选择 Skill 文件夹 (需包含 SKILL.md)").
		CanChooseDirectories(true).
		CanChooseFiles(false)
	if s.hooks.MainWindow != nil {
		dlg.AttachToWindow(s.hooks.MainWindow)
	}
	dir, err := dlg.PromptForSingleSelection()
	if err != nil || strings.TrimSpace(dir) == "" {
		return nil, err
	}

	var imported model.Skill
	storeDir := s.store.Paths().Store
	err = s.store.Update(func(st *model.AppState) error {
		sk, err := deployer.AdoptSkillDir(st, dir, storeDir, "local")
		if err != nil {
			return err
		}
		imported = sk
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.emitStateChanged("skill:imported")
	return &imported, nil
}

// ImportSkillZip opens a native file picker for a .zip skill archive and imports it into store/.
func (s *SkillsService) ImportSkillZip() (*model.Skill, error) {
	if s.hooks == nil || s.hooks.App == nil {
		return nil, errors.New("dialog runtime not initialized")
	}
	dlg := s.hooks.App.Dialog.OpenFile().
		SetTitle("选择 Skill ZIP 压缩包").
		CanChooseFiles(true).
		CanChooseDirectories(false).
		AddFilter("ZIP Archives (*.zip)", "*.zip")
	if s.hooks.MainWindow != nil {
		dlg.AttachToWindow(s.hooks.MainWindow)
	}
	zipPath, err := dlg.PromptForSingleSelection()
	if err != nil || strings.TrimSpace(zipPath) == "" {
		return nil, err
	}

	tmpDir, err := os.MkdirTemp("", "skillsman-zip-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tmpDir)

	skillDir, err := skillpkg.ExtractZipSkill(zipPath, tmpDir)
	if err != nil {
		return nil, err
	}

	var imported model.Skill
	storeDir := s.store.Paths().Store
	err = s.store.Update(func(st *model.AppState) error {
		sk, err := deployer.AdoptSkillDir(st, skillDir, storeDir, "local")
		if err != nil {
			return err
		}
		sk.SourceURL = zipPath
		st.Skills[len(st.Skills)-1] = sk
		imported = sk
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.emitStateChanged("skill:imported")
	return &imported, nil
}

// ScanLocalSkills finds unmanaged skill folders currently sitting inside configured agent directories.
func (s *SkillsService) ScanLocalSkills() []model.LocalDetectedSkill {
	st := s.store.StateSnapshot()
	return deployer.ScanLocalUnmanagedSkills(st, s.store.Paths().Store)
}

// AdoptLocalSkills copies unmanaged agent skills into the central store, binds them back to their origin agent, and syncs.
func (s *SkillsService) AdoptLocalSkills(paths []string) ([]model.Skill, error) {
	if len(paths) == 0 {
		return nil, nil
	}
	stPaths := s.store.Paths()
	detected := deployer.ScanLocalUnmanagedSkills(s.store.StateSnapshot(), stPaths.Store)
	originAgentByPath := make(map[string]string, len(detected))
	for _, d := range detected {
		originAgentByPath[resolver.NormalizePathKey(d.Path)] = d.AgentID
	}

	var adopted []model.Skill
	err := s.store.Update(func(st *model.AppState) error {
		for _, p := range paths {
			clean := filepath.Clean(p)
			sk, err := deployer.AdoptSkillDir(st, clean, stPaths.Store, "adopted")
			if err != nil {
				return err
			}
			// Verify store copy exists before replacing unmanaged folder
			if _, statErr := os.Stat(filepath.Join(sk.StorePath, "SKILL.md")); statErr == nil {
				if originAgentID, ok := originAgentByPath[resolver.NormalizePathKey(clean)]; ok && originAgentID != "" {
					for i := range st.Agents {
						if st.Agents[i].ID == originAgentID {
							st.Agents[i].UserSkillIDs = appendUniqueStr(st.Agents[i].UserSkillIDs, sk.ID)
							break
						}
					}
					// Only remove the original folder when it matches the slug that SyncAll will link back
					if strings.EqualFold(filepath.Base(clean), sk.Slug) {
						isJ, _ := winutil.IsJunction(clean)
						if isJ {
							_ = winutil.RemoveJunction(clean)
						} else {
							_ = os.RemoveAll(clean)
						}
					}
				}
			}
			adopted = append(adopted, sk)
		}
		deployer.SyncAll(st, stPaths.Guides)
		return nil
	})
	if err == nil {
		s.emitStateChanged("skills:adopted")
	}
	return adopted, err
}

// OpenSkillFolder reveals a skill's central store directory in Windows Explorer.
func (s *SkillsService) OpenSkillFolder(skillID string) error {
	st := s.store.StateSnapshot()
	for _, sk := range st.Skills {
		if sk.ID == skillID {
			return winutil.OpenInExplorer(sk.StorePath)
		}
	}
	return fmt.Errorf("skill not found: %s", skillID)
}

// OpenSkillEditor opens a skill's SKILL.md in the configured editor.
func (s *SkillsService) OpenSkillEditor(skillID string) error {
	st := s.store.StateSnapshot()
	for _, sk := range st.Skills {
		if sk.ID == skillID {
			return winutil.OpenInEditor(filepath.Join(sk.StorePath, "SKILL.md"), st.Settings.DefaultEditor)
		}
	}
	return fmt.Errorf("skill not found: %s", skillID)
}

// ToggleGlobalSkill assigns or removes a skill globally across enabled agents and syncs.
func (s *SkillsService) ToggleGlobalSkill(skillID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:global-skill", func(st *model.AppState) error {
		if enabled {
			st.Global.SkillIDs = appendUniqueStr(st.Global.SkillIDs, skillID)
		} else {
			st.Global.SkillIDs = removeStr(st.Global.SkillIDs, skillID)
		}
		return nil
	})
}

// ToggleGlobalWorkflow assigns or removes a workflow globally across enabled agents and syncs.
func (s *SkillsService) ToggleGlobalWorkflow(workflowID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:global-workflow", func(st *model.AppState) error {
		if enabled {
			st.Global.WorkflowIDs = appendUniqueStr(st.Global.WorkflowIDs, workflowID)
		} else {
			st.Global.WorkflowIDs = removeStr(st.Global.WorkflowIDs, workflowID)
		}
		return nil
	})
}

// ToggleAgentUserSkill assigns or removes a skill directly on an agent's user level.
func (s *SkillsService) ToggleAgentUserSkill(agentID, skillID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:user-skill", func(st *model.AppState) error {
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				if enabled {
					st.Agents[i].UserSkillIDs = appendUniqueStr(st.Agents[i].UserSkillIDs, skillID)
					st.Agents[i].GlobalMutedSkillIDs = removeStr(st.Agents[i].GlobalMutedSkillIDs, skillID)
				} else {
					st.Agents[i].UserSkillIDs = removeStr(st.Agents[i].UserSkillIDs, skillID)
				}
				return nil
			}
		}
		return fmt.Errorf("agent not found: %s", agentID)
	})
}

// ToggleAgentUserWorkflow assigns or removes a workflow directly on an agent's user level.
func (s *SkillsService) ToggleAgentUserWorkflow(agentID, workflowID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:user-workflow", func(st *model.AppState) error {
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				if enabled {
					st.Agents[i].UserWorkflowIDs = appendUniqueStr(st.Agents[i].UserWorkflowIDs, workflowID)
					st.Agents[i].GlobalMutedWorkflowIDs = removeStr(st.Agents[i].GlobalMutedWorkflowIDs, workflowID)
				} else {
					st.Agents[i].UserWorkflowIDs = removeStr(st.Agents[i].UserWorkflowIDs, workflowID)
				}
				return nil
			}
		}
		return fmt.Errorf("agent not found: %s", agentID)
	})
}

// ToggleAgentGlobalMute mutes or unmutes a globally inherited skill for a specific agent.
func (s *SkillsService) ToggleAgentGlobalMute(agentID, skillID string, muted bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:mute-skill", func(st *model.AppState) error {
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				if muted {
					st.Agents[i].GlobalMutedSkillIDs = appendUniqueStr(st.Agents[i].GlobalMutedSkillIDs, skillID)
					st.Agents[i].UserSkillIDs = removeStr(st.Agents[i].UserSkillIDs, skillID)
				} else {
					st.Agents[i].GlobalMutedSkillIDs = removeStr(st.Agents[i].GlobalMutedSkillIDs, skillID)
				}
				return nil
			}
		}
		return fmt.Errorf("agent not found: %s", agentID)
	})
}

// ToggleAgentGlobalWorkflowMute mutes or unmutes a globally inherited workflow for a specific agent.
func (s *SkillsService) ToggleAgentGlobalWorkflowMute(agentID, workflowID string, muted bool) (model.SyncSummary, error) {
	return s.mutateAndSync("assign:mute-workflow", func(st *model.AppState) error {
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				if muted {
					st.Agents[i].GlobalMutedWorkflowIDs = appendUniqueStr(st.Agents[i].GlobalMutedWorkflowIDs, workflowID)
					st.Agents[i].UserWorkflowIDs = removeStr(st.Agents[i].UserWorkflowIDs, workflowID)
				} else {
					st.Agents[i].GlobalMutedWorkflowIDs = removeStr(st.Agents[i].GlobalMutedWorkflowIDs, workflowID)
				}
				return nil
			}
		}
		return fmt.Errorf("agent not found: %s", agentID)
	})
}

// SetAgentDeployMode changes the default deploy mode ("junction" | "copy") for an agent and syncs.
func (s *SkillsService) SetAgentDeployMode(agentID, mode string) (model.SyncSummary, error) {
	dm := model.DeployMode(mode)
	if dm != model.DeployCopy {
		dm = model.DeployJunction
	}
	return s.mutateAndSync("agent:mode", func(st *model.AppState) error {
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				st.Agents[i].DefaultDeployMode = dm
				return nil
			}
		}
		return fmt.Errorf("agent not found: %s", agentID)
	})
}

// SaveWorkflow creates or updates a staged workflow and syncs all targets using it.
func (s *SkillsService) SaveWorkflow(wf model.Workflow) (model.Workflow, error) {
	wf.Name = strings.TrimSpace(wf.Name)
	if wf.Name == "" {
		return model.Workflow{}, errors.New("workflow name is required")
	}
	now := time.Now().Format(time.RFC3339)
	if wf.Color == "" {
		wf.Color = "#0078D4"
	}
	if wf.Slug == "" {
		wf.Slug = skillpkg.SanitizeSlug(wf.Name)
	} else {
		wf.Slug = skillpkg.SanitizeSlug(wf.Slug)
	}
	for i := range wf.Stages {
		if wf.Stages[i].ID == "" {
			wf.Stages[i].ID = fmt.Sprintf("stg-%d-%d", i+1, time.Now().UnixNano()%10000)
		}
		wf.Stages[i].Order = i + 1
		if wf.Stages[i].SkillIDs == nil {
			wf.Stages[i].SkillIDs = []string{}
		}
	}

	var saved model.Workflow
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		if wf.ID == "" {
			wf.ID = fmt.Sprintf("wf-%s-%d", wf.Slug, time.Now().UnixNano()%100000)
			wf.CreatedAt = now
			wf.UpdatedAt = now
			st.Workflows = append(st.Workflows, wf)
			saved = wf
			return nil
		}
		idx := -1
		for i := range st.Workflows {
			if st.Workflows[i].ID == wf.ID {
				idx = i
				break
			}
		}
		if idx < 0 {
			wf.CreatedAt = now
			wf.UpdatedAt = now
			st.Workflows = append(st.Workflows, wf)
		} else {
			if wf.CreatedAt == "" {
				wf.CreatedAt = st.Workflows[idx].CreatedAt
			}
			wf.UpdatedAt = now
			st.Workflows[idx] = wf
		}
		saved = wf
		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("workflow:saved")
	}
	return saved, err
}

// DeleteWorkflow deletes a workflow and cleans up all bindings & guides.
func (s *SkillsService) DeleteWorkflow(workflowID string) error {
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Workflows {
			if st.Workflows[i].ID == workflowID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("workflow not found: %s", workflowID)
		}
		st.Workflows = append(st.Workflows[:idx], st.Workflows[idx+1:]...)
		st.Global.WorkflowIDs = removeStr(st.Global.WorkflowIDs, workflowID)
		for i := range st.Agents {
			st.Agents[i].UserWorkflowIDs = removeStr(st.Agents[i].UserWorkflowIDs, workflowID)
			st.Agents[i].GlobalMutedWorkflowIDs = removeStr(st.Agents[i].GlobalMutedWorkflowIDs, workflowID)
		}
		for i := range st.Projects {
			st.Projects[i].WorkflowIDs = removeStr(st.Projects[i].WorkflowIDs, workflowID)
			for aid, ov := range st.Projects[i].AgentOverrides {
				ov.ExtraWorkflowIDs = removeStr(ov.ExtraWorkflowIDs, workflowID)
				ov.MutedWorkflowIDs = removeStr(ov.MutedWorkflowIDs, workflowID)
				st.Projects[i].AgentOverrides[aid] = ov
			}
		}
		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("workflow:deleted")
	}
	return err
}

// BindWorkflow assigns or unassigns a workflow across Global, User Agent, or Project scopes.
func (s *SkillsService) BindWorkflow(workflowID, scope, targetID, agentID string, enabled bool) (model.SyncSummary, error) {
	switch model.ScopeKind(scope) {
	case model.ScopeGlobal:
		return s.ToggleGlobalWorkflow(workflowID, enabled)
	case model.ScopeUser:
		id := targetID
		if id == "" {
			id = agentID
		}
		return s.ToggleAgentUserWorkflow(id, workflowID, enabled)
	case model.ScopeProject:
		return s.ToggleProjectWorkflow(targetID, agentID, workflowID, enabled)
	default:
		return model.SyncSummary{}, fmt.Errorf("unsupported scope: %s", scope)
	}
}

// PickProjectFolder opens a native Windows folder selection dialog for choosing a project directory.
func (s *SkillsService) PickProjectFolder() (string, error) {
	if s.hooks == nil || s.hooks.App == nil {
		return "", errors.New("dialog runtime not initialized")
	}
	dlg := s.hooks.App.Dialog.OpenFile().
		SetTitle("选择项目根目录").
		CanChooseDirectories(true).
		CanChooseFiles(false)
	if s.hooks.MainWindow != nil {
		dlg.AttachToWindow(s.hooks.MainWindow)
	}
	return dlg.PromptForSingleSelection()
}

// AddProject registers a project directory and defaults to enabling all currently enabled agents.
func (s *SkillsService) AddProject(path string) (model.Project, error) {
	clean := filepath.Clean(strings.TrimSpace(path))
	if clean == "" {
		return model.Project{}, errors.New("project path is required")
	}
	st, err := os.Stat(clean)
	if err != nil || !st.IsDir() {
		return model.Project{}, fmt.Errorf("directory does not exist: %s", clean)
	}

	var added model.Project
	err = s.store.Update(func(appSt *model.AppState) error {
		for _, p := range appSt.Projects {
			if strings.EqualFold(filepath.Clean(p.Path), clean) {
				added = p
				return nil
			}
		}
		var enabledAgents []string
		for _, a := range appSt.Agents {
			if a.Enabled {
				enabledAgents = append(enabledAgents, a.ID)
			}
		}
		name := filepath.Base(clean)
		added = model.Project{
			ID:                   fmt.Sprintf("proj-%s-%d", skillpkg.SanitizeSlug(name), time.Now().UnixNano()%100000),
			Name:                 name,
			Path:                 clean,
			EnabledAgentIDs:      enabledAgents,
			WorkflowIDs:          []string{},
			DirectSkillIDs:       []string{},
			ExcludedSkillIDs:     []string{},
			AgentOverrides:       map[string]model.ProjectAgentOverride{},
			ManageGitignore:      true,
			WorkflowGuideEnabled: true,
		}
		appSt.Projects = append(appSt.Projects, added)
		return nil
	})
	if err == nil {
		s.emitStateChanged("project:added")
	}
	return added, err
}

// ScanWorkspaceForProjects opens a workspace folder picker and scans 1-2 levels deep for code projects.
func (s *SkillsService) ScanWorkspaceForProjects() ([]string, error) {
	if s.hooks == nil || s.hooks.App == nil {
		return nil, errors.New("dialog runtime not initialized")
	}
	dlg := s.hooks.App.Dialog.OpenFile().
		SetTitle("选择代码工作区根目录以批量扫描项目").
		CanChooseDirectories(true).
		CanChooseFiles(false)
	if s.hooks.MainWindow != nil {
		dlg.AttachToWindow(s.hooks.MainWindow)
	}
	root, err := dlg.PromptForSingleSelection()
	if err != nil || strings.TrimSpace(root) == "" {
		return nil, err
	}

	existing := make(map[string]bool)
	s.store.Read(func(st *model.AppState) {
		for _, p := range st.Projects {
			existing[strings.ToLower(filepath.Clean(p.Path))] = true
		}
	})

	markers := []string{".git", "go.mod", "package.json", "pyproject.toml", "Cargo.toml", ".claude", ".agents", ".cursor", ".agent"}
	var candidates []string
	seen := make(map[string]bool)
	cleanRoot := filepath.Clean(root)
	baseDepth := strings.Count(cleanRoot, string(filepath.Separator))

	_ = filepath.WalkDir(cleanRoot, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil || !d.IsDir() {
			return nil
		}
		name := d.Name()
		if p != cleanRoot && (strings.HasPrefix(name, ".") || name == "node_modules" || name == "target" || name == "dist" || name == "vendor") {
			return filepath.SkipDir
		}
		depth := strings.Count(filepath.Clean(p), string(filepath.Separator)) - baseDepth
		if depth > 2 {
			return filepath.SkipDir
		}
		for _, m := range markers {
			if _, err := os.Stat(filepath.Join(p, m)); err == nil {
				key := strings.ToLower(filepath.Clean(p))
				if !existing[key] && !seen[key] && p != cleanRoot {
					seen[key] = true
					candidates = append(candidates, p)
				}
				return filepath.SkipDir
			}
		}
		return nil
	})
	sort.Strings(candidates)
	return candidates, nil
}

// AddProjectsBatch registers multiple project paths at once.
func (s *SkillsService) AddProjectsBatch(paths []string) ([]model.Project, error) {
	var created []model.Project
	for _, p := range paths {
		proj, err := s.AddProject(p)
		if err == nil {
			created = append(created, proj)
		}
	}
	return created, nil
}

// UpdateProject saves project configuration and syncs that project's deployments.
func (s *SkillsService) UpdateProject(project model.Project) (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		found := false
		for i := range st.Projects {
			if st.Projects[i].ID == project.ID {
				st.Projects[i] = project
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("project not found: %s", project.ID)
		}
		summary = deployer.SyncProject(st, guidesDir, project.ID)
		return nil
	})
	if err == nil {
		s.emitStateChanged("project:updated")
	}
	return summary, err
}

// DeleteProject removes a project from management and cleans up its deployed links/copies.
func (s *SkillsService) DeleteProject(projectID string) error {
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Projects {
			if st.Projects[i].ID == projectID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("project not found: %s", projectID)
		}
		proj := st.Projects[idx]
		st.Projects = append(st.Projects[:idx], st.Projects[idx+1:]...)
		if proj.ManageGitignore && proj.Path != "" {
			_ = deployer.UpdateGitignore(proj.Path, nil)
		}
		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("project:deleted")
	}
	return err
}

// ToggleProjectSkill assigns/unassigns a skill for a project (or specific agent override within the project).
func (s *SkillsService) ToggleProjectSkill(projectID, agentID, skillID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateProjectAndSync(projectID, "project:skill", func(proj *model.Project) {
		if agentID == "" {
			if enabled {
				proj.DirectSkillIDs = appendUniqueStr(proj.DirectSkillIDs, skillID)
				proj.ExcludedSkillIDs = removeStr(proj.ExcludedSkillIDs, skillID)
			} else {
				proj.DirectSkillIDs = removeStr(proj.DirectSkillIDs, skillID)
			}
			return
		}
		if proj.AgentOverrides == nil {
			proj.AgentOverrides = map[string]model.ProjectAgentOverride{}
		}
		ov := proj.AgentOverrides[agentID]
		if enabled {
			ov.ExtraSkillIDs = appendUniqueStr(ov.ExtraSkillIDs, skillID)
			ov.MutedSkillIDs = removeStr(ov.MutedSkillIDs, skillID)
		} else {
			ov.ExtraSkillIDs = removeStr(ov.ExtraSkillIDs, skillID)
		}
		proj.AgentOverrides[agentID] = ov
	})
}

// ToggleProjectSkillMute mutes or unmutes a project-inherited skill for a specific agent (or project-wide).
func (s *SkillsService) ToggleProjectSkillMute(projectID, agentID, skillID string, muted bool) (model.SyncSummary, error) {
	return s.mutateProjectAndSync(projectID, "project:mute", func(proj *model.Project) {
		if agentID == "" {
			if muted {
				proj.ExcludedSkillIDs = appendUniqueStr(proj.ExcludedSkillIDs, skillID)
			} else {
				proj.ExcludedSkillIDs = removeStr(proj.ExcludedSkillIDs, skillID)
			}
			return
		}
		if proj.AgentOverrides == nil {
			proj.AgentOverrides = map[string]model.ProjectAgentOverride{}
		}
		ov := proj.AgentOverrides[agentID]
		if muted {
			ov.MutedSkillIDs = appendUniqueStr(ov.MutedSkillIDs, skillID)
			ov.ExtraSkillIDs = removeStr(ov.ExtraSkillIDs, skillID)
		} else {
			ov.MutedSkillIDs = removeStr(ov.MutedSkillIDs, skillID)
		}
		proj.AgentOverrides[agentID] = ov
	})
}

// ToggleProjectWorkflow binds or unbinds a workflow to a project (or specific agent override).
func (s *SkillsService) ToggleProjectWorkflow(projectID, agentID, workflowID string, enabled bool) (model.SyncSummary, error) {
	return s.mutateProjectAndSync(projectID, "project:workflow", func(proj *model.Project) {
		if agentID == "" {
			if enabled {
				proj.WorkflowIDs = appendUniqueStr(proj.WorkflowIDs, workflowID)
			} else {
				proj.WorkflowIDs = removeStr(proj.WorkflowIDs, workflowID)
			}
			return
		}
		if proj.AgentOverrides == nil {
			proj.AgentOverrides = map[string]model.ProjectAgentOverride{}
		}
		ov := proj.AgentOverrides[agentID]
		if enabled {
			ov.ExtraWorkflowIDs = appendUniqueStr(ov.ExtraWorkflowIDs, workflowID)
			ov.MutedWorkflowIDs = removeStr(ov.MutedWorkflowIDs, workflowID)
		} else {
			ov.ExtraWorkflowIDs = removeStr(ov.ExtraWorkflowIDs, workflowID)
		}
		proj.AgentOverrides[agentID] = ov
	})
}

// SaveAgent creates a custom agent profile or updates an existing agent profile and syncs.
func (s *SkillsService) SaveAgent(agent model.AgentProfile) (model.AgentProfile, error) {
	agent.Name = strings.TrimSpace(agent.Name)
	if agent.Name == "" {
		return model.AgentProfile{}, errors.New("agent name is required")
	}
	if agent.DefaultDeployMode == "" {
		agent.DefaultDeployMode = model.DeployJunction
	}
	if agent.Icon == "" {
		agent.Icon = "Cpu"
	}

	var saved model.AgentProfile
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		if agent.ID == "" {
			slug := skillpkg.SanitizeSlug(agent.Name)
			agent.ID = fmt.Sprintf("custom-%s-%d", slug, time.Now().UnixNano()%10000)
			agent.Builtin = false
			st.Agents = append(st.Agents, agent)
			saved = agent
			deployer.SyncAll(st, guidesDir)
			return nil
		}
		idx := -1
		for i := range st.Agents {
			if st.Agents[i].ID == agent.ID {
				idx = i
				break
			}
		}
		if idx < 0 {
			st.Agents = append(st.Agents, agent)
		} else {
			st.Agents[idx] = agent
		}
		saved = agent
		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("agent:saved")
	}
	return saved, err
}

// DeleteAgent removes a custom agent profile and cleans up its deployments.
func (s *SkillsService) DeleteAgent(agentID string) error {
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Agents {
			if st.Agents[i].ID == agentID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("agent not found: %s", agentID)
		}
		if st.Agents[idx].Builtin {
			return errors.New("built-in agent presets cannot be deleted; disable it instead")
		}
		st.Agents = append(st.Agents[:idx], st.Agents[idx+1:]...)
		for i := range st.Projects {
			st.Projects[i].EnabledAgentIDs = removeStr(st.Projects[i].EnabledAgentIDs, agentID)
			delete(st.Projects[i].AgentOverrides, agentID)
		}
		deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("agent:deleted")
	}
	return err
}

// RedetectAgents re-scans local filesystem markers for built-in and custom agents.
func (s *SkillsService) RedetectAgents() ([]model.AgentProfile, error) {
	var updated []model.AgentProfile
	err := s.store.Update(func(st *model.AppState) error {
		st.Agents = agents.DetectInstalledAgents(st.Agents, false)
		updated = st.Agents
		return nil
	})
	if err == nil {
		s.emitStateChanged("agent:redetected")
	}
	return updated, err
}

// AddRepo adds a Git repository source, clones it, and discovers SKILL.md entries.
func (s *SkillsService) AddRepo(url, branch, name string) (model.RepoSource, error) {
	norm := repo.NormalizeRepoURL(url)
	if norm == "" {
		return model.RepoSource{}, errors.New("repository URL is required")
	}
	st := s.store.StateSnapshot()
	paths := s.store.Paths()

	id := fmt.Sprintf("repo-%s-%d", skillpkg.SanitizeSlug(name), time.Now().UnixNano()%100000)
	if strings.TrimSpace(name) == "" {
		id = fmt.Sprintf("repo-%s-%d", skillpkg.SanitizeSlug(norm), time.Now().UnixNano()%100000)
	}
	r := model.RepoSource{
		ID:        id,
		Name:      strings.TrimSpace(name),
		URL:       norm,
		Branch:    strings.TrimSpace(branch),
		CachePath: filepath.Join(paths.Repos, id),
	}
	if err := repo.SyncRepo(&r, paths.Repos, st.Settings); err != nil {
		return model.RepoSource{}, err
	}

	err := s.store.Update(func(appSt *model.AppState) error {
		markInstalledDiscovered(appSt.Skills, &r)
		appSt.Repos = append(appSt.Repos, r)
		return nil
	})
	if err == nil {
		s.emitStateChanged("repo:added")
	}
	return r, err
}

// RefreshRepo fetches latest upstream commits and re-scans SKILL.md entries in the repo.
func (s *SkillsService) RefreshRepo(repoID string) (model.RepoSource, error) {
	st := s.store.StateSnapshot()
	paths := s.store.Paths()

	var target model.RepoSource
	found := false
	for _, r := range st.Repos {
		if r.ID == repoID {
			target = r
			found = true
			break
		}
	}
	if !found {
		return model.RepoSource{}, fmt.Errorf("repository not found: %s", repoID)
	}

	if err := repo.SyncRepo(&target, paths.Repos, st.Settings); err != nil {
		return model.RepoSource{}, err
	}

	err := s.store.Update(func(appSt *model.AppState) error {
		for i := range appSt.Repos {
			if appSt.Repos[i].ID == repoID {
				markInstalledDiscovered(appSt.Skills, &target)
				appSt.Repos[i] = target
				// Mark installed skills from this repo as having update if commit changed
				for j := range appSt.Skills {
					if appSt.Skills[j].SourceRepoID == repoID && target.LastCommit != "" && appSt.Skills[j].CommitHash != target.LastCommit {
						appSt.Skills[j].HasUpdate = true
						appSt.Skills[j].RemoteCommit = target.LastCommit
					}
				}
				return nil
			}
		}
		return nil
	})
	if err == nil {
		s.emitStateChanged("repo:refreshed")
	}
	return target, err
}

// DeleteRepo removes a repository source and deletes its local clone cache.
func (s *SkillsService) DeleteRepo(repoID string) error {
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Repos {
			if st.Repos[i].ID == repoID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("repository not found: %s", repoID)
		}
		cachePath := st.Repos[idx].CachePath
		st.Repos = append(st.Repos[:idx], st.Repos[idx+1:]...)
		if cachePath != "" {
			_ = os.RemoveAll(cachePath)
		}
		return nil
	})
	if err == nil {
		s.emitStateChanged("repo:deleted")
	}
	return err
}

// InstallRepoSkills installs or updates selected subpaths from a repository source into store/.
func (s *SkillsService) InstallRepoSkills(repoID string, subpaths []string) ([]model.Skill, error) {
	paths := s.store.Paths()
	var installed []model.Skill

	err := s.store.Update(func(st *model.AppState) error {
		repoIdx := -1
		for i := range st.Repos {
			if st.Repos[i].ID == repoID {
				repoIdx = i
				break
			}
		}
		if repoIdx < 0 {
			return fmt.Errorf("repository not found: %s", repoID)
		}
		r := st.Repos[repoIdx]
		needSync := false

		for _, sub := range subpaths {
			sk, updated, err := repo.InstallSkillFromRepo(r, sub, paths.Store, st.Skills)
			if err != nil {
				return err
			}
			if updated {
				for i := range st.Skills {
					if st.Skills[i].ID == sk.ID {
						st.Skills[i] = sk
						break
					}
				}
				needSync = true
			} else {
				st.Skills = append(st.Skills, sk)
			}
			installed = append(installed, sk)
		}

		markInstalledDiscovered(st.Skills, &st.Repos[repoIdx])
		if needSync {
			deployer.SyncAll(st, paths.Guides)
		}
		return nil
	})
	if err == nil {
		s.emitStateChanged("repo:installed")
	}
	return installed, err
}

// CheckAllUpdates checks remote HEADs for all cached repositories and marks available updates.
func (s *SkillsService) CheckAllUpdates() ([]string, error) {
	st := s.store.StateSnapshot()
	var updatedRepos []string

	type result struct {
		id           string
		remoteCommit string
		hasUpdate    bool
		checkedAt    string
	}
	var results []result

	for i := range st.Repos {
		r := st.Repos[i]
		if r.LastCommit == "" {
			continue
		}
		if err := repo.CheckRepoUpdate(&r, st.Settings); err == nil {
			results = append(results, result{
				id:           r.ID,
				remoteCommit: r.RemoteCommit,
				hasUpdate:    r.HasUpdate,
				checkedAt:    r.LastCheckedAt,
			})
			if r.HasUpdate {
				updatedRepos = append(updatedRepos, r.Name)
			}
		}
	}

	_ = s.store.Update(func(appSt *model.AppState) error {
		resMap := make(map[string]result, len(results))
		for _, res := range results {
			resMap[res.id] = res
		}
		for i := range appSt.Repos {
			if res, ok := resMap[appSt.Repos[i].ID]; ok {
				appSt.Repos[i].RemoteCommit = res.remoteCommit
				appSt.Repos[i].HasUpdate = res.hasUpdate
				appSt.Repos[i].LastCheckedAt = res.checkedAt
			}
		}
		for i := range appSt.Skills {
			if res, ok := resMap[appSt.Skills[i].SourceRepoID]; ok && res.remoteCommit != "" {
				appSt.Skills[i].RemoteCommit = res.remoteCommit
				appSt.Skills[i].HasUpdate = appSt.Skills[i].CommitHash != "" && appSt.Skills[i].CommitHash != res.remoteCommit
			}
		}
		return nil
	})
	s.emitStateChanged("updates:checked")
	return updatedRepos, nil
}

// UpdateInstalledSkill pulls latest upstream changes for a git/registry-sourced skill and re-syncs.
func (s *SkillsService) UpdateInstalledSkill(skillID string) (model.Skill, error) {
	st := s.store.StateSnapshot()
	var target *model.Skill
	for i := range st.Skills {
		if st.Skills[i].ID == skillID {
			target = &st.Skills[i]
			break
		}
	}
	if target == nil {
		return model.Skill{}, fmt.Errorf("skill not found: %s", skillID)
	}
	if target.SourceRepoID != "" {
		// Check if it belongs to a tracked repo
		for _, r := range st.Repos {
			if r.ID == target.SourceRepoID {
				if _, err := s.RefreshRepo(r.ID); err != nil {
					return model.Skill{}, err
				}
				skills, err := s.InstallRepoSkills(r.ID, []string{target.SourceSubpath})
				if err != nil {
					return model.Skill{}, err
				}
				if len(skills) > 0 {
					return skills[0], nil
				}
			}
		}
	}
	if target.SourceURL != "" && (strings.HasPrefix(target.SourceURL, "http") || strings.HasPrefix(target.SourceURL, "git@")) {
		item := model.RegistryItem{
			ID:      target.ID,
			Slug:    target.Slug,
			Name:    target.Name,
			RepoURL: target.SourceURL,
			Subpath: target.SourceSubpath,
		}
		return s.InstallRegistryItem(item)
	}
	return model.Skill{}, errors.New("this skill has no remote repository source")
}

// SearchRegistry queries an enabled online skills registry (e.g. skills.sh or custom JSON feed).
func (s *SkillsService) SearchRegistry(registryID, query string) ([]model.RegistryItem, error) {
	st := s.store.StateSnapshot()
	var reg *model.RegistrySource
	for i := range st.Registries {
		if st.Registries[i].ID == registryID || (registryID == "" && st.Registries[i].Enabled) {
			reg = &st.Registries[i]
			break
		}
	}
	if reg == nil {
		return nil, errors.New("no matching registry source configured")
	}
	return repo.SearchRegistry(*reg, query, st.Settings)
}

// AddCustomRegistry adds a user-defined JSON registry endpoint.
func (s *SkillsService) AddCustomRegistry(name, url string) (model.RegistrySource, error) {
	name = strings.TrimSpace(name)
	url = strings.TrimSpace(url)
	if name == "" || url == "" {
		return model.RegistrySource{}, errors.New("registry name and URL are required")
	}
	reg := model.RegistrySource{
		ID:      fmt.Sprintf("reg-%s-%d", skillpkg.SanitizeSlug(name), time.Now().UnixNano()%100000),
		Name:    name,
		Kind:    "custom-json",
		URL:     url,
		Enabled: true,
		Builtin: false,
	}
	err := s.store.Update(func(st *model.AppState) error {
		st.Registries = append(st.Registries, reg)
		return nil
	})
	if err == nil {
		s.emitStateChanged("registry:added")
	}
	return reg, err
}

// DeleteRegistry removes a custom registry source.
func (s *SkillsService) DeleteRegistry(registryID string) error {
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Registries {
			if st.Registries[i].ID == registryID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("registry not found: %s", registryID)
		}
		if st.Registries[idx].Builtin {
			return errors.New("built-in registry cannot be deleted")
		}
		st.Registries = append(st.Registries[:idx], st.Registries[idx+1:]...)
		return nil
	})
	if err == nil {
		s.emitStateChanged("registry:deleted")
	}
	return err
}

// InstallRegistryItem downloads and installs a skill discovered in an online registry.
func (s *SkillsService) InstallRegistryItem(item model.RegistryItem) (model.Skill, error) {
	st := s.store.StateSnapshot()
	paths := s.store.Paths()

	var installed model.Skill
	err := s.store.Update(func(appSt *model.AppState) error {
		sk, updated, err := repo.InstallFromRegistryItem(item, paths.Repos, paths.Store, appSt.Skills, st.Settings)
		if err != nil {
			return err
		}
		if updated {
			for i := range appSt.Skills {
				if appSt.Skills[i].ID == sk.ID {
					appSt.Skills[i] = sk
					break
				}
			}
			deployer.SyncAll(appSt, paths.Guides)
		} else {
			appSt.Skills = append(appSt.Skills, sk)
		}
		installed = sk
		return nil
	})
	if err == nil {
		s.emitStateChanged("registry:installed")
	}
	return installed, err
}

// SyncAll reconciles all Global, User, and Project deployments cleanly.
func (s *SkillsService) SyncAll() (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		summary = deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged("sync:all")
		if s.hooks != nil && s.hooks.App != nil {
			s.hooks.App.Event.Emit("sync:completed", fmt.Sprintf("+%d / ~%d / -%d", summary.Created, summary.Updated, summary.Removed))
		}
	}
	return summary, err
}

// SyncProject reconciles deployments for a single project.
func (s *SkillsService) SyncProject(projectID string) (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		summary = deployer.SyncProject(st, guidesDir, projectID)
		return nil
	})
	if err == nil {
		s.emitStateChanged("sync:project")
	}
	return summary, err
}

// CheckHealth scans all tracked deployments and conflicts for broken junctions or content drift.
func (s *SkillsService) CheckHealth() []model.HealthIssue {
	st := s.store.StateSnapshot()
	return deployer.CheckHealth(st)
}

// ResolveConflictBackup moves an unmanaged conflicting folder into backups/ and re-syncs.
func (s *SkillsService) ResolveConflictBackup(targetPath string) (model.SyncSummary, error) {
	var summary model.SyncSummary
	paths := s.store.Paths()
	err := s.store.Update(func(st *model.AppState) error {
		var rerr error
		summary, rerr = deployer.ResolveConflictBackupOverwrite(st, targetPath, paths.Backups, paths.Guides)
		return rerr
	})
	if err == nil {
		s.emitStateChanged("conflict:backup")
	}
	return summary, err
}

// ResolveConflictAdopt imports an unmanaged conflicting folder into the central store and re-syncs.
func (s *SkillsService) ResolveConflictAdopt(targetPath string) (model.SyncSummary, error) {
	var summary model.SyncSummary
	paths := s.store.Paths()
	err := s.store.Update(func(st *model.AppState) error {
		_, sum, rerr := deployer.ResolveConflictAdopt(st, targetPath, paths.Store, paths.Guides)
		summary = sum
		return rerr
	})
	if err == nil {
		s.emitStateChanged("conflict:adopt")
	}
	return summary, err
}

// ForceSyncDrift overwrites a locally drifted copy-mode folder with the canonical store copy.
func (s *SkillsService) ForceSyncDrift(targetPath string) (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		var ferr error
		summary, ferr = deployer.ForceSyncDrift(st, targetPath, guidesDir)
		return ferr
	})
	if err == nil {
		s.emitStateChanged("drift:synced")
	}
	return summary, err
}

// SaveSettings updates user preferences, syncs Windows autostart registry, theme, and optional custom store root.
func (s *SkillsService) SaveSettings(settings model.Settings) (model.AppSnapshot, error) {
	oldSnap := s.store.StateSnapshot()
	if settings.CheckIntervalMinutes <= 0 {
		settings.CheckIntervalMinutes = 60
	}
	if err := winutil.SetAutoStart(settings.AutoStart); err != nil {
		return model.AppSnapshot{}, err
	}

	err := s.store.Update(func(st *model.AppState) error {
		st.Settings = settings
		return nil
	})
	if err != nil {
		return model.AppSnapshot{}, err
	}

	if !s.store.Paths().Portable && strings.TrimSpace(settings.CustomStoreRoot) != strings.TrimSpace(oldSnap.Settings.CustomStoreRoot) {
		if switchErr := s.store.SwitchRoot(strings.TrimSpace(settings.CustomStoreRoot)); switchErr != nil {
			return model.AppSnapshot{}, switchErr
		}
		_ = s.store.Update(func(st *model.AppState) error {
			st.Settings = settings
			return nil
		})
	}

	if s.hooks != nil {
		if s.hooks.SetCloseTray != nil {
			s.hooks.SetCloseTray(settings.CloseToTray)
		}
		if s.hooks.ApplyTheme != nil {
			s.hooks.ApplyTheme(settings.Theme)
		}
	}
	s.emitStateChanged("settings:saved")
	return s.GetSnapshot(), nil
}

// PickStoreRootFolder opens a native folder picker for configuring a custom store root.
func (s *SkillsService) PickStoreRootFolder() (string, error) {
	if s.hooks == nil || s.hooks.App == nil {
		return "", errors.New("dialog runtime not initialized")
	}
	dlg := s.hooks.App.Dialog.OpenFile().
		SetTitle("选择中央 Skills 库目录").
		CanChooseDirectories(true).
		CanChooseFiles(false)
	if s.hooks.MainWindow != nil {
		dlg.AttachToWindow(s.hooks.MainWindow)
	}
	return dlg.PromptForSingleSelection()
}

// OpenStoreFolder opens the active central data root in Windows Explorer.
func (s *SkillsService) OpenStoreFolder() error {
	return winutil.OpenInExplorer(s.store.Paths().Root)
}

type docsLaunchPref struct {
	Tab   string `json:"tab"`
	Lang  string `json:"lang"`
	Theme string `json:"theme"`
	Ts    int64  `json:"ts"`
}

const docsLaunchPlaceholder = "/*__SKILLSMAN_LAUNCH_PREF__*/null"

// BuildLaunchDocsHTML injects whitelisted launch preferences into the embedded documentation HTML.
func BuildLaunchDocsHTML(template []byte, tab, lang, theme string, ts int64) []byte {
	normTab := "guide"
	if tab == "features" {
		normTab = "features"
	}
	normLang := "zh-CN"
	if lang == "en-US" {
		normLang = "en-US"
	}
	normTheme := "system"
	switch theme {
	case "light", "dark", "system":
		normTheme = theme
	}

	payload, err := json.Marshal(docsLaunchPref{
		Tab:   normTab,
		Lang:  normLang,
		Theme: normTheme,
		Ts:    ts,
	})
	if err != nil {
		return template
	}
	return bytes.Replace(template, []byte(docsLaunchPlaceholder), payload, 1)
}

// OpenDocsInBrowser materializes the embedded offline documentation with current UI preferences and opens it in the browser.
func (s *SkillsService) OpenDocsInBrowser(tab, lang, theme string) error {
	if len(docs.IndexHTML) == 0 {
		return errors.New("embedded documentation is empty")
	}
	st := s.store.StateSnapshot()
	if strings.TrimSpace(lang) == "" {
		lang = string(st.Settings.Language)
	}
	if strings.TrimSpace(theme) == "" {
		theme = string(st.Settings.Theme)
	}

	docsDir := filepath.Join(s.store.Paths().Root, "docs")
	if err := os.MkdirAll(docsDir, 0755); err != nil {
		return err
	}
	outPath := filepath.Join(docsDir, "index.html")
	html := BuildLaunchDocsHTML(docs.IndexHTML, tab, lang, theme, time.Now().UnixMilli())
	if err := os.WriteFile(outPath, html, 0644); err != nil {
		return err
	}
	return winutil.OpenInBrowser(outPath)
}

// WindowMinimize minimizes the main window.
func (s *SkillsService) WindowMinimize() {
	if s.hooks != nil && s.hooks.MainWindow != nil {
		s.hooks.MainWindow.Minimise()
	}
}

// WindowToggleMaximize toggles maximize/restore state of the main window.
func (s *SkillsService) WindowToggleMaximize() {
	if s.hooks != nil && s.hooks.MainWindow != nil {
		s.hooks.MainWindow.ToggleMaximise()
	}
}

// WindowHideOrClose hides the main window to tray when CloseToTray is enabled, or quits otherwise.
func (s *SkillsService) WindowHideOrClose() {
	if s.hooks == nil || s.hooks.MainWindow == nil {
		return
	}
	st := s.store.StateSnapshot()
	if st.Settings.CloseToTray {
		s.hooks.MainWindow.Hide()
		return
	}
	if s.hooks.App != nil {
		s.hooks.App.Quit()
	}
}

func (s *SkillsService) mutateAndSync(reason string, fn func(*model.AppState) error) (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		if err := fn(st); err != nil {
			return err
		}
		summary = deployer.SyncAll(st, guidesDir)
		return nil
	})
	if err == nil {
		s.emitStateChanged(reason)
	}
	return summary, err
}

func (s *SkillsService) mutateProjectAndSync(projectID, reason string, fn func(*model.Project)) (model.SyncSummary, error) {
	var summary model.SyncSummary
	guidesDir := s.store.Paths().Guides
	err := s.store.Update(func(st *model.AppState) error {
		idx := -1
		for i := range st.Projects {
			if st.Projects[i].ID == projectID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("project not found: %s", projectID)
		}
		fn(&st.Projects[idx])
		summary = deployer.SyncProject(st, guidesDir, projectID)
		return nil
	})
	if err == nil {
		s.emitStateChanged(reason)
	}
	return summary, err
}

func uniqueSkillSlug(existing []model.Skill, base, storeRoot string) string {
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

func appendUniqueStr(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

func removeStr(slice []string, item string) []string {
	out := make([]string, 0, len(slice))
	for _, s := range slice {
		if s != item {
			out = append(out, s)
		}
	}
	return out
}

func markInstalledDiscovered(skills []model.Skill, r *model.RepoSource) {
	bySubpath := make(map[string]string)
	for _, sk := range skills {
		if sk.SourceRepoID == r.ID {
			bySubpath[filepath.ToSlash(sk.SourceSubpath)] = sk.ID
		}
	}
	for i := range r.DiscoveredSkills {
		r.DiscoveredSkills[i].InstalledSkillID = bySubpath[filepath.ToSlash(r.DiscoveredSkills[i].Subpath)]
	}
}
