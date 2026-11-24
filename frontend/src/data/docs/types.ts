export type DocLocale = 'zh-CN' | 'en-US';

export type DocTab = 'guide' | 'features';

export type AppNavTarget =
  | 'dashboard'
  | 'matrix'
  | 'library'
  | 'workflows'
  | 'projects'
  | 'repos'
  | 'agents'
  | 'settings'
  | 'docs';

export interface ConceptCard {
  id: string;
  badge: string;
  title: string;
  analogy: string;
  summary: string;
  details: string[];
}

export interface ScopeLayerDoc {
  id: 'store' | 'global' | 'user' | 'project';
  badge: string;
  title: string;
  pathHint: string;
  meaning: string;
  whenToUse: string;
  ruleSummary: string;
}

export interface MatrixBadgeLegend {
  id: string;
  label: string;
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  meaning: string;
  clickAction: string;
}

export interface TutorialStep {
  title: string;
  detail: string;
  uiPath: string;
  targetTab?: AppNavTarget;
  targetLabel?: string;
  tip?: string;
}

export interface TutorialCase {
  id: string;
  badge: string;
  title: string;
  duration: string;
  scenario: string;
  goal: string;
  steps: TutorialStep[];
  verify: string;
  advancedNote: {
    title: string;
    bullets: string[];
  };
  relatedRoles: string[];
}

export interface RoleTrack {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  persona: string;
  outcome: string;
  recommendedCaseIds: string[];
  checklist: {
    label: string;
    caseId: string;
    targetTab?: AppNavTarget;
  }[];
}

export interface FeatureControlDoc {
  name: string;
  desc: string;
}

export interface FeatureModuleDoc {
  id: string;
  navTab: AppNavTarget;
  badge: string;
  title: string;
  summary: string;
  controls: FeatureControlDoc[];
  tips: string[];
}

export interface MechanismTableRow {
  cols: string[];
}

export interface MechanismSection {
  id: string;
  badge: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
  table?: {
    headers: string[];
    rows: MechanismTableRow[];
  };
  codeBlock?: {
    label: string;
    code: string;
  };
}

export interface AgentPresetDoc {
  id: string;
  name: string;
  userSkillsDir: string;
  projectSkillsRelDir: string;
  defaultMode: 'junction' | 'copy';
  detectNotesZh: string;
  detectNotesEn: string;
}

export interface SkillTemplateDoc {
  id: string;
  badge: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  code: string;
}

export interface LocalizedDocs {
  locale: DocLocale;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    tabGuide: string;
    tabFeatures: string;
    openBrowserBtn: string;
    searchPlaceholder: string;
    progressLabel: string;
    resetProgressBtn: string;
  };
  sandbox: {
    badge: string;
    title: string;
    descReady: string;
    descExists: string;
    createBtn: string;
    openDrawerBtn: string;
    goMatrixBtn: string;
    cleanupBtn: string;
    createdToast: string;
    cleanedToast: string;
  };
  guide: {
    conceptsTitle: string;
    conceptsSubtitle: string;
    concepts: ConceptCard[];
    scopeDiagramTitle: string;
    scopeDiagramSubtitle: string;
    scopeLayers: ScopeLayerDoc[];
    matrixLegendTitle: string;
    matrixLegendSubtitle: string;
    matrixLegend: MatrixBadgeLegend[];
    routeSwitchLabelA: string;
    routeSwitchLabelB: string;
    routeADesc: string;
    routeBDesc: string;
    cases: TutorialCase[];
    roles: RoleTrack[];
    roleGoCaseBtn: string;
    templatesTitle: string;
    templatesSubtitle: string;
    copyBtn: string;
    copiedText: string;
    stepJumpPrefix: string;
    verifyLabel: string;
    doneCheckboxLabel: string;
    doneBadge: string;
  };
  features: {
    tocModulesTitle: string;
    tocMechanismsTitle: string;
    tocAgentsTitle: string;
    modulesTitle: string;
    modulesSubtitle: string;
    openPageBtn: string;
    tipsLabel: string;
    modules: FeatureModuleDoc[];
    agentsTitle: string;
    agentsSubtitle: string;
    agentsHeaders: [string, string, string, string, string];
    mechanismsTitle: string;
    mechanismsSubtitle: string;
    mechanisms: MechanismSection[];
  };
  ui: {
    noSearchMatches: string;
    clearSearch: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    langSwitchLabel: string;
    offlineBadge: string;
  };
}
