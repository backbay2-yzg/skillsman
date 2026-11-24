package model

// DeployMode specifies how a skill directory is materialized in an agent or project folder.
type DeployMode string

const (
	DeployJunction DeployMode = "junction"
	DeployCopy     DeployMode = "copy"
)

// ScopeKind identifies the assignment tier.
type ScopeKind string

const (
	ScopeGlobal  ScopeKind = "global"
	ScopeUser    ScopeKind = "user"
	ScopeProject ScopeKind = "project"
)

// ThemeMode configures UI color mode.
type ThemeMode string

const (
	ThemeSystem ThemeMode = "system"
	ThemeLight  ThemeMode = "light"
	ThemeDark   ThemeMode = "dark"
)

// Language configures UI localization.
type Language string

const (
	LangZhCN Language = "zh-CN"
	LangEnUS Language = "en-US"
)

// Skill represents a canonical skill package stored inside SkillsMan's central store.
type Skill struct {
	ID            string   `json:"id"`
	Slug          string   `json:"slug"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Author        string   `json:"author,omitempty"`
	Tags          []string `json:"tags"`
	SourceType    string   `json:"sourceType"` // "local" | "git" | "registry" | "adopted"
	SourceRepoID  string   `json:"sourceRepoId,omitempty"`
	SourceSubpath string   `json:"sourceSubpath,omitempty"`
	SourceURL     string   `json:"sourceUrl,omitempty"`
	Version       string   `json:"version,omitempty"`
	CommitHash    string   `json:"commitHash,omitempty"`
	HasUpdate     bool     `json:"hasUpdate"`
	RemoteCommit  string   `json:"remoteCommit,omitempty"`
	StorePath     string   `json:"storePath"`
	ContentHash   string   `json:"contentHash"`
	CreatedAt     string   `json:"createdAt"`
	UpdatedAt     string   `json:"updatedAt"`
	Files         []string `json:"files"`
}

// SkillContent holds editable metadata and Markdown body for a skill.
type SkillContent struct {
	SkillID     string   `json:"skillId"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Author      string   `json:"author,omitempty"`
	Version     string   `json:"version,omitempty"`
	Tags        []string `json:"tags"`
	Body        string   `json:"body"`
	RawMarkdown string   `json:"rawMarkdown"`
	StorePath   string   `json:"storePath"`
	Files       []string `json:"files"`
}

// AgentProfile defines an AI coding agent and its user-level + project-level skill directories.
type AgentProfile struct {
	ID                     string     `json:"id"`
	Name                   string     `json:"name"`
	Icon                   string     `json:"icon"`
	Builtin                bool       `json:"builtin"`
	Enabled                bool       `json:"enabled"`
	Detected               bool       `json:"detected"`
	UserSkillsDir          string     `json:"userSkillsDir"`
	ProjectSkillsRelDir    string     `json:"projectSkillsRelDir"`
	DefaultDeployMode      DeployMode `json:"defaultDeployMode"`
	GlobalMutedSkillIDs    []string   `json:"globalMutedSkillIds"`
	GlobalMutedWorkflowIDs []string   `json:"globalMutedWorkflowIds"`
	UserSkillIDs           []string   `json:"userSkillIds"`
	UserWorkflowIDs        []string   `json:"userWorkflowIds"`
	WorkflowGuideEnabled   bool       `json:"workflowGuideEnabled"`
}

// ProjectAgentOverride stores per-agent overrides inside a specific project.
type ProjectAgentOverride struct {
	DeployMode        string   `json:"deployMode,omitempty"` // "" | "junction" | "copy"
	ExtraSkillIDs     []string `json:"extraSkillIds"`
	MutedSkillIDs     []string `json:"mutedSkillIds"`
	ExtraWorkflowIDs  []string `json:"extraWorkflowIds"`
	MutedWorkflowIDs  []string `json:"mutedWorkflowIds"`
}

// Project represents a local code repository/workspace with independent skill & workflow configuration.
type Project struct {
	ID                   string                          `json:"id"`
	Name                 string                          `json:"name"`
	Path                 string                          `json:"path"`
	EnabledAgentIDs      []string                        `json:"enabledAgentIds"`
	WorkflowIDs          []string                        `json:"workflowIds"`
	DirectSkillIDs       []string                        `json:"directSkillIds"`
	ExcludedSkillIDs     []string                        `json:"excludedSkillIds"`
	AgentOverrides       map[string]ProjectAgentOverride `json:"agentOverrides"`
	DeployModeOverride   string                          `json:"deployModeOverride"` // "" | "junction" | "copy"
	ManageGitignore      bool                            `json:"manageGitignore"`
	WorkflowGuideEnabled bool                            `json:"workflowGuideEnabled"`
	LastSyncedAt         string                          `json:"lastSyncedAt,omitempty"`
}

// WorkflowStage groups skills under an ordered execution phase.
type WorkflowStage struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Order       int      `json:"order"`
	SkillIDs    []string `json:"skillIds"`
}

// Workflow represents a reusable staged workflow stack of skills.
type Workflow struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Description   string          `json:"description"`
	Color         string          `json:"color"`
	Stages        []WorkflowStage `json:"stages"`
	GenerateGuide bool            `json:"generateGuide"`
	CreatedAt     string          `json:"createdAt"`
	UpdatedAt     string          `json:"updatedAt"`
}

// GlobalAssignment stores skills and workflows bound globally across enabled agents.
type GlobalAssignment struct {
	SkillIDs    []string `json:"skillIds"`
	WorkflowIDs []string `json:"workflowIds"`
}

// DiscoveredSkill is a skill directory found inside a Git repository source.
type DiscoveredSkill struct {
	Slug             string `json:"slug"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	Subpath          string `json:"subpath"`
	Tags             []string `json:"tags"`
	InstalledSkillID string `json:"installedSkillId,omitempty"`
}

// RepoSource tracks a Git/GitHub skill repository (single skill or monorepo).
type RepoSource struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	URL              string            `json:"url"`
	Branch           string            `json:"branch"`
	LastCommit       string            `json:"lastCommit,omitempty"`
	RemoteCommit     string            `json:"remoteCommit,omitempty"`
	HasUpdate        bool              `json:"hasUpdate"`
	LastCheckedAt    string            `json:"lastCheckedAt,omitempty"`
	DiscoveredSkills []DiscoveredSkill `json:"discoveredSkills"`
	CachePath        string            `json:"cachePath"`
}

// RegistrySource configures an online skills registry index.
type RegistrySource struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"` // "skills.sh" | "custom-json"
	URL     string `json:"url"`
	Enabled bool   `json:"enabled"`
	Builtin bool   `json:"builtin"`
}

// RegistryItem represents a downloadable skill entry returned by an online registry.
type RegistryItem struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Author      string   `json:"author,omitempty"`
	RepoURL     string   `json:"repoUrl"`
	Subpath     string   `json:"subpath,omitempty"`
	Installs    int      `json:"installs"`
	Tags        []string `json:"tags"`
	RegistryID  string   `json:"registryId"`
}

// DeploymentRecord tracks a single materialized directory or workflow guide managed by SkillsMan.
type DeploymentRecord struct {
	Key             string     `json:"key"`
	TargetPath      string     `json:"targetPath"`
	SkillID         string     `json:"skillId"`
	SkillSlug       string     `json:"skillSlug"`
	AgentID         string     `json:"agentId"`
	Scope           ScopeKind  `json:"scope"`
	ProjectID       string     `json:"projectId,omitempty"`
	Mode            DeployMode `json:"mode"`
	SourceStorePath string     `json:"sourceStorePath"`
	DeployedHash    string     `json:"deployedHash"`
	IsWorkflowGuide bool       `json:"isWorkflowGuide,omitempty"`
	WorkflowID      string     `json:"workflowId,omitempty"`
	SyncedAt        string     `json:"syncedAt"`
}

// ConflictItem records an unmanaged existing target directory that SkillsMan refused to overwrite.
type ConflictItem struct {
	TargetPath string    `json:"targetPath"`
	SkillID    string    `json:"skillId"`
	SkillSlug  string    `json:"skillSlug"`
	AgentID    string    `json:"agentId"`
	Scope      ScopeKind `json:"scope"`
	ProjectID  string    `json:"projectId,omitempty"`
	Reason     string    `json:"reason"`
	DetectedAt string    `json:"detectedAt"`
}

// HealthIssue describes a detected broken link, content drift, missing target, or conflict.
type HealthIssue struct {
	Kind       string    `json:"kind"` // "broken-junction" | "drift" | "conflict" | "missing-target" | "orphaned"
	TargetPath string    `json:"targetPath"`
	SkillID    string    `json:"skillId"`
	SkillSlug  string    `json:"skillSlug"`
	AgentID    string    `json:"agentId"`
	Scope      ScopeKind `json:"scope"`
	ProjectID  string    `json:"projectId,omitempty"`
	Message    string    `json:"message"`
}

// Settings holds user preferences, storage options, proxy settings, and tray behavior.
type Settings struct {
	Theme                ThemeMode `json:"theme"`
	FollowSystemAccent   bool      `json:"followSystemAccent"`
	Language             Language  `json:"language"`
	CustomStoreRoot      string    `json:"customStoreRoot"`
	CloseToTray          bool      `json:"closeToTray"`
	AutoStart            bool      `json:"autoStart"`
	AutoCheckUpdates     bool      `json:"autoCheckUpdates"`
	CheckIntervalMinutes int       `json:"checkIntervalMinutes"`
	HTTPProxy            string    `json:"httpProxy"`
	GitHubMirror         string    `json:"githubMirror"`
	GitHubToken          string    `json:"githubToken"`
	DefaultEditor        string    `json:"defaultEditor"`
}

// EffectiveSkillEntry represents the resolved assignment state of a skill for an agent within a scope.
type EffectiveSkillEntry struct {
	SkillID    string     `json:"skillId"`
	SkillSlug  string     `json:"skillSlug"`
	SkillName  string     `json:"skillName"`
	Active     bool       `json:"active"`
	Muted      bool       `json:"muted"`
	Sources    []string   `json:"sources"`
	DeployMode DeployMode `json:"deployMode"`
	Status     string     `json:"status"` // "synced" | "pending" | "drift" | "conflict" | "broken" | "inactive"
	TargetPath string     `json:"targetPath"`
}

// MatrixCell summarizes a row x agent cell in the Assignment Matrix.
type MatrixCell struct {
	AgentID    string     `json:"agentId"`
	RowID      string     `json:"rowId"`
	Active     bool       `json:"active"`
	Direct     bool       `json:"direct"`
	Inherited  bool       `json:"inherited"`
	Muted      bool       `json:"muted"`
	Sources    []string   `json:"sources"`
	DeployMode DeployMode `json:"deployMode"`
	Status     string     `json:"status"`
	TargetPath string     `json:"targetPath"`
}

// MatrixRow represents either a skill or workflow row in the Assignment Matrix.
type MatrixRow struct {
	ID          string       `json:"id"`
	Kind        string       `json:"kind"` // "skill" | "workflow"
	Slug        string       `json:"slug"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Color       string       `json:"color,omitempty"`
	GlobalBound bool         `json:"globalBound"`
	Cells       []MatrixCell `json:"cells"`
}

// MatrixSnapshot is returned to the UI for the Global/User/Project Matrix page.
type MatrixSnapshot struct {
	Scope     ScopeKind      `json:"scope"`
	ProjectID string         `json:"projectId,omitempty"`
	Agents    []AgentProfile `json:"agents"`
	Rows      []MatrixRow    `json:"rows"`
}

// SkillTraceItem shows where a specific skill is currently active or muted across scopes.
type SkillTraceItem struct {
	Scope      ScopeKind  `json:"scope"`
	AgentID    string     `json:"agentId"`
	AgentName  string     `json:"agentName"`
	ProjectID  string     `json:"projectId,omitempty"`
	Project    string     `json:"projectName,omitempty"`
	Active     bool       `json:"active"`
	Muted      bool       `json:"muted"`
	Sources    []string   `json:"sources"`
	DeployMode DeployMode `json:"deployMode"`
	Status     string     `json:"status"`
	TargetPath string     `json:"targetPath"`
}

// LocalDetectedSkill represents an unmanaged skill found in an agent's directory.
type LocalDetectedSkill struct {
	Path        string   `json:"path"`
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	AgentID     string   `json:"agentId"`
	AgentName   string   `json:"agentName"`
	AlreadyInDB bool     `json:"alreadyInDb"`
}

// SyncSummary reports the outcome of a deployment sync pass.
type SyncSummary struct {
	Created   int            `json:"created"`
	Updated   int            `json:"updated"`
	Removed   int            `json:"removed"`
	Skipped   int            `json:"skipped"`
	Conflicts []ConflictItem `json:"conflicts"`
	Errors    []string       `json:"errors"`
	SyncedAt  string         `json:"syncedAt"`
}

// SystemThemeInfo conveys Windows OS dark/light mode and DWM accent color.
type SystemThemeInfo struct {
	IsDark      bool   `json:"isDark"`
	AccentColor string `json:"accentColor"`
}

// AppState is the persisted root document in state.json.
type AppState struct {
	Version     int                         `json:"version"`
	Skills      []Skill                     `json:"skills"`
	Agents      []AgentProfile              `json:"agents"`
	Projects    []Project                   `json:"projects"`
	Workflows   []Workflow                  `json:"workflows"`
	Global      GlobalAssignment            `json:"global"`
	Repos       []RepoSource                `json:"repos"`
	Registries  []RegistrySource            `json:"registries"`
	Deployments map[string]DeploymentRecord `json:"deployments"`
	Conflicts   []ConflictItem              `json:"conflicts"`
	Settings    Settings                    `json:"settings"`
}

// AppSnapshot is the full runtime payload returned to the frontend.
type AppSnapshot struct {
	State       AppState        `json:"state"`
	StoreRoot   string          `json:"storeRoot"`
	Portable    bool            `json:"portable"`
	SystemTheme SystemThemeInfo `json:"systemTheme"`
	AppVersion  string          `json:"appVersion"`
}
