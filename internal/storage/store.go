package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"skillsman/internal/agents"
	"skillsman/internal/model"
)

// Store manages the thread-safe persisted AppState and canonical file directories.
type Store struct {
	mu    sync.RWMutex
	paths Paths
	state model.AppState
}

// NewStore opens or initializes the store at the resolved root directory.
func NewStore(customRoot string) (*Store, error) {
	root, portable := ResolveRoot(customRoot)
	paths, err := BuildPaths(root, portable)
	if err != nil {
		return nil, err
	}
	s := &Store{paths: paths}
	if err := s.loadOrInit(); err != nil {
		return nil, err
	}
	return s, nil
}

// Paths returns a copy of the resolved storage paths.
func (s *Store) Paths() Paths {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.paths
}

// StateSnapshot returns a deep-cloned copy of the current AppState.
func (s *Store) StateSnapshot() model.AppState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneState(s.state)
}

// Read executes a read-only callback under the store read lock.
func (s *Store) Read(fn func(state *model.AppState)) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	fn(&s.state)
}

// Update executes a mutating callback under write lock and persists state atomically.
func (s *Store) Update(fn func(state *model.AppState) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	snapshot := cloneState(s.state)
	if err := fn(&s.state); err != nil {
		s.state = snapshot
		return err
	}
	normalizeState(&s.state)
	if err := s.saveLocked(); err != nil {
		s.state = snapshot
		return err
	}
	return nil
}

// SwitchRoot relocates the active root paths and reloads or migrates state.
func (s *Store) SwitchRoot(newCustomRoot string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.paths.Portable {
		if err := SaveBootstrapCustomRoot(newCustomRoot); err != nil {
			return err
		}
	}

	root, portable := ResolveRoot(newCustomRoot)
	newPaths, err := BuildPaths(root, portable)
	if err != nil {
		return err
	}
	s.paths = newPaths
	s.state.Settings.CustomStoreRoot = newCustomRoot

	if _, err := os.Stat(newPaths.State); errors.Is(err, os.ErrNotExist) {
		return s.saveLocked()
	}
	return s.loadLocked()
}

func (s *Store) loadOrInit() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := os.Stat(s.paths.State); errors.Is(err, os.ErrNotExist) {
		s.state = defaultInitialState()
		return s.saveLocked()
	}
	if err := s.loadLocked(); err != nil {
		return err
	}
	// Merge any new builtin agents added in newer versions
	changed := mergeMissingBuiltinAgents(&s.state)
	normalizeState(&s.state)
	if changed {
		return s.saveLocked()
	}
	return nil
}

func (s *Store) loadLocked() error {
	data, err := os.ReadFile(s.paths.State)
	if err != nil {
		return err
	}
	var loaded model.AppState
	if err := json.Unmarshal(data, &loaded); err != nil {
		return err
	}
	normalizeState(&loaded)
	s.state = loaded
	return nil
}

func (s *Store) saveLocked() error {
	normalizeState(&s.state)
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	tmpPath := s.paths.State + ".tmp"
	f, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	if _, err := f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err := f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.paths.State)
}

func defaultInitialState() model.AppState {
	now := time.Now().Format(time.RFC3339)
	detectedAgents := agents.DetectInstalledAgents(agents.BuiltinPresets(), true)
	hasAnyEnabled := false
	for _, a := range detectedAgents {
		if a.Enabled {
			hasAnyEnabled = true
			break
		}
	}
	if !hasAnyEnabled && len(detectedAgents) > 0 {
		detectedAgents[0].Enabled = true
	}

	st := model.AppState{
		Version: 1,
		Skills:  []model.Skill{},
		Agents:  detectedAgents,
		Projects: []model.Project{},
		Workflows: []model.Workflow{
			{
				ID:            "wf-fullstack-default",
				Name:          "全栈标准开发流",
				Slug:          "fullstack-standard",
				Description:   "按「规划 → 开发 → 测试 → 审查」四阶段组织项目常用 Skills，可自由分配给全局、单 Agent 或项目。",
				Color:         "#0078D4",
				GenerateGuide: false,
				Stages: []model.WorkflowStage{
					{ID: "stg-plan", Name: "规划设计", Order: 1, SkillIDs: []string{}},
					{ID: "stg-dev", Name: "编码实现", Order: 2, SkillIDs: []string{}},
					{ID: "stg-test", Name: "测试验证", Order: 3, SkillIDs: []string{}},
					{ID: "stg-review", Name: "审查交付", Order: 4, SkillIDs: []string{}},
				},
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
		Global: model.GlobalAssignment{
			SkillIDs:    []string{},
			WorkflowIDs: []string{},
		},
		Repos: []model.RepoSource{
			{
				ID:               "repo-anthropics-skills",
				Name:             "Anthropic Official Skills",
				URL:              "https://github.com/anthropics/skills.git",
				Branch:           "main",
				DiscoveredSkills: []model.DiscoveredSkill{},
			},
			{
				ID:               "repo-vercel-agent-skills",
				Name:             "Vercel Labs Agent Skills",
				URL:              "https://github.com/vercel-labs/agent-skills.git",
				Branch:           "main",
				DiscoveredSkills: []model.DiscoveredSkill{},
			},
		},
		Registries: []model.RegistrySource{
			{
				ID:      "reg-skills-sh",
				Name:    "skills.sh 在线市场",
				Kind:    "skills.sh",
				URL:     "https://skills.sh",
				Enabled: true,
				Builtin: true,
			},
		},
		Deployments: map[string]model.DeploymentRecord{},
		Conflicts:   []model.ConflictItem{},
		Settings: model.Settings{
			Theme:                model.ThemeSystem,
			FollowSystemAccent:   true,
			Language:             model.LangZhCN,
			CloseToTray:          true,
			AutoStart:            false,
			AutoCheckUpdates:     true,
			CheckIntervalMinutes: 60,
		},
	}
	normalizeState(&st)
	return st
}

func mergeMissingBuiltinAgents(st *model.AppState) bool {
	existing := make(map[string]struct{}, len(st.Agents))
	for _, a := range st.Agents {
		existing[a.ID] = struct{}{}
	}
	changed := false
	for _, preset := range agents.DetectInstalledAgents(agents.BuiltinPresets(), true) {
		if _, ok := existing[preset.ID]; !ok {
			st.Agents = append(st.Agents, preset)
			changed = true
		}
	}
	return changed
}

func normalizeState(st *model.AppState) {
	if st.Version == 0 {
		st.Version = 1
	}
	if st.Skills == nil {
		st.Skills = []model.Skill{}
	}
	for i := range st.Skills {
		if st.Skills[i].Tags == nil {
			st.Skills[i].Tags = []string{}
		}
		if st.Skills[i].Files == nil {
			st.Skills[i].Files = []string{}
		}
	}
	if st.Agents == nil {
		st.Agents = []model.AgentProfile{}
	}
	for i := range st.Agents {
		if st.Agents[i].GlobalMutedSkillIDs == nil {
			st.Agents[i].GlobalMutedSkillIDs = []string{}
		}
		if st.Agents[i].GlobalMutedWorkflowIDs == nil {
			st.Agents[i].GlobalMutedWorkflowIDs = []string{}
		}
		if st.Agents[i].UserSkillIDs == nil {
			st.Agents[i].UserSkillIDs = []string{}
		}
		if st.Agents[i].UserWorkflowIDs == nil {
			st.Agents[i].UserWorkflowIDs = []string{}
		}
		if st.Agents[i].DefaultDeployMode == "" {
			st.Agents[i].DefaultDeployMode = model.DeployJunction
		}
	}
	if st.Projects == nil {
		st.Projects = []model.Project{}
	}
	for i := range st.Projects {
		if st.Projects[i].EnabledAgentIDs == nil {
			st.Projects[i].EnabledAgentIDs = []string{}
		}
		if st.Projects[i].WorkflowIDs == nil {
			st.Projects[i].WorkflowIDs = []string{}
		}
		if st.Projects[i].DirectSkillIDs == nil {
			st.Projects[i].DirectSkillIDs = []string{}
		}
		if st.Projects[i].ExcludedSkillIDs == nil {
			st.Projects[i].ExcludedSkillIDs = []string{}
		}
		if st.Projects[i].AgentOverrides == nil {
			st.Projects[i].AgentOverrides = map[string]model.ProjectAgentOverride{}
		}
		for k, ov := range st.Projects[i].AgentOverrides {
			if ov.ExtraSkillIDs == nil {
				ov.ExtraSkillIDs = []string{}
			}
			if ov.MutedSkillIDs == nil {
				ov.MutedSkillIDs = []string{}
			}
			if ov.ExtraWorkflowIDs == nil {
				ov.ExtraWorkflowIDs = []string{}
			}
			if ov.MutedWorkflowIDs == nil {
				ov.MutedWorkflowIDs = []string{}
			}
			st.Projects[i].AgentOverrides[k] = ov
		}
	}
	if st.Workflows == nil {
		st.Workflows = []model.Workflow{}
	}
	for i := range st.Workflows {
		if st.Workflows[i].Stages == nil {
			st.Workflows[i].Stages = []model.WorkflowStage{}
		}
		for j := range st.Workflows[i].Stages {
			if st.Workflows[i].Stages[j].SkillIDs == nil {
				st.Workflows[i].Stages[j].SkillIDs = []string{}
			}
		}
	}
	if st.Global.SkillIDs == nil {
		st.Global.SkillIDs = []string{}
	}
	if st.Global.WorkflowIDs == nil {
		st.Global.WorkflowIDs = []string{}
	}
	if st.Repos == nil {
		st.Repos = []model.RepoSource{}
	}
	for i := range st.Repos {
		if st.Repos[i].DiscoveredSkills == nil {
			st.Repos[i].DiscoveredSkills = []model.DiscoveredSkill{}
		}
		for j := range st.Repos[i].DiscoveredSkills {
			if st.Repos[i].DiscoveredSkills[j].Tags == nil {
				st.Repos[i].DiscoveredSkills[j].Tags = []string{}
			}
		}
	}
	if st.Registries == nil {
		st.Registries = []model.RegistrySource{}
	}
	if st.Deployments == nil {
		st.Deployments = map[string]model.DeploymentRecord{}
	}
	if st.Conflicts == nil {
		st.Conflicts = []model.ConflictItem{}
	}
	if st.Settings.Theme == "" {
		st.Settings.Theme = model.ThemeSystem
	}
	if st.Settings.Language == "" {
		st.Settings.Language = model.LangZhCN
	}
	if st.Settings.CheckIntervalMinutes <= 0 {
		st.Settings.CheckIntervalMinutes = 60
	}
}

func cloneState(st model.AppState) model.AppState {
	b, _ := json.Marshal(st)
	var copySt model.AppState
	_ = json.Unmarshal(b, &copySt)
	normalizeState(&copySt)
	return copySt
}

// SkillStorePath computes the canonical folder path for a skill slug inside store/.
func (s *Store) SkillStorePath(slug string) string {
	return filepath.Join(s.Paths().Store, slug)
}
