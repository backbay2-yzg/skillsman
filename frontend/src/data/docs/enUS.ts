import type { LocalizedDocs } from './types.ts';

export const EN_US_DOCS: LocalizedDocs = {
  locale: 'en-US',
  hero: {
    badge: 'Zero-to-Hero Guide · Full Feature Reference',
    title: 'SkillsMan Guide & Feature Documentation',
    subtitle:
      'Whether you are brand new to AI Skills or juggling Cursor, Claude Code, and Antigravity across multiple repositories, learn how to centralize, isolate, and sync everything in minutes.',
    tabGuide: 'Beginner Tutorials',
    tabFeatures: 'Feature Manual',
    openBrowserBtn: 'Open in Browser',
    searchPlaceholder: 'Search tutorial cases, UI buttons, agent paths, or troubleshooting...',
    progressLabel: 'Learning Progress',
    resetProgressBtn: 'Reset',
  },
  sandbox: {
    badge: 'Practice Sandbox',
    title: 'Want to try safely without touching real files? Use a demo Skill first',
    descReady:
      'Clicking below creates a sample Skill tagged "skillsman-tutorial-demo" in your central store. It will not deploy to any agent folder until you assign it, and never affects your real Skills.',
    descExists:
      'Your practice demo Skill is ready! Open its drawer to inspect SKILL.md, toggle it in the Assignment Matrix, or clean it up anytime with one click.',
    createBtn: 'Create Practice Demo Skill',
    openDrawerBtn: 'Preview / Edit Demo Skill',
    goMatrixBtn: 'Try in Matrix',
    cleanupBtn: 'Clean Up Demo Skill',
    createdToast: 'Practice demo Skill created! Try following Case 2 or Case 5 with it.',
    cleanedToast: 'Practice demo Skill safely removed (no real Skills were touched).',
  },
  guide: {
    conceptsTitle: 'Lesson 0: 4 Core Concepts in Plain English',
    conceptsSubtitle: 'Understand these 4 everyday analogies first and every screen in SkillsMan clicks immediately.',
    concepts: [
      {
        id: 'concept-skill',
        badge: 'Concept 1',
        title: 'What is a Skill?',
        analogy: 'Like a standard operating handbook for a new teammate',
        summary:
          'A Skill is simply a folder with a SKILL.md instruction file inside. When an AI coding agent loads it, it follows your exact conventions for coding, code reviews, or commit messages.',
        details: [
          'A Skill folder holds SKILL.md plus optional helper scripts or reference docs.',
          'Instead of re-typing the same prompt instructions in every chat, save them once as a Skill.',
        ],
      },
      {
        id: 'concept-store',
        badge: 'Concept 2',
        title: 'What is the Central Store?',
        analogy: 'Your master bookshelf holding the one canonical copy of every book',
        summary:
          'SkillsMan stores all downloaded, imported, created, or adopted Skills in one central directory (default ~/.skillsman/store), ending copy-paste chaos across separate tool folders.',
        details: [
          'Edit SKILL.md once in the Skills Library and every linked agent picks up the change.',
          'Supports default user home, a custom path, or USB-friendly Portable Mode.',
        ],
      },
      {
        id: 'concept-junction',
        badge: 'Concept 3',
        title: 'What is a Windows Junction?',
        analogy: 'A zero-copy magic portal built into Windows—edit once, sync everywhere',
        summary:
          'The default deploy mode. Instead of duplicating files, SkillsMan places a native Windows directory Junction pointing back to the central store—zero admin privileges required.',
        details: [
          'AI agents read a Junction just like a normal directory while using zero extra disk copies.',
          'Saving SKILL.md in SkillsMan updates every Junction-linked agent instantaneously.',
        ],
      },
      {
        id: 'concept-copy',
        badge: 'Concept 4',
        title: 'When should I use Copy mode?',
        analogy: 'Printing an independent physical copy you can commit or ship anywhere',
        summary:
          'When you want to commit `.claude/skills` into a team Git repository or run builds inside containers, Copy mode writes real standalone files instead of machine-local Junction links.',
        details: [
          'If someone edits a deployed copy on disk, Health Check detects the drift instead of silently overwriting local edits.',
        ],
      },
    ],
    scopeDiagramTitle: 'Interactive Diagram: How Skills Flow from Store to Agents',
    scopeDiagramSubtitle: 'Click any tier below to inspect what it controls and when to choose it.',
    scopeLayers: [
      {
        id: 'store',
        badge: '0 · Canonical Source',
        title: 'Central Store',
        pathHint: '~/.skillsman/store/<skill-slug>/',
        meaning: 'The single source of truth for all Skills—whether downloaded from Git/Market, adopted locally, or authored from scratch.',
        whenToUse: 'Use the Skills Library whenever you want to inspect, edit, or update a Skill’s master files.',
        ruleSummary: 'Adding a Skill to the store does not deploy it automatically—you assign it through one of the 3 tiers below.',
      },
      {
        id: 'global',
        badge: '1 · Global Scope',
        title: 'Enable once, inherit across all enabled Agents',
        pathHint: 'Deploys into every enabled agent’s user skills directory',
        meaning: 'Best for universal habits you want everywhere: commit conventions, clean-code rules, or general debugging checklists.',
        whenToUse: 'Choose Global when you want one click to equip Cursor, Claude Code, Antigravity, and others together.',
        ruleSummary: 'Every enabled agent inherits Global items unless you explicitly Mute a specific item for one agent.',
      },
      {
        id: 'user',
        badge: '2 · User Level',
        title: 'Fine-tune a single Agent’s user directory',
        pathHint: 'e.g. ~/.claude/skills/ or ~/.cursor/skills/',
        meaning: 'Assign extra Skills or mute Global items for one specific AI tool without changing any other agent.',
        whenToUse: 'Ideal when a Skill is tailored to a single tool (like Claude Code) or needs an exception.',
        ruleSummary: 'Direct user-level assignment overrides a Global mute for that agent.',
      },
      {
        id: 'project',
        badge: '3 · Project Level',
        title: 'Isolate per repository without polluting other folders',
        pathHint: 'e.g. <repo>/.claude/skills/ or .cursor/skills/',
        meaning: 'Inject framework-specific or team-specific Skills only into one local codebase.',
        whenToUse: 'Recommended when juggling separate frontend, backend, or client repositories.',
        ruleSummary: 'Supports project-wide Junction/Copy override, automatic .gitignore management, and per-agent overrides.',
      },
    ],
    matrixLegendTitle: 'Reading the 5 Status Badges in Assignment Matrix',
    matrixLegendSubtitle: 'Click cells or toggles in the Matrix to switch states. Here is what each badge means:',
    matrixLegend: [
      {
        id: 'global',
        label: 'Global / Inherited',
        tone: 'accent',
        meaning: 'Inherited automatically from a Global binding or an active Workflow stack.',
        clickAction: 'Click the cell in Global or User view to Mute it just for that agent.',
      },
      {
        id: 'direct',
        label: 'Direct',
        tone: 'success',
        meaning: 'Explicitly assigned at this specific level (User or Project) for that agent.',
        clickAction: 'Click again to remove the direct assignment.',
      },
      {
        id: 'muted',
        label: 'Muted',
        tone: 'warning',
        meaning: 'Excluded on purpose for this agent even though Global or Project enables it.',
        clickAction: 'Click again to Unmute and restore inheritance.',
      },
      {
        id: 'conflict',
        label: 'Conflict',
        tone: 'danger',
        meaning: 'An unmanaged folder or edited Copy exists at the target path, so SkillsMan paused to protect your files.',
        clickAction: 'Open Overview → Health & Conflicts to Adopt to Store or Backup & Overwrite.',
      },
      {
        id: 'inactive',
        label: 'Off',
        tone: 'neutral',
        meaning: 'This Skill will not be deployed into the agent’s folder.',
        clickAction: 'Click once in User Level or Project Level view to toggle Direct on.',
      },
    ],
    routeSwitchLabelA: 'Track A: 6-Step Guided Walkthrough',
    routeSwitchLabelB: 'Track B: Quick Routes by Goal',
    routeADesc: 'Complete the 6 progressive cases in order and check them off—your progress is saved automatically.',
    routeBDesc: 'Short on time? Pick the scenario closest to your situation and jump straight to the matching cases.',
    cases: [
      {
        id: 'case-1',
        badge: 'Case 1 · First Win',
        title: 'Install your first Skill from Market or Git and deploy globally',
        duration: '2 min',
        scenario: 'You just opened SkillsMan with an empty store and want a ready-made Skill working across your AI tools.',
        goal: 'Fetch a Skill from skills.sh or a Git repository into the central store, bind it globally, and sync.',
        steps: [
          {
            title: 'Verify which AI agents are detected & enabled',
            detail:
              'Open the Agents page and check which tools show the green "Detected" badge (such as Claude Code, Cursor, or Antigravity). Make sure their toggle switch is on, or click "Redetect Installed Agents" if you installed a new tool.',
            uiPath: 'Sidebar → Agents',
            targetTab: 'agents',
            targetLabel: 'Open Agents',
          },
          {
            title: 'Download a Skill from Market or Git Repos',
            detail:
              'Go to Repos & Market. Either search keywords (e.g. react, testing, commit) on the Online Market (skills.sh) tab and click "Install", or switch to Git Repositories, click "Pull & Scan" on Anthropic Official Skills, select skills, and click "Install Selected".',
            uiPath: 'Sidebar → Repos & Market',
            targetTab: 'repos',
            targetLabel: 'Open Repos & Market',
            tip: 'If GitHub access is slow in your network, set an HTTP proxy or GitHub Mirror Prefix in Settings first.',
          },
          {
            title: 'Enable Global binding in Assignment Matrix',
            detail:
              'Open Matrix (defaults to Global scope), toggle the Global switch on your newly installed Skill row, and click "Sync All" in the top bar if needed.',
            uiPath: 'Sidebar → Matrix → Global toggle',
            targetTab: 'matrix',
            targetLabel: 'Open Matrix',
          },
        ],
        verify:
          'Every enabled agent column turns Global / Inherited. Inspecting an agent user folder (e.g. ~/.claude/skills/) shows the new Skill directory synced cleanly.',
        advancedNote: {
          title: 'Under the hood: Why did downloading not immediately deploy the Skill?',
          bullets: [
            'SkillsMan separates Storage (central store) from Assignment (Matrix / Projects) so installing never pollutes unrelated tools.',
            'Once assigned, the Deployer creates native Windows Junctions or copies only into enabled target paths.',
          ],
        },
        relatedRoles: ['role-solo'],
      },
      {
        id: 'case-2',
        badge: 'Case 2 · Adopt & Author',
        title: 'Adopt scattered local Skills or create your own in 1 minute',
        duration: '3 min',
        scenario: 'You already saved custom SKILL.md folders inside Cursor or Claude, or want to turn a prompt into a reusable Skill.',
        goal: 'Sweep existing local Skills into the central store and learn the Skill Drawer editor.',
        steps: [
          {
            title: 'Scan & adopt unmanaged local Skills',
            detail:
              'Open Skills Library and click "Adopt Local Skills". SkillsMan scans all configured agent user directories for unmanaged SKILL.md folders. Check the ones you want and click "Adopt Selected".',
            uiPath: 'Sidebar → Skills Library → Adopt Local Skills',
            targetTab: 'library',
            targetLabel: 'Open Skills Library',
            tip: 'Safe by design: adopting copies files into store/, preserves the origin agent’s user-level binding, and replaces the folder with a managed link.',
          },
          {
            title: 'Import a folder or ZIP package (optional)',
            detail:
              'Got a Skill folder or .zip archive from a teammate? Use "Import Folder" or "Import ZIP" at the top of Skills Library.',
            uiPath: 'Skills Library → Import Folder / Import ZIP',
          },
          {
            title: 'Create and edit a Skill in the Drawer',
            detail:
              'Click "New Skill" (or click the Practice Sandbox button above), fill in Name, Tags, Description, and Markdown body. The right-side Skill Drawer opens automatically with Preview, Edit, and Effective Trace tabs plus "Save & Sync" or External Editor launch.',
            uiPath: 'Skills Library → New Skill → Skill Drawer',
          },
        ],
        verify:
          'Your adopted or newly created Skill appears as a card in Skills Library. Any edits saved in the drawer reflect immediately across Junction links and auto-sync Copy targets.',
        advancedNote: {
          title: 'Under the hood: How are slug collisions handled during adoption?',
          bullets: [
            'If a central store Skill already uses that slug, the modal flags it with "Slug exists" and generates a unique suffix (e.g. my-skill-2) without overwriting your existing Skill.',
            'Saving edits recalculates the SHA-256 content hash so Copy deployments automatically refresh.',
          ],
        },
        relatedRoles: ['role-solo', 'role-migrate'],
      },
      {
        id: 'case-3',
        badge: 'Case 3 · Project Isolation',
        title: 'Configure per-project Skills without cluttering Git history',
        duration: '3 min',
        scenario: 'You work across separate frontend and backend repositories and want project-specific Skills kept clean in Git.',
        goal: 'Register local projects, bind project Skills/Workflows, and configure .gitignore automation or Copy mode.',
        steps: [
          {
            title: 'Add a project or batch scan your workspace',
            detail:
              'Go to Projects and click "Add Project" to pick a repo folder, or click "Scan Workspace" to discover multiple Git/Node/Go/Python/Rust repos under one parent directory.',
            uiPath: 'Sidebar → Projects → Add Project / Scan Workspace',
            targetTab: 'projects',
            targetLabel: 'Open Projects',
          },
          {
            title: 'Choose project Agents, Workflows, and Direct Skills',
            detail:
              'In the right inspector, select which Agents apply to this project, then toggle "Bound Workflows" and "Direct Project Skills". Right-click any skill pill to open its drawer directly.',
            uiPath: 'Projects → Right Inspector Panel',
          },
          {
            title: 'Pick Junction + .gitignore vs Copy mode for team sharing',
            detail:
              'For personal isolation, keep Junction mode and toggle "Auto-manage .gitignore block" on so SkillsMan keeps managed folders out of git status. For team-shared repos or CI containers, set "Deploy Mode Override" to "Real File Copy" and disable .gitignore management. Click "Sync Project".',
            uiPath: 'Projects → Deploy Mode Override / .gitignore → Sync Project',
          },
        ],
        verify:
          'Target folders like .claude/skills/ appear inside the repository. When .gitignore management is enabled, a dedicated `# >>> SkillsMan Managed >>>` block keeps them untracked.',
        advancedNote: {
          title: 'Under the hood: Do Global Skills leak into project folders?',
          bullets: [
            'Never. Global assignments only deploy into agent user-level folders; project folders are strictly governed by that project’s own Workflows, Direct Skills, and Per-Agent Overrides.',
            'Deploy mode precedence: Per-Agent Project Override > Project Override > Agent Default.',
          ],
        },
        relatedRoles: ['role-team'],
      },
      {
        id: 'case-4',
        badge: 'Case 4 · Workflows & Tray',
        title: 'Combine Skills into staged Workflows and toggle from the Tray',
        duration: '3 min',
        scenario: 'Real tasks follow stages like Plan → Build → Test → Review, and toggling individual Skills every time gets repetitive.',
        goal: 'Build multi-stage Workflows, optionally emit orchestration guides, and switch stacks in one click from the system tray.',
        steps: [
          {
            title: 'Organize stages inside Workflows',
            detail:
              'Open Workflows to customize the built-in "fullstack-standard" workflow or click "New Workflow". Add Skills into ordered stages and adjust stage order with the up/down arrows.',
            uiPath: 'Sidebar → Workflows',
            targetTab: 'workflows',
            targetLabel: 'Open Workflows',
          },
          {
            title: 'Optionally emit a workflow orchestration SKILL.md',
            detail:
              'Enable "Generate workflow guide SKILL.md" and click "Save Workflow". When deployed, SkillsMan generates a `workflow-<slug>/SKILL.md` guide explaining the ordered stages and Skills.',
            uiPath: 'Workflows → Generate workflow guide SKILL.md → Save Workflow',
          },
          {
            title: 'Bind across scopes and toggle from Windows System Tray',
            detail:
              'Use "Quick Bindings" at the bottom to attach the stack to Global Scope, User Agents, or Projects. Any Global workflow can also be toggled from Overview or right-clicking the SkillsMan tray icon → "Quick Global Workflows".',
            uiPath: 'Workflows Quick Bindings / Overview / Windows System Tray',
          },
        ],
        verify:
          'Overview and the Windows tray submenu stay in sync immediately, and all stage Skills deploy together cleanly without duplicates.',
        advancedNote: {
          title: 'Under the hood: Controlling where workflow guides appear',
          bullets: [
            'A workflow guide deploys only when BOTH the Workflow’s "Generate guide" toggle AND the target Agent/Project’s "workflowGuideEnabled" toggle are on.',
            'If a Skill appears in multiple stages or active workflows, SkillsMan deduplicates it automatically.',
          ],
        },
        relatedRoles: ['role-solo', 'role-team'],
      },
      {
        id: 'case-5',
        badge: 'Case 5 · Precision Control',
        title: 'Mute individual Agents in Matrix & inspect Effective Trace',
        duration: '2 min',
        scenario: 'You enabled a Global Skill everywhere, except one Agent should skip it—or you want to audit every path where a Skill lives.',
        goal: 'Mute or directly assign individual cells across Matrix scopes and audit deployments with Effective Trace.',
        steps: [
          {
            title: 'Mute an inherited Skill for a single Agent',
            detail:
              'Open Matrix and click a blue "Global" cell under any Agent column. It flips to an orange "Muted" badge—removing the Skill only from that Agent while leaving all others active.',
            uiPath: 'Sidebar → Matrix → Click inherited cell',
            targetTab: 'matrix',
            targetLabel: 'Open Matrix',
          },
          {
            title: 'Switch to User Level or Project Level for direct overrides',
            detail:
              'Switch the top SegmentedControl to "User Level" or "Project Level" and click any "Off" cell to toggle "Direct" on for just that Agent. Click any Skill row title to open its drawer.',
            uiPath: 'Matrix → User Level / Project Level → Click cell',
          },
          {
            title: 'Inspect Effective Trace inside Skill Drawer',
            detail:
              'Inside any Skill’s drawer, open the "Effective Trace" tab to see every active or muted User and Project path, its exact sources (global, workflow, direct, agent-override), deploy mode, and sync health.',
            uiPath: 'Click any Skill → Drawer → Effective Trace',
            tip: 'Press Ctrl+K anywhere to jump straight to any Skill drawer, Workflow, Project, or Sync All.',
          },
        ],
        verify:
          'Expanding that Agent on the Agents page lists the item under "Muted Global Items" (with a quick X to unmute), and Effective Trace reflects the updated state.',
        advancedNote: {
          title: 'Under the hood: How do Direct and Muted interact?',
          bullets: [
            'At User Level, explicit Direct assignment (`UserSkillIDs`) takes precedence over Global Mute.',
            'At Project Level, Per-Agent `ExtraSkillIDs` override both project exclusions and per-agent mutes.',
          ],
        },
        relatedRoles: ['role-team', 'role-migrate'],
      },
      {
        id: 'case-6',
        badge: 'Case 6 · Operations & Portable',
        title: 'Resolve conflicts safely, configure proxies, and use Portable Mode',
        duration: '3 min',
        scenario: 'Sync warns about an existing unmanaged directory, GitHub clones time out, or you want a self-contained USB setup.',
        goal: 'Use Health Check safely, set HTTP proxy / GitHub mirror, and activate zero-install Portable Mode.',
        steps: [
          {
            title: 'Resolve conflicts & copy drift without data loss',
            detail:
              'When Overview shows a red badge on the sidebar, SkillsMan protected an existing folder rather than overwriting it. Under "Health & Conflicts", pick "Adopt to Store" to keep it as a Skill, "Backup & Overwrite" to archive it into `backups/` first, or "Force Sync Copy" to refresh drifted Copy targets.',
            uiPath: 'Sidebar → Overview → Health & Conflicts',
            targetTab: 'dashboard',
            targetLabel: 'Open Overview',
          },
          {
            title: 'Configure HTTP/SOCKS5 proxy, GitHub mirror, or Token',
            detail:
              'Open Settings → Network, Proxy & GitHub. Fill in HTTP Proxy (e.g. `http://127.0.0.1:7890`), an optional GitHub Mirror Prefix (e.g. `https://gh-proxy.com/`), or a GitHub PAT for private repos and click "Save Settings".',
            uiPath: 'Sidebar → Settings → Network, Proxy & GitHub',
            targetTab: 'settings',
            targetLabel: 'Open Settings',
          },
          {
            title: 'Enable Portable Mode & background tray persistence',
            detail:
              'Place an empty file named `portable` (or a `data/` folder) next to `SkillsMan.exe` and restart. The title bar displays a "Portable" badge and keeps all state and skills inside `./data`. You can also enable "Minimize to tray on close" and "Start minimized at Windows logon" in Settings.',
            uiPath: 'Next to SkillsMan.exe / Settings → System Tray & Background',
          },
        ],
        verify:
          'Overview displays green "All junctions, copies, and workflow guides are healthy with zero conflicts." Portable Mode shows the "Portable" pill in the top title bar.',
        advancedNote: {
          title: 'Under the hood: Inside your SkillsMan data root',
          bullets: [
            'store/: Canonical Skill folders indexed by slug.',
            'repos/: Cached Git clones used for fast upstream SHA update checks.',
            'guides/: Auto-generated `workflow-<slug>/SKILL.md` orchestration packages.',
            'backups/: Timestamped archives created whenever you choose "Backup & Overwrite".',
          ],
        },
        relatedRoles: ['role-migrate'],
      },
    ],
    roles: [
      {
        id: 'role-solo',
        badge: 'Track 1 · Most Popular',
        title: 'Solo Daily Development',
        subtitle: 'I use 1–2 AI coding tools and want immediate productivity gains',
        persona: 'Best for individual developers and AI coding beginners.',
        outcome: 'Install market skills, author a custom Skill in 1 minute, and switch workflows from the tray.',
        recommendedCaseIds: ['case-1', 'case-2', 'case-4'],
        checklist: [
          { label: '1. Confirm your installed AI tools are enabled on Agents', caseId: 'case-1', targetTab: 'agents' },
          { label: '2. Install 1–2 Skills from Repos & Market and toggle Global on', caseId: 'case-1', targetTab: 'repos' },
          { label: '3. Author one personal habit Skill in Skills Library', caseId: 'case-2', targetTab: 'library' },
          { label: '4. Group favorite Skills into a Workflow and toggle via Tray', caseId: 'case-4', targetTab: 'workflows' },
        ],
      },
      {
        id: 'role-team',
        badge: 'Track 2 · Multi-Repo',
        title: 'Multi-Project & Team Collaboration',
        subtitle: 'I juggle multiple codebases and need clean isolation or Git sharing',
        persona: 'Best for engineers managing several repos or sharing conventions across a team.',
        outcome: 'Keep project rules isolated with managed .gitignore blocks or team-friendly Copy mode.',
        recommendedCaseIds: ['case-3', 'case-4', 'case-5'],
        checklist: [
          { label: '1. Batch scan or add your codebases under Projects', caseId: 'case-3', targetTab: 'projects' },
          { label: '2. Assign per-project Bound Workflows and Direct Project Skills', caseId: 'case-3', targetTab: 'projects' },
          { label: '3. Enable .gitignore automation (Junction) or switch to Copy for Git sharing', caseId: 'case-3', targetTab: 'projects' },
          { label: '4. Fine-tune per-agent exceptions in Project Matrix', caseId: 'case-5', targetTab: 'matrix' },
        ],
      },
      {
        id: 'role-migrate',
        badge: 'Track 3 · Existing Skills',
        title: 'Migrate Scattered Local Skills',
        subtitle: 'I already have SKILL.md files spread across Cursor, Claude, and Codex',
        persona: 'Best for users consolidating existing local agent configurations.',
        outcome: 'Adopt unmanaged folders safely into the central store, resolve conflicts, and carry setups portably.',
        recommendedCaseIds: ['case-2', 'case-5', 'case-6'],
        checklist: [
          { label: '1. Click "Adopt Local Skills" in Skills Library to sweep old folders', caseId: 'case-2', targetTab: 'library' },
          { label: '2. Resolve any naming conflicts safely in Overview', caseId: 'case-6', targetTab: 'dashboard' },
          { label: '3. Audit disk links using Skill Drawer → Effective Trace', caseId: 'case-5', targetTab: 'library' },
          { label: '4. Drop a "portable" marker file next to the exe for USB portability', caseId: 'case-6', targetTab: 'settings' },
        ],
      },
    ],
    roleGoCaseBtn: 'Jump to Case',
    templatesTitle: 'Ready-to-Use SKILL.md Templates',
    templatesSubtitle: 'Not sure how to structure your first Skill? Copy a template below and paste it into Skills Library → New Skill.',
    copyBtn: 'Copy Template',
    copiedText: 'Copied',
    stepJumpPrefix: 'Go to screen:',
    verifyLabel: 'How do I verify it worked?',
    doneCheckboxLabel: 'Mark this case completed',
    doneBadge: 'Completed',
  },
  features: {
    tocModulesTitle: '8 UI Modules',
    tocMechanismsTitle: 'Core Mechanisms & Specs',
    tocAgentsTitle: '11 Built-in Agent Paths',
    modulesTitle: 'Complete UI Module Reference (8 Pages)',
    modulesSubtitle: 'Every panel, toggle, action button, and drawer tab explained accurately.',
    openPageBtn: 'Open Page',
    tipsLabel: 'Practical Tips',
    modules: [
      {
        id: 'mod-dashboard',
        navTab: 'dashboard',
        badge: '1 · Command Center',
        title: 'Overview',
        summary: 'Default home screen summarizing store counts, quick Global workflows, deployment health, and repository updates.',
        controls: [
          { name: 'Health Check / Sync All', desc: 'Health Check verifies tracked links and Copy hashes; Sync All reconciles all Global, User, and Project deployments.' },
          { name: '4 KPI Cards', desc: 'Display Stored Skills, Enabled/Total Agents, Projects, and Workflows—click any card to jump directly to its page.' },
          { name: 'Quick Global Workflows', desc: 'Toggle Global workflows on or off right from Overview and sync automatically.' },
          { name: 'Health & Conflicts Panel', desc: 'Lists conflict, drift, broken-junction, and missing-target issues with safe one-click fixes: Adopt to Store, Backup & Overwrite, or Force Sync Copy.' },
          { name: 'Repository Status & Check All Updates', desc: 'Compares cached Git repos against upstream HEADs and flags updates.' },
        ],
        tips: [
          'The red badge number on Overview in the left navigation rail mirrors the active HealthIssues count.',
        ],
      },
      {
        id: 'mod-matrix',
        navTab: 'matrix',
        badge: '2 · Assignment Grid',
        title: 'Assignment Matrix',
        summary: 'Interactive Workflow/Skill × Agent grid across Global, User Level, and Project Level scopes.',
        controls: [
          { name: 'Scope Segmented Control (Global / User / Project)', desc: 'Switch scope view; Project view adds a project selector dropdown.' },
          { name: 'Kind Filter & Search', desc: 'Filter All Items, Skills Only, or Workflows Only, plus instant search by name or slug.' },
          { name: 'Left Column Global / Project Toggle', desc: 'In Global view toggles Global binding; in Project view toggles project-wide binding.' },
          { name: 'Agent Grid Cells', desc: 'In Global view, clicking mutes/unmutes that agent; in User/Project view, clicking toggles Direct assignment or unmutes/mutes inherited items.' },
          { name: 'Row Title Click', desc: 'Clicking a Skill row title opens its Skill Drawer immediately.' },
        ],
        tips: [
          'Workflow rows are listed above Skill rows with their accent color dots for fast visual scanning.',
        ],
      },
      {
        id: 'mod-library',
        navTab: 'library',
        badge: '3 · Canonical Store',
        title: 'Skills Library & Skill Drawer',
        summary: 'Central repository for creating, importing, adopting, editing, updating, and tracing Skills.',
        controls: [
          { name: 'Adopt Local Skills', desc: 'Scans configured agent user folders for unmanaged SKILL.md directories (ignoring hidden dot-folders), imports them, and preserves origin bindings.' },
          { name: 'Import Folder / Import ZIP', desc: 'Native Windows picker for local Skill folders or ZIP archives (supports nested single-root folders).' },
          { name: 'New Skill', desc: 'Creates a new Skill directory in store/ with serialized YAML frontmatter and Markdown body.' },
          { name: 'Source Filter (All / Local / Git / Market / Adopted)', desc: 'Filters cards by origin type alongside live tag/title search.' },
          { name: 'Skill Drawer (Preview / Edit / Effective Trace)', desc: 'Shows rendered Markdown, attached files list, inline metadata & body editing with Save & Sync, upstream Update action, and Folder/External Editor launch.' },
        ],
        tips: [
          'Deleting a Skill safely removes its store directory, clears all scope references, and cleans up tracked deployments.',
        ],
      },
      {
        id: 'mod-workflows',
        navTab: 'workflows',
        badge: '4 · Stage Stacks',
        title: 'Workflow Stacks',
        summary: 'Bundle Skills into ordered stages, optionally generate guide Skills, and bind across scopes.',
        controls: [
          { name: 'New / Save / Delete Workflow', desc: 'Create or edit workflow name, description, accent color, and stage definitions.' },
          { name: 'Stage Builder', desc: 'Add, rename, reorder (up/down), or remove stages and attach Skills to each stage.' },
          { name: 'Generate workflow guide SKILL.md', desc: 'When enabled alongside Agent/Project workflowGuideEnabled, generates `workflow-<slug>/SKILL.md` listing the ordered stages.' },
          { name: 'Quick Bindings Panel', desc: 'Attach the selected workflow directly to Global Scope, User Agents, or Projects with immediate sync.' },
        ],
        tips: [
          'Duplicate Skills across stages or active workflows are deduplicated automatically during deployment.',
        ],
      },
      {
        id: 'mod-projects',
        navTab: 'projects',
        badge: '5 · Repo Isolation',
        title: 'Projects',
        summary: 'Independent per-repository configuration for agents, workflows, direct skills, deploy mode, and .gitignore.',
        controls: [
          { name: 'Add Project / Scan Workspace', desc: 'Register a single directory or scan up to 3 levels under a workspace root for Git/Go/Node/Python/Rust projects.' },
          { name: 'Enabled Agents', desc: 'Controls which agents receive project-relative deployments inside this repository.' },
          { name: 'Bound Workflows & Direct Project Skills', desc: 'Assigns project-scoped stacks or individual Skills; right-click any skill pill to open its drawer.' },
          { name: 'Deploy Mode Override', desc: 'Override to Follow Agent Default, Windows Junction, or Real File Copy.' },
          { name: 'Auto-manage .gitignore block', desc: 'Atomically maintains `# >>> SkillsMan Managed >>>` entries inside `.gitignore`.' },
          { name: 'Per-Agent Overrides', desc: 'Customize deploy mode or add Extra Skills for one specific agent inside the project.' },
        ],
        tips: [
          'Removing a project cleans up its SkillsMan-managed links/copies and removes the managed .gitignore block.',
        ],
      },
      {
        id: 'mod-repos',
        navTab: 'repos',
        badge: '6 · Upstream Sources',
        title: 'Repos & Market',
        summary: 'Manage Git/GitHub repositories (single or monorepo) and browse skills.sh or custom JSON registries.',
        controls: [
          { name: 'Add & Scan Git Repository', desc: 'Accepts `owner/repo` shorthand or full Git URL with optional branch; clones and discovers every SKILL.md subpath.' },
          { name: 'Pull & Scan / Check All Updates / Install Selected or All', desc: 'Checks upstream HEAD commits, installs individual skills from monorepos, and marks installed entries.' },
          { name: 'Online Market (skills.sh)', desc: 'Search skills by keyword, inspect installs/tags/author, and install directly into the central store.' },
          { name: 'Add Custom JSON Registry', desc: 'Connect team or third-party JSON feeds (supports `{query}` placeholder).' },
        ],
        tips: [
          'Both Git operations and HTTP registry queries honor your configured HTTP Proxy, GitHub Mirror, and PAT.',
        ],
      },
      {
        id: 'mod-agents',
        navTab: 'agents',
        badge: '7 · Tool Profiles',
        title: 'Agents',
        summary: 'Manage 11 built-in AI coding agents and custom agent profiles, paths, defaults, and mutes.',
        controls: [
          { name: 'Redetect Installed Agents', desc: 'Rescans local config markers and enables newly detected agents.' },
          { name: 'Add Custom Agent', desc: 'Define any custom tool with user directory, project relative directory, and default deploy mode.' },
          { name: 'Agent Expander Settings', desc: 'Edit `~` / `%USERPROFILE%` / `%APPDATA%` paths, default Junction/Copy mode, Emit Workflow Guide toggle, and manage Muted Global Items.' },
        ],
        tips: [
          'Built-in agents cannot be deleted (just toggle them off); custom agents can be removed anytime.',
        ],
      },
      {
        id: 'mod-settings',
        navTab: 'settings',
        badge: '8 · Preferences',
        title: 'Settings',
        summary: 'Configure Windows theme & accent sync, bilingual UI, central store root, proxy, autostart, and tray behavior.',
        controls: [
          { name: 'Appearance & Language', desc: 'System/Light/Dark theme, Windows DWM accent sync, and Simplified Chinese / English UI + Tray localization.' },
          { name: 'Central Store & Portable Mode', desc: 'Inspect active data root, open it in Explorer, or pick a custom store root in Standard Mode.' },
          { name: 'Network, Proxy & GitHub', desc: 'Configure HTTP/SOCKS5 proxy, GitHub mirror URL prefix, and GitHub Personal Access Token.' },
          { name: 'System Tray & Background', desc: 'Minimize to tray on close, HKCU Run logon autostart (`--minimized`), background repo update interval (>= 15 min), and External Editor command.' },
        ],
        tips: [
          'Remember to click "Save Settings" after editing text inputs such as Proxy, Mirror, Token, or Custom Editor.',
        ],
      },
    ],
    agentsTitle: '11 Built-in Agent Presets & Path Mapping',
    agentsSubtitle: 'Exact user-level and project-relative directories used by SkillsMan out of the box:',
    agentsHeaders: ['Agent Name', 'User Skills Directory', 'Project Relative Directory', 'Default Mode', 'Detection Markers'],
    mechanismsTitle: 'Core Mechanisms, File Specs & Shortcuts',
    mechanismsSubtitle: 'Technical details on resolution rules, deployment safety, file schemas, and shortcuts.',
    mechanisms: [
      {
        id: 'mech-scope',
        badge: 'Mechanism 1',
        title: '3-Tier Resolution & Mute Precedence',
        summary: 'The resolver computes User-level and Project-level effective entries independently:',
        paragraphs: [
          'Global assignments deploy exclusively to enabled agents’ user-level folders and never automatically touch project directories.',
        ],
        bullets: [
          'User Level: `(Global Items − Agent Global Mutes) ∪ Agent Direct User Items`. Direct User assignment overrides a Global mute.',
          'Project Level: `(Project Direct Skills ∪ Project Workflows − Project Exclusions − Agent Mutes) ∪ Per-Agent Extra Items`.',
          'Duplicate hits across multiple workflows or direct bindings are merged into one target deployment with combined source tags.',
        ],
      },
      {
        id: 'mech-deploy',
        badge: 'Mechanism 2',
        title: 'Junction vs Copy & 3-Level Mode Override',
        summary: 'Deploy mode is resolved by: Per-Agent Project Override > Project Override > Agent Default (defaults to Junction).',
        paragraphs: [
          'Choose Junction for instant zero-copy sync on your machine, or Copy when files must be committed to Git or shared outside Windows.',
        ],
        table: {
          headers: ['Dimension', 'Junction (Default)', 'Copy (Real File Copy)'],
          rows: [
            { cols: ['Disk Footprint', 'Zero duplicate files; points to central store/', 'Independent file copy at target path'] },
            { cols: ['Edit Propagation', 'Instant across all linked agents', 'Updated on Save & Sync / Sync All via SHA-256 comparison'] },
            { cols: ['Privileges', 'Standard Windows user (native FSCTL reparse point)', 'Standard folder write permission'] },
            { cols: ['Git / Container Friendly', 'No (machine-local link)', 'Yes (real files portable across machines)'] },
            { cols: ['Local Edit Protection', 'Edits canonical copy directly', 'Modified target triggers drift conflict instead of overwriting'] },
          ],
        },
      },
      {
        id: 'mech-skillmd',
        badge: 'Mechanism 3',
        title: 'SKILL.md Frontmatter Schema',
        summary: 'SkillsMan scans case-insensitive SKILL.md inside each Skill directory (skipping .git and node_modules).',
        paragraphs: [
          'If `name` or `description` is omitted in YAML frontmatter, SkillsMan falls back to the first `# Heading` (or folder name) and the first paragraph of the Markdown body.',
        ],
        codeBlock: {
          label: 'Canonical SKILL.md Example',
          code: `---
name: Clean Go Reviewer
description: Review Go edits for error handling and test coverage.
author: Alice
version: 1.0.0
tags: [go, review, testing]
---

## When to use
Apply before completing any Go package changes.

## Instructions
1. Check wrapped errors and context propagation.
2. Run \`go test ./...\` after final edits.`,
        },
      },
      {
        id: 'mech-gitignore',
        badge: 'Mechanism 4',
        title: 'Managed .gitignore Section Format',
        summary: 'When enabled on a project, SkillsMan atomically writes only between its dedicated markers.',
        paragraphs: [
          'Disabling agents, removing skills, or turning off .gitignore management cleans up the managed block automatically on the next sync without altering your custom rules.',
        ],
        codeBlock: {
          label: 'Managed Block in Project .gitignore',
          code: `# >>> SkillsMan Managed >>>
.claude/skills/git-commit-helper/
.cursor/skills/git-commit-helper/
# <<< SkillsMan Managed <<<`,
        },
      },
      {
        id: 'mech-health',
        badge: 'Mechanism 5',
        title: 'Health Check Issue Types & Conflict Protection',
        summary: 'SkillsMan never silently deletes or overwrites unmanaged directories or modified Copy targets.',
        paragraphs: [
          'Any anomalous deployment surfaces in Overview → Health & Conflicts with non-destructive remediation buttons.',
        ],
        table: {
          headers: ['Kind', 'Cause', 'Recommended Action'],
          rows: [
            { cols: ['conflict', 'An unmanaged folder already exists at targetPath, or a Copy target has unsynced edits before switching to Junction', 'Click "Adopt to Store" to keep it as a Skill, or "Backup & Overwrite" to archive into backups/ first'] },
            { cols: ['drift', 'A Copy-mode folder was edited on disk so its SHA-256 differs from DeployedHash', 'Click "Force Sync Copy" to restore from store/, or copy your changes back to store/ first'] },
            { cols: ['broken-junction', 'Junction became a regular folder, points to a stale location, or its store target is missing', 'Click "Force Sync Copy" (recreates clean target link)'] },
            { cols: ['missing-target', 'Tracked deployment folder was removed externally from disk', 'Click "Force Sync Copy" or "Sync All" to restore'] },
          ],
        },
      },
      {
        id: 'mech-storage',
        badge: 'Mechanism 6',
        title: 'Data Root, Portable Mode, Ctrl+K & System Tray',
        summary: 'Where SkillsMan stores state, how Portable Mode activates, and global keyboard/tray shortcuts.',
        paragraphs: [
          'Standard mode defaults to `~/.skillsman` (custom store paths are remembered in `%LOCALAPPDATA%\\SkillsMan\\bootstrap.json`). Placing an empty `portable` file or a `data/` directory beside `SkillsMan.exe` activates Portable Mode using `./data`.',
        ],
        bullets: [
          'Data Root Layout: `state.json` (state & deployment map), `store/` (canonical Skills), `repos/` (Git caches), `guides/` (workflow guides), `backups/` (conflict backups), `docs/` (browser launch cache).',
          'Command Palette (`Ctrl+K`): Fuzzy search navigation tabs, Skills (opens Drawer), Workflows, Projects, Sync All, and Open Docs in Browser.',
          'Windows System Tray: Left-click toggles the window; right-click offers Quick Global Workflows checkboxes, Sync All Now, Run Health Check, Check Repo Updates, Guide & Docs, and Start Minimized on Boot (`--minimized`).',
        ],
      },
    ],
  },
  ui: {
    noSearchMatches: 'No matching sections found. Try another keyword like "adopt", "Junction", "Cursor", or "workflow".',
    clearSearch: 'Clear Search',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    langSwitchLabel: 'Language',
    offlineBadge: 'Single-File Offline Docs',
  },
};
