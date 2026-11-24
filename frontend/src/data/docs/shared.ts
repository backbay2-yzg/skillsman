import type { AgentPresetDoc, SkillTemplateDoc } from './types.ts';

export const PRACTICE_SKILL_TAG = 'skillsman-tutorial-demo';

export const PRACTICE_SKILL_PRESETS = {
  'zh-CN': {
    name: 'Git 提交规范助手 (练习示例)',
    desc: '引导 AI 按 Conventional Commits 格式输出清晰、可追踪的中文或英文 Git 提交信息。',
    author: 'SkillsMan Guide',
    version: '1.0.0',
    tags: [PRACTICE_SKILL_TAG, 'git', 'tutorial'],
    body: `## 什么时候启用这个 Skill

当用户让你帮忙写 \`git commit\` 提交说明、总结本次代码改动，或者准备发起 PR 时自动遵循本规范。

## 执行步骤

1. 先查看本次变更涉及的核心模块与改动意图（新增功能 / 修复缺陷 / 文档更新 / 重构）。
2. 使用标准前缀格式输出提交信息：\`<type>(<scope>): <subject>\`。
3. 常用 \`type\` 取值：
   - \`feat\`: 新增功能
   - \`fix\`: 修复 Bug
   - \`docs\`: 仅文档或注释变更
   - \`refactor\`: 既不修 Bug 也不加功能的代码整理
   - \`chore\`: 构建脚本、依赖或配置维护
4. 标题控制在 50 字以内，末尾不加句号；如改动复杂，空一行后用 \`-\` 列出 2~3 条要点说明原因。

## 输出示例

\`\`\`text
docs(guide): add beginner tutorials and feature manual

- Add 6 step-by-step beginner walkthrough cases and 3 role tracks
- Add single-file offline HTML documentation with bilingual support
\`\`\`
`,
  },
  'en-US': {
    name: 'Git Commit Helper (Practice Demo)',
    desc: 'Guides AI agents to generate clean, structured Conventional Commits messages for staged changes.',
    author: 'SkillsMan Guide',
    version: '1.0.0',
    tags: [PRACTICE_SKILL_TAG, 'git', 'tutorial'],
    body: `## When to use

Apply this skill whenever the user asks to draft a \`git commit\` message, summarize staged diffs, or prepare a Pull Request title.

## Instructions

1. Inspect the modified files and identify the primary intent (feature, bug fix, docs, refactor, or chore).
2. Format the commit header as \`<type>(<scope>): <subject>\`.
3. Allowed \`type\` prefixes:
   - \`feat\`: New user-facing feature
   - \`fix\`: Bug fix
   - \`docs\`: Documentation only changes
   - \`refactor\`: Code restructuring without behavior change
   - \`chore\`: Build scripts, dependencies, or tooling updates
4. Keep the subject concise (under 60 characters), imperative, and without a trailing period. Add a short bullet body if context helps.

## Example Output

\`\`\`text
docs(guide): add beginner tutorials and feature manual

- Add 6 step-by-step beginner walkthrough cases and 3 role tracks
- Add single-file offline HTML documentation with bilingual support
\`\`\`
`,
  },
} as const;

export const BUILTIN_AGENTS_DOC: AgentPresetDoc[] = [
  {
    id: 'agents-universal',
    name: 'Universal (.agents)',
    userSkillsDir: '~/.agents/skills',
    projectSkillsRelDir: '.agents/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测到 ~/.agents 目录存在时自动启用',
    detectNotesEn: 'Auto-detected when ~/.agents exists',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    userSkillsDir: '~/.claude/skills',
    projectSkillsRelDir: '.claude/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测到 ~/.claude 目录时自动启用',
    detectNotesEn: 'Auto-detected when ~/.claude exists',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    userSkillsDir: '~/.codex/skills',
    projectSkillsRelDir: '.codex/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测到 ~/.codex 目录时自动启用',
    detectNotesEn: 'Auto-detected when ~/.codex exists',
  },
  {
    id: 'antigravity',
    name: 'Antigravity / Gemini',
    userSkillsDir: '~/.gemini/antigravity/skills',
    projectSkillsRelDir: '.agent/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.gemini/antigravity 或 %APPDATA%/Antigravity',
    detectNotesEn: 'Detects ~/.gemini/antigravity or %APPDATA%/Antigravity',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    userSkillsDir: '~/.cursor/skills',
    projectSkillsRelDir: '.cursor/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.cursor 或 %APPDATA%/Cursor',
    detectNotesEn: 'Detects ~/.cursor or %APPDATA%/Cursor',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    userSkillsDir: '~/.codeium/windsurf/skills',
    projectSkillsRelDir: '.windsurf/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.codeium/windsurf 或 %APPDATA%/Windsurf',
    detectNotesEn: 'Detects ~/.codeium/windsurf or %APPDATA%/Windsurf',
  },
  {
    id: 'copilot',
    name: 'VS Code Copilot',
    userSkillsDir: '~/.copilot/skills',
    projectSkillsRelDir: '.github/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.copilot 或 VS Code Copilot Chat globalStorage',
    detectNotesEn: 'Detects ~/.copilot or VS Code Copilot Chat globalStorage',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    userSkillsDir: '~/.config/opencode/skills',
    projectSkillsRelDir: '.opencode/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.config/opencode',
    detectNotesEn: 'Detects ~/.config/opencode',
  },
  {
    id: 'trae',
    name: 'Trae',
    userSkillsDir: '~/.trae/skills (~/.trae-cn/skills)',
    projectSkillsRelDir: '.trae/skills',
    defaultMode: 'junction',
    detectNotesZh: '存在 ~/.trae-cn 时优先使用 ~/.trae-cn/skills；同时检测 %APPDATA%/Trae CN 与 Trae',
    detectNotesEn: 'Uses ~/.trae-cn/skills when ~/.trae-cn exists; checks %APPDATA%/Trae CN & Trae',
  },
  {
    id: 'qoder',
    name: 'Qoder',
    userSkillsDir: '~/.qoder/skills',
    projectSkillsRelDir: '.qoder/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.qoder 或 %APPDATA%/Qoder',
    detectNotesEn: 'Detects ~/.qoder or %APPDATA%/Qoder',
  },
  {
    id: 'codebuddy',
    name: 'CodeBuddy',
    userSkillsDir: '~/.codebuddy/skills',
    projectSkillsRelDir: '.codebuddy/skills',
    defaultMode: 'junction',
    detectNotesZh: '检测 ~/.codebuddy、~/.codebuddycn 或 %APPDATA%/CodeBuddy CN',
    detectNotesEn: 'Detects ~/.codebuddy, ~/.codebuddycn, or %APPDATA%/CodeBuddy CN',
  },
];

export const SKILL_TEMPLATES: SkillTemplateDoc[] = [
  {
    id: 'tpl-minimal',
    badge: 'Starter',
    titleZh: '极简入门模板（适合 1 分钟创建新 Skill）',
    titleEn: 'Minimal Starter Template (1-minute setup)',
    descZh: '包含标准 YAML Frontmatter 与基础触发条件，适合把你常对 AI 重复说的一句话沉淀成 Skill。',
    descEn: 'Includes standard YAML frontmatter and basic trigger rules—ideal for turning recurring prompts into a reusable Skill.',
    code: `---
name: My First Skill
description: Explain concisely when the AI agent should apply this skill.
author: Your Name
version: 1.0.0
tags: [starter, productivity]
---

## When to use

- Activate when working on tasks related to ...

## Instructions

1. Always check existing conventions before making edits.
2. Keep changes minimal, clear, and verified with tests.
`,
  },
  {
    id: 'tpl-review',
    badge: 'Review',
    titleZh: '代码审查与安全自检模板',
    titleEn: 'Code Review & Guardrails Template',
    descZh: '让 AI 在提交或重构前自动按清单排查空指针、边界错误与重复代码。',
    descEn: 'Instructs AI agents to run a structured checklist for edge cases, security, and duplication before finishing edits.',
    code: `---
name: Clean Code Reviewer
description: Review modified files for correctness, edge cases, duplication, and clear error handling.
author: Team Lead
version: 1.0.0
tags: [review, quality, safety]
---

## When to use

Run before concluding any non-trivial code change or when the user asks for a review.

## Checklist

1. **Correctness & Edge Cases**: Verify nil/empty inputs, error returns, and boundary conditions.
2. **No Duplicate Logic**: Extract shared helpers instead of copy-pasting blocks.
3. **Security Hygiene**: Never hardcode secrets, tokens, or unescaped shell/SQL inputs.
4. **Verification**: Run the project's unit tests or typecheck after final edits.
`,
  },
  {
    id: 'tpl-project',
    badge: 'Project',
    titleZh: '项目技术栈约束模板（配合项目级分配）',
    titleEn: 'Project Stack Convention Template',
    descZh: '绑定到特定代码仓库，统一告诉所有协作 Agent 本项目使用的框架、包管理器和目录规范。',
    descEn: 'Bind to a specific project so every enabled agent follows the same stack, package manager, and folder conventions.',
    code: `---
name: Project Stack Conventions
description: Enforce project-specific tech stack, package manager, and coding conventions.
author: Maintainer
version: 1.0.0
tags: [project, conventions, typescript]
---

## Stack Rules

- **Package Manager**: Use \`pnpm\` (never \`npm install\` or \`yarn\`).
- **Styling**: Follow existing CSS variables and theme tokens; avoid hardcoded hex colors.
- **Validation**: Always run \`pnpm run build\` before reporting completion.
`,
  },
];
