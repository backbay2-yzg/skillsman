import type { LocalizedDocs } from './types.ts';

export const ZH_CN_DOCS: LocalizedDocs = {
  locale: 'zh-CN',
  hero: {
    badge: '零基础通关指南 · 含完整功能手册',
    title: 'SkillsMan 使用指南与功能文档',
    subtitle:
      '不管你是刚听说 AI Skill 的纯新手，还是同时用 Cursor、Claude Code、Antigravity 的多工具开发者，都能在几分钟内学会集中管理、按项目隔离并一键同步全部技能。',
    tabGuide: '小白案例教程',
    tabFeatures: '完整功能文档',
    openBrowserBtn: '在浏览器中打开',
    searchPlaceholder: '搜索教程案例、功能按钮、Agent 路径或排障关键词...',
    progressLabel: '新手通关进度',
    resetProgressBtn: '重置进度',
  },
  sandbox: {
    badge: '新手练手沙盒',
    title: '不敢乱改真实文件？先用一个练习用 Skill 跟着做',
    descReady:
      '点击下方按钮会在中央库创建一个带「skillsman-tutorial-demo」标签的示例 Skill（不会同步到任何 AI 目录，也不会影响你现有的任何文件）。',
    descExists:
      '练习用示例 Skill 已就绪！你可以点开它的详情抽屉看看 SKILL.md 长什么样，去「分配矩阵」开关试试效果，练完后点右侧一键清理。',
    createBtn: '一键创建练习用示例 Skill',
    openDrawerBtn: '预览 / 编辑示例 Skill',
    goMatrixBtn: '去分配矩阵演练',
    cleanupBtn: '一键清理练习 Skill',
    createdToast: '已创建练习示例 Skill，跟着案例动手试试吧！',
    cleanedToast: '已安全清理练习用示例 Skill（未影响任何真实 Skill）',
  },
  guide: {
    conceptsTitle: '第 0 课：3 分钟看懂 4 个核心概念（零术语大白话）',
    conceptsSubtitle: '先搞懂这 4 个生活类比，后面的所有操作点一下就通。',
    concepts: [
      {
        id: 'concept-skill',
        badge: '概念 1',
        title: '什么是 Skill（技能包）？',
        analogy: '就像给新员工发的《岗位操作手册》',
        summary:
          '一个 Skill 就是一个文件夹，里面核心是名为 SKILL.md 的说明书。AI 编程工具读到它后，就会按你写好的规范去写代码、做审查或写提交说明。',
        details: [
          '一个文件夹通常只放 1 份 SKILL.md，还可以附带脚本或参考文档。',
          '以前你要在每个项目里复制粘贴提示词，现在做成 Skill 就能长期复用。',
        ],
      },
      {
        id: 'concept-store',
        badge: '概念 2',
        title: '什么是“中央库”？',
        analogy: '你家的总书架，所有书只在这里放一份正本',
        summary:
          'SkillsMan 会把下载、导入、新建或收编的 Skill 统一存放在中央库（默认 ~/.skillsman/store），告别在 Cursor、Claude、Antigravity 文件夹里到处找复制品。',
        details: [
          '在「Skills 库」修改一次 SKILL.md 正本，所有链接过去的工具都会同步更新。',
          '支持标准用户目录、自定义路径，以及放在 U 盘里的“绿色便携模式”。',
        ],
      },
      {
        id: 'concept-junction',
        badge: '概念 3',
        title: '什么是 Junction（目录联接）？',
        analogy: 'Windows 自带的“任意门”——零占用、改一处处处同步',
        summary:
          '默认部署模式。它不会真的复制文件，而是在各 AI 工具目录里放一个指向中央库的 Windows 目录联接（Junction），无需管理员权限即可秒级创建。',
        details: [
          'AI 工具读起来和普通文件夹完全一致，但硬盘只占 1 份空间。',
          '当你在线编辑并保存 SKILL.md 后，所有通过 Junction 挂载的 Agent 立刻生效。',
        ],
      },
      {
        id: 'concept-copy',
        badge: '概念 4',
        title: '什么时候用 Copy（真实复制）模式？',
        analogy: '印一份独立复印件，打包带走也不丢',
        summary:
          '在项目级或团队协作场景，如果你要把 `.claude/skills` 提交进 Git 仓库给同事用，或者放进 Docker 容器编译，真实文件复制（Copy）比快捷方式更稳妥。',
        details: [
          '如果有人直接修改了复制出来的副本，SkillsMan 会在「总览」的「健康检查」里提示漂移（drift），不会悄悄覆盖你的改动。',
        ],
      },
    ],
    scopeDiagramTitle: '交互图解：中央库是如何流向各个 AI 工具的？',
    scopeDiagramSubtitle: '点击下方任意一层，查看它管什么、什么时候该用它。',
    scopeLayers: [
      {
        id: 'store',
        badge: '0 · 唯一正本',
        title: '中央库 (Central Store)',
        pathHint: '~/.skillsman/store/<skill-slug>/',
        meaning: '所有 Skill 的唯一“总部”。从市场下载、Git 拉取、本地收编或手动新建的技能都先进入这里。',
        whenToUse: '当你想存放、查看、编辑或更新 Skill 正本时，都在「Skills 库」操作。',
        ruleSummary: '入库不等于立即生效！入库只是把书放到总书架上，还需要通过下面三层中的任意一层“分配”出去。',
      },
      {
        id: 'global',
        badge: '1 · 全局级 (Global)',
        title: '一次开关，所有已启用 Agent 全部生效',
        pathHint: '自动继承到每个已启用 Agent 的用户目录',
        meaning: '适合你每天、在任何项目都要用的通用技能（比如代码整洁规范、Git 提交规范、通用思考框架）。',
        whenToUse: '想“装一次就让 Cursor、Claude Code、Antigravity 等全部都能用”时选它。',
        ruleSummary: '所有在「Agent 配置」中开启的 Agent 都会继承全局项；若某个 Agent 不想要某项，可单独点为「屏蔽 (Muted)」。',
      },
      {
        id: 'user',
        badge: '2 · 用户级 (User Level)',
        title: '只给某个特定 Agent 单独配菜',
        pathHint: '例如 ~/.claude/skills/ 或 ~/.cursor/skills/',
        meaning: '针对单个 AI 工具的用户级目录进行精细加减，不影响其他 AI 工具。',
        whenToUse: '例如某个 Skill 专治 Claude Code，或者你想在 Antigravity 上取消继承某条全局 Skill。',
        ruleSummary: '用户级「直配」优先级高于全局屏蔽，即“直接指派给我”优先于“全局默认”。',
      },
      {
        id: 'project',
        badge: '3 · 项目级 (Project Level)',
        title: '只对某个本地代码仓库生效，不污染全局',
        pathHint: '例如 <你的项目>/.claude/skills/ 或 .cursor/skills/',
        meaning: '把特定技术栈或团队规范仅注入到指定项目文件夹，切换别的仓库完全互不干扰。',
        whenToUse: '手里同时有 React 前端、Go 后端、公司私有项目时最推荐用项目级隔离。',
        ruleSummary: '可按项目覆写 Junction/Copy 模式、自动维护 .gitignore 区块，还能在单项目里针对单个 Agent 做例外覆写。',
      },
    ],
    matrixLegendTitle: '看懂「分配矩阵」里的 5 种状态徽章',
    matrixLegendSubtitle: '点击矩阵单元格或表头即可切换，这些颜色和标签含义如下：',
    matrixLegend: [
      {
        id: 'global',
        label: '全局 / 继承',
        tone: 'accent',
        meaning: '该条目来自「全局级」勾选或已绑定的「工作流」，当前 Agent 自动继承生效。',
        clickAction: '在全局视图或用户视图点击单元格，可将其单独切换为「屏蔽」。',
      },
      {
        id: 'direct',
        label: '直配',
        tone: 'success',
        meaning: '你在这个层级（用户级 / 项目级）明确为该 Agent 单独开启了此项。',
        clickAction: '再次点击单元格可取消直配。',
      },
      {
        id: 'muted',
        label: '屏蔽',
        tone: 'warning',
        meaning: '虽然全局或项目开启了它，但你专门为当前 Agent 关闭了例外（不部署到它目录）。',
        clickAction: '再次点击单元格即可「取消屏蔽」恢复继承。',
      },
      {
        id: 'conflict',
        label: '冲突',
        tone: 'danger',
        meaning: '目标路径上已经存在非 SkillsMan 管理的旧目录，或 Copy 副本被外部改过。SkillsMan 主动停手保护文件。',
        clickAction: '前往「总览」的「状态与冲突处理」选择「收编入库」或「备份后覆盖」。',
      },
      {
        id: 'inactive',
        label: '未分配',
        tone: 'neutral',
        meaning: '该 Agent 目录里当前不会出现这个 Skill。',
        clickAction: '在用户级或项目级点击一次单元格即可设为「直配」开启。',
      },
    ],
    routeSwitchLabelA: '路线 A：6 步循序渐进通关课',
    routeSwitchLabelB: '路线 B：按你的场景 1 分钟速通',
    routeADesc: '适合从零完整掌握 SkillsMan：每完成一个案例勾选右侧复选框，系统会自动记住你的进度。',
    routeBDesc: '如果你时间紧张，先对号入座选一条与你当前目标最接近的路线，直接跟着清单跳转实操。',
    cases: [
      {
        id: 'case-1',
        badge: '案例 1 · 新手必做',
        title: '从在线市场 / Git 仓库安装第一个 Skill 并全局生效',
        duration: '约 2 分钟',
        scenario: '你刚打开 SkillsMan，中央库还是空的，想先装一个现成的优质 Skill 体验一下。',
        goal: '从在线市场或官方 Git 仓库把 Skill 下载到中央库，并一键分发给你电脑上的全部 AI 编程工具。',
        steps: [
          {
            title: '先确认本机哪些 AI 工具已开启',
            detail:
              '打开「Agent 配置」页面，查看上方带有绿色「本机已检测」标签的 Agent（如 Claude Code、Cursor、Antigravity 等）。确保右侧开关处于开启状态；如果你刚新装了某个 AI 工具，点右上角「重新扫描本机 Agent」。',
            uiPath: '左侧导航 → Agent 配置',
            targetTab: 'agents',
            targetLabel: '去 Agent 配置查看',
          },
          {
            title: '从在线市场或 Git 仓库下载 Skill 到中央库',
            detail:
              '切换到「仓库与市场」页面：方法一是在「在线市场 (skills.sh)」标签页搜索关键词（如 react、testing、commit），找到喜欢的条目点击「下载入库」；方法二是在「Git 仓库源」标签页对内置的 Anthropic Official Skills 点击「拉取并扫描」，勾选需要的 Skill 点「安装选中」。',
            uiPath: '左侧导航 → 仓库与市场',
            targetTab: 'repos',
            targetLabel: '打开仓库与市场',
            tip: '国内网络如果拉取 GitHub 较慢，可先在「设置」填入 HTTP/SOCKS5 代理或 GitHub 加速镜像前缀。',
          },
          {
            title: '在分配矩阵打开「全局级」开关',
            detail:
              '进入「分配矩阵」页面（默认就在「全局级」视图），找到刚才入库的 Skill 那一行，点击最左侧的「全局」开关使其高亮开启。最后点击右上角蓝色的「立即同步全部」（或开启全局时系统会自动触发一次同步）。',
            uiPath: '左侧导航 → 分配矩阵 → 全局列开关',
            targetTab: 'matrix',
            targetLabel: '去分配矩阵开启',
          },
        ],
        verify:
          '矩阵中所有已启用 Agent 列都会变为「全局 / 继承」状态；打开任意一个已启用 Agent 的目录（如 ~/.claude/skills/），能看到对应的 Skill 文件夹已出现，且顶部或抽屉显示 synced。',
        advancedNote: {
          title: '进阶原理解析：为什么在市场点完下载，AI 还是看不到？',
          bullets: [
            'SkillsMan 采用「入库」与「分配」分离的设计：下载只是把文件存进中央库（store/），不会贸然塞满所有工具目录。',
            '只有在「分配矩阵」或「项目管理」里勾选分配后，部署器（Deployer）才会在对应目录建立 Windows Junction 联接或复制文件。',
          ],
        },
        relatedRoles: ['role-solo'],
      },
      {
        id: 'case-2',
        badge: '案例 2 · 迁移与创作',
        title: '一键收编本机散落的旧 Skills，或 1 分钟新建自己的 Skill',
        duration: '约 3 分钟',
        scenario: '你以前自己在 Cursor、Claude 或 Antigravity 里建过几个 SKILL.md，或者刚写好一段提示词想做成可复用的 Skill。',
        goal: '把各处散落的旧技能收编进中央库统一接管，并学会用可视化抽屉创建与编辑 Skill。',
        steps: [
          {
            title: '扫描并收编本机已有散落 Skills',
            detail:
              '进入「Skills 库」，点击右上角「扫描收编本机 Skills」。系统会自动扫描所有已配置 Agent 用户目录中尚未纳管的 Skill 文件夹，在弹窗中勾选它们并点击「收编选中项」。',
            uiPath: '左侧导航 → Skills 库 → 扫描收编本机 Skills',
            targetTab: 'library',
            targetLabel: '去 Skills 库扫描',
            tip: '放心勾选！收编会自动把原目录复制进中央库，同时保留该原 Agent 的用户级绑定并替换成安全联接，不会让原有工具失灵。',
          },
          {
            title: '导入本地文件夹或 ZIP 压缩包（可选）',
            detail:
              '如果朋友发给你一个包含 SKILL.md 的文件夹或 .zip 压缩包，直接点「Skills 库」右上角的「导入文件夹」或「导入 ZIP」即可一键入库。',
            uiPath: 'Skills 库 → 导入文件夹 / 导入 ZIP',
          },
          {
            title: '新建并编辑你的第一个自定义 Skill',
            detail:
              '点击「新建 Skill」（或直接在本页面顶部沙盒一键创建练习示例），填好名称、描述、标签和正文，提交后会自动打开右侧详情抽屉。你可以切换「预览 / 编辑 / 生效链路」三个页签，改完点「保存并同步」或点图标直接用 VS Code 打开编辑。',
            uiPath: 'Skills 库 → 新建 Skill → 右侧抽屉',
          },
        ],
        verify:
          '在「Skills 库」卡片列表能看到新收编或新建的卡片；如果刚才编辑了正文，所有已挂载此 Skill 的 Junction 目录会实时反映最新内容，Copy 模式目标也会自动更新。',
        advancedNote: {
          title: '进阶原理解析：收编时如果原目录与库里已有同名 Skill 怎么办？',
          bullets: [
            '扫描弹窗会用黄色「Slug exists」徽章提示重名；收编时会自动生成不冲突的唯一 slug（如 my-skill-2），不会覆盖中央库里已有的正本。',
            '详情抽屉的「保存并同步」不仅保存 SKILL.md，还会重新计算目录内容 SHA-256 哈希并自动同步所有 Copy 模式副本。',
          ],
        },
        relatedRoles: ['role-solo', 'role-migrate'],
      },
      {
        id: 'case-3',
        badge: '案例 3 · 项目隔离',
        title: '为不同代码项目独立配 Skills，还不弄脏 Git 记录',
        duration: '约 3 分钟',
        scenario: '你同时维护前端项目 A 和后端项目 B，不想把后端规范塞进前端项目，也不想在 git status 里看到一堆未跟踪的技能目录。',
        goal: '在「项目管理」中导入本地仓库，配好专属技能与 .gitignore 自动托管块，或按需切换 Copy 模式共享给团队。',
        steps: [
          {
            title: '添加本地项目目录或批量扫描工作区',
            detail:
              '打开「项目管理」页面：单个项目点右上角「添加项目」选中代码根目录；如果一个文件夹下放了十几个项目，点「批量扫描工作区」选父目录，SkillsMan 会自动识别带 .git 或项目标识的子文件夹供勾选导入。',
            uiPath: '左侧导航 → 项目管理 → 添加项目 / 批量扫描工作区',
            targetTab: 'projects',
            targetLabel: '去项目管理添加',
          },
          {
            title: '勾选该项目使用的 Agents、工作流与直配 Skills',
            detail:
              '在右侧详情面板依次勾选「项目启用的 Agents」（比如只勾 Cursor 和 Claude Code），再按需点亮「绑定工作流」或「项目直配 Skills」。注意：这里只影响当前项目，不会影响你其他项目。',
            uiPath: '项目管理 → 右侧详情面板',
          },
          {
            title: '按个人隔离或团队共享选择部署模式与 .gitignore',
            detail:
              '如果是个人开发不想把本地目录提交到团队 Git，保持默认「跟随 Agent 默认 / Junction」并打开「自动维护 .gitignore 托管区块」；如果是要把项目技能随仓库提交给同事或 CI 使用，把「部署模式覆写」设为「真实文件复制 (Copy)」并关闭自动写 .gitignore。最后点「同步此项目」。',
            uiPath: '项目管理 → 部署选项 → 同步此项目',
            tip: '右键点击「项目直配 Skills」里的任意技能标签，可以直接弹出该 Skill 的预览与编辑抽屉！',
          },
        ],
        verify:
          '打开该项目根目录下的 .claude/skills/ 或 .cursor/skills/，已分配的 Skill 已经出现；若开启了自动托管，项目 .gitignore 末尾会自动写入 `# >>> SkillsMan Managed >>>` 区块并列出托管路径。',
        advancedNote: {
          title: '进阶原理解析：全局技能会不会自动塞进项目目录？',
          bullets: [
            '不会！全局级只部署到每个 Agent 的「用户级目录」，项目级目录完全由项目自己的「绑定工作流」「项目直配 Skills」与「单 Agent 例外覆写」决定，边界非常干净。',
            '部署模式存在三级优先级：项目内「单 Agent 例外覆写」 > 「项目部署模式覆写」 > 「Agent 默认模式」。',
          ],
        },
        relatedRoles: ['role-team'],
      },
      {
        id: 'case-4',
        badge: '案例 4 · 效率倍增',
        title: '把多个 Skills 编排成工作流套件，在托盘 1 秒切换',
        duration: '约 3 分钟',
        scenario: '做一个完整功能常要经历“规划 → 编码 → 测试 → 审查”四步，每次手动逐个勾选十几个 Skill 太麻烦。',
        goal: '创建或使用多阶段工作流套件，绑定到全局或项目，并利用指引生成与 Windows 托盘菜单快速切换工作模式。',
        steps: [
          {
            title: '进入工作流页面并编排阶段',
            detail:
              '点击左侧「工作流」，可以看到系统自带的「全栈标准开发流」（含规划设计、编码实现、测试验证、审查交付四个阶段），也可以点「新建工作流」。在每个阶段点「+ 添加 Skill 到此阶段」，并用上下箭头调整阶段顺序。',
            uiPath: '左侧导航 → 工作流',
            targetTab: 'workflows',
            targetLabel: '打开工作流套件',
          },
          {
            title: '按需开启“导出工作流编排指引 SKILL.md”',
            detail:
              '打开「导出工作流编排指引 SKILL.md」开关并点击「保存工作流」。开启后，SkillsMan 在部署这个工作流时会自动额外生成一个名为 `workflow-<slug>` 的总控 Skill，告诉 AI 应该按哪几个阶段顺序依次调用这些技能。',
            uiPath: '工作流 → 导出工作流编排指引 SKILL.md → 保存工作流',
          },
          {
            title: '在页面、总览或系统托盘一键开关整套工作流',
            detail:
              '在工作流页面底部的「快速绑定分配」可一键绑定到「全局级生效」「单 Agent 用户级」或「项目级」；绑定到全局的套件，后续无需打开主窗口，直接右键 Windows 右下角系统托盘的 SkillsMan 图标 →「快速切换全局工作流」，勾选即可秒级切换！',
            uiPath: '工作流快速绑定 / 总览快速开关 / 系统托盘菜单',
          },
        ],
        verify:
          '打开「总览」的「全局工作流快速开关」或右键托盘菜单，工作流勾选状态与实际部署目录实时保持同步；若开启了导出的编排指引，Agent 目录里还会多出一个 `workflow-<slug>` 目录。',
        advancedNote: {
          title: '进阶原理解析：如果工作流指引不希望某个 Agent 收到怎么办？',
          bullets: [
            '工作流指引生成需要双方同时允许：工作流本身的「导出工作流编排指引」开启，且目标 Agent（「Agent 配置」→ 允许工作流指引文件）或目标项目（「项目管理」→ 允许导出工作流指引文件）也开启。',
            '关闭其中任意一方的开关，就只会部署阶段里的真实 Skills，不会生成总控指引文件。',
          ],
        },
        relatedRoles: ['role-solo', 'role-team'],
      },
      {
        id: 'case-5',
        badge: '案例 5 · 精细掌控',
        title: '用「分配矩阵」单独屏蔽某个 Agent，并用「生效链路」排错',
        duration: '约 2 分钟',
        scenario: '你开启了一个全局 Skill，但唯独不想让 OpenAI Codex 或某个项目里的 Copilot 看到它；或者忘了某条 Skill 到底部署去了哪里。',
        goal: '熟练使用全局/用户/项目三视角矩阵进行「屏蔽 (Mute)」与「直配」，并用 Skill 抽屉的「生效链路 (Trace)」一眼定位所有磁盘路径。',
        steps: [
          {
            title: '在分配矩阵切换作用域并单独屏蔽例外',
            detail:
              '打开「分配矩阵」，在顶部切换「全局级 / 用户级 / 项目级」。对于已通过全局继承过来的 Skill，直接点击某个 Agent 格子里蓝色的「全局」徽章，它会立刻变成橙色的「屏蔽」——只对这一个 Agent 关闭，其他 Agent 依然正常生效。',
            uiPath: '左侧导航 → 分配矩阵 → 点击绿色/蓝色单元格',
            targetTab: 'matrix',
            targetLabel: '去分配矩阵体验',
          },
          {
            title: '在用户级或项目级给单个 Agent“开小灶”',
            detail:
              '切换到「用户级」或「项目级」视图，在原本「未分配」的灰格子里点击一下，即可为该 Agent 单独「直配」一个技能；在矩阵左列点击任何 Skill 名称，可随时拉出右侧详情抽屉。',
            uiPath: '分配矩阵 → 切换用户级/项目级 → 点击单元格或行标题',
          },
          {
            title: '用「生效链路 (Trace)」一眼查清来龙去脉',
            detail:
              '在任意 Skill 的右侧详情抽屉切换到「生效链路」页签，这里会按作用域列出该 Skill 当前在每个 Agent、每个项目下的真实磁盘路径（targetPath）、生效来源（global / workflow / direct / agent-override）、部署模式和同步状态。',
            uiPath: '点击任意 Skill → 右侧抽屉 → 生效链路',
            tip: '用快捷键 Ctrl+K 打开命令面板，输入 Skill 名称回车即可秒开它的详情抽屉！',
          },
        ],
        verify:
          '在「Agent 配置」展开对应 Agent 卡片，底部的「已屏蔽的全局项」也会列出刚才被静音的条目（点小叉号也可随时解除）；「生效链路」里不再部署到被屏蔽的磁盘路径。',
        advancedNote: {
          title: '进阶原理解析：全局静音与直配叠加时谁赢？',
          bullets: [
            '在用户级规则中：Agent 自己的「直配 (UserSkillIDs)」优先级高于「全局屏蔽 (GlobalMutedSkillIDs)」。也就是说即使它在全局被静音，只要你在用户级给它点了直配，它仍会生效。',
            '在项目级规则中：项目内「单 Agent 例外追加 (ExtraSkillIDs)」优先级高于「项目排除」和「单 Agent 屏蔽」。',
          ],
        },
        relatedRoles: ['role-team', 'role-migrate'],
      },
      {
        id: 'case-6',
        badge: '案例 6 · 稳健运维',
        title: '冲突安全修复、国内代理镜像配置与 U 盘绿色便携模式',
        duration: '约 3 分钟',
        scenario: '同步时遇到目标目录已有老文件冲突，或者拉取 GitHub 仓库超时，亦或想把整套 Skills 带去另一台 Windows 电脑。',
        goal: '学会无损处理冲突与副本漂移、配好网络代理/镜像，并掌握绿色便携模式的开启方式。',
        steps: [
          {
            title: '无损处理「状态与冲突处理」警告',
            detail:
              '当「总览」导航图标出现红色角标时，表示目标路径存在 SkillsMan 未纳管的文件（conflict）或 Copy 副本被外部改动（drift）。SkillsMan 绝不会静默覆盖你的文件，而是停下来给你 3 个安全选项：「收编入库」（保留那份目录为新 Skill）、「备份后覆盖」（先挪到 backups/ 备份再同步）或对漂移副本点「强制覆盖同步」。',
            uiPath: '左侧导航 → 总览 → 状态与冲突处理',
            targetTab: 'dashboard',
            targetLabel: '去总览查看健康状态',
          },
          {
            title: '配置网络代理、GitHub 加速镜像或 Token',
            detail:
              '如果在线市场或 Git 仓库拉取失败，打开「设置 → 网络、代理与 GitHub」：填入本机代理地址（如 http://127.0.0.1:7890），或填入 GitHub 加速镜像前缀（如 https://gh-proxy.com/），拉取私有仓库还可填入 GitHub Personal Access Token，点「保存设置」立即生效。',
            uiPath: '左侧导航 → 设置 → 网络、代理与 GitHub',
            targetTab: 'settings',
            targetLabel: '打开设置页面',
          },
          {
            title: '开启 U 盘“绿色便携模式”与开机托盘驻留',
            detail:
              '想把全部配置和中央库随身带走？只需在 SkillsMan.exe 同级目录新建一个名为 `portable` 的空文件（无后缀）或建立 `data` 文件夹，重启后顶栏会出现「便携模式」徽章，所有数据将保存在同级 `data/` 目录。平时还可以在设置开启「关闭窗口时隐藏到系统托盘」与「开机静默自启」。',
            uiPath: 'SkillsMan.exe 同级目录 / 设置 → 系统托盘与后台行为',
          },
        ],
        verify:
          '处理完所有异常后，「总览」的「状态与冲突处理」会显示绿色对勾“所有软链接、复制副本与工作流编排状态健康”；开启便携模式后窗口标题栏左侧会亮起「便携模式」蓝色徽章。',
        advancedNote: {
          title: '进阶原理解析：中央库根目录的 4 个核心子目录',
          bullets: [
            'store/：所有纳管 Skill 的唯一正本文件夹（按 slug 命名）。',
            'repos/：克隆缓存的 Git 仓库源，用于快速检查上游 SHA 更新。',
            'guides/：工作流开启导出指引时自动生成的 workflow-<slug>/SKILL.md。',
            'backups/：在解决冲突点击「备份后覆盖」时自动转存的时间戳备份目录，随时可找回。',
          ],
        },
        relatedRoles: ['role-migrate'],
      },
    ],
    roles: [
      {
        id: 'role-solo',
        badge: '场景路线 1 · 最常见',
        title: '单人日常开发',
        subtitle: '我平时只用 1~2 个 AI 工具写代码，只想快速变强',
        persona: '适合个人开发者、独立创作者或 AI 编程初学者。',
        outcome: '3 分钟内从市场下载技能、用自定义 Skill 沉淀高频提示词，并在托盘随时切换工作流。',
        recommendedCaseIds: ['case-1', 'case-2', 'case-4'],
        checklist: [
          { label: '1. 在「Agent 配置」确认常用的 AI 工具已开启', caseId: 'case-1', targetTab: 'agents' },
          { label: '2. 去「仓库与市场」安装 1~2 个常用 Skill 并点亮全局开关', caseId: 'case-1', targetTab: 'repos' },
          { label: '3. 在「Skills 库」新建一个自己专属的习惯约束 Skill', caseId: 'case-2', targetTab: 'library' },
          { label: '4. 把常用技能放进「全栈标准开发流」，用托盘随时开关', caseId: 'case-4', targetTab: 'workflows' },
        ],
      },
      {
        id: 'role-team',
        badge: '场景路线 2 · 多仓库推荐',
        title: '多项目 / 团队协作',
        subtitle: '手头多个前后端项目，需要按项目隔离或随 Git 共享技能',
        persona: '适合同时负责多个项目、或需要把项目 AI 规范共享给团队的开发者。',
        outcome: '做到项目之间技能互不串台，且灵活切换“不污染 Git 的个人隔离”或“Copy 模式随仓提交”。',
        recommendedCaseIds: ['case-3', 'case-4', 'case-5'],
        checklist: [
          { label: '1. 在「项目管理」批量扫描并导入你的代码仓库', caseId: 'case-3', targetTab: 'projects' },
          { label: '2. 为不同项目勾选专属「绑定工作流」与「项目直配 Skills」', caseId: 'case-3', targetTab: 'projects' },
          { label: '3. 个人项目开启自动维护 .gitignore；团队共享切换为 Copy 模式', caseId: 'case-3', targetTab: 'projects' },
          { label: '4. 用「分配矩阵」项目级视图微调个别 Agent 的屏蔽或追加', caseId: 'case-5', targetTab: 'matrix' },
        ],
      },
      {
        id: 'role-migrate',
        badge: '场景路线 3 · 老用户迁移',
        title: '已有老技能迁移与接管',
        subtitle: '电脑里之前东一个西一个放了不少 SKILL.md，想统一管起来',
        persona: '适合此前已经手动折腾过 Cursor、Claude Code、Codex、Trae 等工具技能的用户。',
        outcome: '零损失把散落各处的技能全部收编进中央库，妥善解决重名冲突并支持 U 盘便携备份。',
        recommendedCaseIds: ['case-2', 'case-5', 'case-6'],
        checklist: [
          { label: '1. 在「Skills 库」点「扫描收编本机 Skills」一键接管已有目录', caseId: 'case-2', targetTab: 'library' },
          { label: '2. 若有重名提示，在「总览」通过「收编入库」或「备份后覆盖」无损化解', caseId: 'case-6', targetTab: 'dashboard' },
          { label: '3. 打开任意 Skill 抽屉的「生效链路」，核对各工具磁盘指向', caseId: 'case-5', targetTab: 'library' },
          { label: '4. 如需跨设备迁移，在 exe 同级建 portable 文件启用绿色便携模式', caseId: 'case-6', targetTab: 'settings' },
        ],
      },
    ],
    roleGoCaseBtn: '查看对应案例详解',
    templatesTitle: '拿来就用：3 份高质量 SKILL.md 实用模板',
    templatesSubtitle: '不知道怎么写你的第一个 Skill？直接复制下面的模板，去「Skills 库 → 新建 Skill」粘贴修改即可。',
    copyBtn: '复制模板',
    copiedText: '已复制',
    stepJumpPrefix: '直达操作：',
    verifyLabel: '怎么知道我做对了？',
    doneCheckboxLabel: '我已跟着练完这一步',
    doneBadge: '已掌握',
  },
  features: {
    tocModulesTitle: '8 大页面功能说明',
    tocMechanismsTitle: '核心机制与速查表',
    tocAgentsTitle: '11 个内置 Agent 路径表',
    modulesTitle: '界面功能完整参考（8 大功能页面）',
    modulesSubtitle: '逐页拆解每一个面板、按钮、开关与快捷键的实际作用。',
    openPageBtn: '打开此页面',
    tipsLabel: '使用提示',
    modules: [
      {
        id: 'mod-dashboard',
        navTab: 'dashboard',
        badge: '1 · 指挥中心',
        title: '总览 (Overview)',
        summary: '启动默认首页，集中展示系统健康状况、全局快捷工作流开关与上游仓库更新状态。',
        controls: [
          { name: '健康检查 / 立即同步全部', desc: '顶部主按钮。健康检查扫描所有已追踪部署的状态；立即同步全部根据三层规则全量对齐磁盘文件。' },
          { name: 'KPI 统计卡片（4 张）', desc: '分别显示已入库 Skills、已启用 / 总 Agents、托管项目数、工作流套件数，点击卡片可直达对应管理页。' },
          { name: '全局工作流快速开关', desc: '不用进入工作流页面，直接在此一键开关某个全局工作流并自动同步到所有已启用 Agent。' },
          { name: '状态与冲突处理面板', desc: '发现 conflict（目标已有未纳管目录）、drift（Copy 副本被本地改动）、broken-junction（联接失效）或 missing-target（目录丢失）时，提供「收编入库」「备份后覆盖」「强制覆盖同步」安全处置按钮。' },
          { name: '仓库更新动态 & 检查全部更新', desc: '对比本地缓存仓库与远程 Git HEAD 提交，有新提交时高亮「有上游更新」徽章。' },
        ],
        tips: [
          '正常健康状态下会显示绿色“暂无冲突或漂移”；左侧导航栏红色数字角标即当前待处理健康问题数。',
        ],
      },
      {
        id: 'mod-matrix',
        navTab: 'matrix',
        badge: '2 · 核心调度表',
        title: '分配矩阵 (Assignment Matrix)',
        summary: '以“工作流 / Skill × Agent”二维矩阵直观查看并即时切换全局级、用户级与项目级的生效状态。',
        controls: [
          { name: '作用域切换（全局级 / 用户级 / 项目级）', desc: '切换查看层级。项目级会自动出现当前选择项目的下拉框。' },
          { name: '条目筛选与搜索', desc: '支持按「全部条目 / 仅 Skills / 仅工作流」过滤，或按名称/slug 关键字即时检索。' },
          { name: '左列「全局 / 项目」总开关', desc: '全局视图下点击即切换该 Skill/工作流是否全局启用；项目视图下点击即切换是否对整个项目启用。' },
          { name: 'Agent 交叉单元格', desc: '在全局视图点击可单独「屏蔽/取消屏蔽」该 Agent；在用户级或项目级点击未分配格子可直接设为「直配」，点击继承格子可设为「屏蔽」。' },
          { name: '点击条目名称', desc: '若该行是 Skill，点击名称直接滑出右侧详情抽屉（预览 / 编辑 / 查看生效链路）。' },
        ],
        tips: [
          '工作流排在矩阵最前面并带彩色标识点，Skill 排在下方，方便一眼区分套件与单个技能。',
        ],
      },
      {
        id: 'mod-library',
        navTab: 'library',
        badge: '3 · 中央仓库',
        title: 'Skills 库与右侧详情抽屉',
        summary: '管理中央库中的所有 Skill 正本，支持在线创作、本地导入、旧技能收编、上游更新与链路追踪。',
        controls: [
          { name: '扫描收编本机 Skills', desc: '自动扫描所有已配置 Agent 用户目录中未纳管且包含 SKILL.md 的目录（跳过以 . 开头的保护目录），勾选后自动复制到 store/ 并接管原 Agent 绑定。' },
          { name: '导入文件夹 / 导入 ZIP', desc: '通过 Windows 原生选择器导入任意包含 SKILL.md 的本地目录或 .zip 压缩包（支持包内单层嵌套文件夹自动识别）。' },
          { name: '新建 Skill', desc: '填写名称、标签、描述、作者和 Markdown 正文，自动生成安全 slug 与标准 YAML Frontmatter。' },
          { name: '来源筛选（All / Local / Git / Market / Adopted）', desc: '快速筛选自建、Git 仓库安装、市场下载或本机收编的 Skill。' },
          { name: '右侧详情抽屉（预览 / 编辑 / 生效链路）', desc: '点击任意卡片滑出：支持 Markdown 实时渲染、字段与正文在线编辑并「保存并同步」、有上游更新时显示「立即更新」、一键打开所在文件夹或外部编辑器（默认探测 VS Code）。' },
        ],
        tips: [
          '删除 Skill 时会同步清理所有全局/用户/项目分配记录及磁盘上的托管联接与副本，不会误删非托管文件。',
        ],
      },
      {
        id: 'mod-workflows',
        navTab: 'workflows',
        badge: '4 · 阶段套件',
        title: '工作流套件 (Workflow Stacks)',
        summary: '将多个 Skills 按有序执行阶段打包成套件，支持导出编排指引文件与一键跨作用域绑定。',
        controls: [
          { name: '新建 / 保存 / 删除工作流', desc: '创建新工作流（默认带 Plan / Build / Verify 三阶段）或修改内置工作流的名称、描述与标识颜色。' },
          { name: '阶段编排（上下移动 / 增删阶段 / 添加 Skill）', desc: '按顺序组织多个阶段，每个阶段可自由挂载或移除任意库内 Skill。' },
          { name: '导出工作流编排指引 SKILL.md', desc: '开启后，部署工作流时会在 guides/workflow-<slug>/ 自动生成阶段执行顺序说明文件并同步部署（需 Agent/项目也允许）。' },
          { name: '快速绑定分配面板', desc: '在编辑器下方直接勾选绑定至「全局级生效」「单 Agent 用户级」或「项目级」，勾选即刻保存并同步。' },
        ],
        tips: [
          '一个 Skill 可以同时属于多个阶段或多个工作流，部署器会自动去重，不会重复建多个目录。',
        ],
      },
      {
        id: 'mod-projects',
        navTab: 'projects',
        badge: '5 · 仓库隔离',
        title: '项目管理 (Projects)',
        summary: '为每个本地代码仓库独立配置启用的 Agents、工作流、直配 Skills、部署模式与 Git 忽略规则。',
        controls: [
          { name: '添加项目 / 批量扫描工作区', desc: '支持添加单个项目目录，或扫描一个工作区父目录批量发现 Git / Go / Node / Rust / Python 项目（默认跳过 node_modules 等缓存目录，最多扫描 3 层）。' },
          { name: '项目启用的 Agents', desc: '决定同步该项目时只往哪些 AI 工具的项目相对目录写入文件（如 .claude/skills、.cursor/skills）。' },
          { name: '绑定工作流 & 项目直配 Skills', desc: '只针对当前项目生效；右键直配 Skill 标签可快捷打开详情抽屉。' },
          { name: '部署模式覆写（跟随 Agent / Junction / Copy）', desc: '在项目层面统一切换 Junction 零拷贝联接或真实文件复制模式。' },
          { name: '自动维护 .gitignore 托管区块', desc: '原子更新项目 .gitignore 中 `# >>> SkillsMan Managed >>>` 区块，自动忽略 SkillsMan 托管路径；关闭后会自动清理该区块而不动其他内容。' },
          { name: '单 Agent 例外覆写', desc: '在同一个项目内，为特定 Agent 单独覆写部署模式或追加 Extra Skills。' },
        ],
        tips: [
          '点击「移除项目托管」时会先清理该项目内由 SkillsMan 管理的联接/副本和 .gitignore 托管块，保持项目干干净净。',
        ],
      },
      {
        id: 'mod-repos',
        navTab: 'repos',
        badge: '6 · 上游生态',
        title: '仓库与市场 (Repos & Market)',
        summary: '集成 Git 仓库源管理（单仓与 Monorepo 多技能自动发现）与在线 Registry 检索下载。',
        controls: [
          { name: '添加并扫描 Git 仓库源', desc: '支持输入 GitHub 简写（如 owner/repo）或完整 Git HTTPS/SSH URL 及可选分支，自动克隆并递归扫描全部 SKILL.md 子目录。' },
          { name: '拉取并扫描 / 检查全部更新 / 安装选中或全部', desc: '支持一键检测所有已缓存仓库的新提交，支持从 Monorepo 中勾选取需要的几个 Skill 入库，已入库项显示「已入库」徽章。' },
          { name: '在线市场 (skills.sh) 检索', desc: '内置 skills.sh 搜索接口，输入关键词即可查看描述、作者、安装量与标签，点击「下载入库」自动拉取源仓对应子目录。' },
          { name: '添加自定义 JSON 源', desc: '支持添加符合标准 JSON 数组的团队内部或第三方 Skill 市场 URL（支持 `{query}` 关键词占位符）。' },
        ],
        tips: [
          '在设置中配置了 HTTP 代理或 GitHub 加速镜像前缀后，Git 克隆与在线市场检索都会自动走对应配置。',
        ],
      },
      {
        id: 'mod-agents',
        navTab: 'agents',
        badge: '7 · 工具适配',
        title: 'Agent 配置 (Agents)',
        summary: '管理 11 个内置 AI Agent 与无限自定义 Agent 的路径、启用开关、默认部署模式与全局屏蔽项。',
        controls: [
          { name: '重新扫描本机 Agent', desc: '重新探测电脑上新安装的 AI 工具配置目录，并自动启用新发现的 Agent。' },
          { name: '新增自定义 Agent', desc: '为任何尚未内置的工具（如 Roo Code 或公司内部 CLI）自定义名称、用户级目录、项目级相对目录与默认部署模式。' },
          { name: '展开卡片配置详情', desc: '支持修改 `~` 或 `%USERPROFILE%` / `%APPDATA%` 路径模板、默认部署模式（Junction / Copy）、「允许工作流指引文件」开关及查看/解除「已屏蔽的全局项」。' },
        ],
        tips: [
          '内置 Agent 不可删除但可随时关闭右侧总开关；只有自定义 Agent 支持删除。',
        ],
      },
      {
        id: 'mod-settings',
        navTab: 'settings',
        badge: '8 · 偏好与驻留',
        title: '设置 (Settings)',
        summary: '控制应用外观、中央库位置、绿色便携模式、网络代理、外部编辑器及系统托盘自启行为。',
        controls: [
          { name: '外观与语言', desc: '切换跟随系统 / 浅色 / 深色主题，跟随 Windows DWM 强调色，以及简体中文 / English 双语切换（系统托盘菜单同步切换）。' },
          { name: '中央库与便携模式', desc: '查看当前激活的数据根目录并一键在资源管理器打开；标准模式下支持选择自定义中央库目录。' },
          { name: '网络、代理与 GitHub', desc: '配置 HTTP/SOCKS5 代理、GitHub 镜像前缀与私有仓库 Personal Access Token。' },
          { name: '系统托盘与后台行为', desc: '配置关闭窗口隐藏到托盘、Windows 开机静默自启（`--minimized` 写入当前用户 Run 注册表）、后台定时检查仓库更新间隔（最低 15 分钟）以及外部编辑器命令。' },
        ],
        tips: [
          '除开关类项点击即保存外，输入框修改（如代理、镜像、Token、编辑器命令）请记得点击右上角「保存设置」。',
        ],
      },
    ],
    agentsTitle: '内置 11 个 AI Agent 预设路径与探测规则',
    agentsSubtitle: '以下是 SkillsMan 内置支持的全部 Agent 及其默认用户级、项目级技能目录映射：',
    agentsHeaders: ['Agent 名称', '用户级 Skills 目录', '项目级相对目录', '默认模式', '本机探测依据'],
    mechanismsTitle: '核心机制、格式规范与快捷键速查',
    mechanismsSubtitle: '深入理解底层如何保障文件安全、无损同步与高效联动。',
    mechanisms: [
      {
        id: 'mech-scope',
        badge: '机制 1',
        title: '三层作用域解析与屏蔽（Mute）优先级规则',
        summary: 'SkillsMan 在内存解析器（Resolver）中严格按层级合并最终生效列表：',
        paragraphs: [
          '用户级与项目级彼此完全独立计算。全局配置只投递到每个已启用 Agent 的「用户级目录」，绝不会未经许可污染任何项目仓库目录。',
        ],
        bullets: [
          '用户级生效公式：(全局 Skills/工作流 − Agent 全局屏蔽项) ∪ Agent 用户级直配 Skills/工作流。直配优先级高于全局屏蔽。',
          '项目级生效公式：(项目直配 Skills ∪ 项目绑定工作流展开 − 项目排除 − 单 Agent 屏蔽) ∪ 单 Agent 例外追加。',
          '多工作流或直配重复命中同一个 Skill 时，解析器自动合并来源标签（Sources）并只部署 1 份物理目标。',
        ],
      },
      {
        id: 'mech-deploy',
        badge: '机制 2',
        title: 'Junction 联接 vs Copy 复制 & 三级覆写优先级',
        summary: '两种部署方式各自适用不同工作场景，并支持灵活的逐级覆写：',
        paragraphs: [
          '部署模式按「单项目内单 Agent 例外覆写 > 项目部署模式覆写 > Agent 默认部署模式」的顺序生效；若均未指定，默认使用 Windows Junction。',
        ],
        table: {
          headers: ['对比维度', 'Junction（目录联接，默认）', 'Copy（真实文件复制）'],
          rows: [
            { cols: ['磁盘占用', '零额外复制，指向中央库同一份物理文件', '在目标目录生成独立副本'] },
            { cols: ['编辑同步速度', '中央库改完瞬间在所有 AI 工具生效', '在抽屉保存或同步时按内容哈希对比更新'] },
            { cols: ['Windows 权限要求', '无需管理员权限（通过原生 FSCTL 重解析点实现）', '普通用户目录写入权限'] },
            { cols: ['是否适合提交 Git / Docker', '不建议（链接指向本机绝对路径）', '非常适合（真实文件可跨电脑与容器使用）'] },
            { cols: ['外部修改保护', '直接读写同一份正本', '若目标被外部改过，下次同步触发 drift 保护不覆盖'] },
          ],
        },
      },
      {
        id: 'mech-skillmd',
        badge: '机制 3',
        title: 'SKILL.md 标准格式与工作流指引生成格式',
        summary: '解析器识别文件夹内大小写不敏感的 SKILL.md（跳过 .git 和 node_modules），支持 YAML Frontmatter。',
        paragraphs: [
          '如果 SKILL.md 省略了 `name` 或 `description`，SkillsMan 会自动回退读取一级 `# 标题`（或文件夹名）与正文首段作为简介；多行描述支持 YAML `|` 或 `>` 语法，`tags`/`keywords` 支持行内数组与短横线列表。',
        ],
        codeBlock: {
          label: '标准 SKILL.md 结构示例',
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
        badge: '机制 4',
        title: '项目 .gitignore 自动托管区块格式',
        summary: '开启「自动维护 .gitignore 托管区块」后，SkillsMan 仅在专用标记之间增删条目，绝不破坏你原有的忽略规则。',
        paragraphs: [
          '当你在项目里关闭某个 Agent、取消某条 Skill 分配，或关闭托管开关时，下一次同步会自动精简或完整移除这段标记区块（不会创建空 .gitignore 文件）。',
        ],
        codeBlock: {
          label: '项目根目录 .gitignore 中的托管片段',
          code: `# >>> SkillsMan Managed >>>
.claude/skills/git-commit-helper/
.cursor/skills/git-commit-helper/
# <<< SkillsMan Managed <<<`,
        },
      },
      {
        id: 'mech-health',
        badge: '机制 5',
        title: '健康检查 4 类异常与无损冲突保护机制',
        summary: '每次刷新和同步都会扫描状态文件中的部署记录与冲突清单，绝不静默删改未知文件。',
        paragraphs: [
          '若目标位置已经存在非 SkillsMan 创建的目录、或目标目录下内容发生未知变动，同步器会记录 ConflictItem 并跳过写入，交由用户在「总览」面板抉择。',
        ],
        table: {
          headers: ['问题类型', '常见触发原因', '推荐处理动作'],
          rows: [
            { cols: ['conflict', '目标位置原本就有手动建的同名 Skill 目录，或切换 Copy→Junction 前副本有未同步修改', '想保留就点「收编入库」；想用库内版本替换就点「备份后覆盖」（原目录存入 backups/）'] },
            { cols: ['drift', '采用 Copy 模式部署后，你或同事直接在目标目录修改了文件导致哈希不一致', '在「总览」点「强制覆盖同步」用正本覆写，或先手动合并修改回中央库'] },
            { cols: ['broken-junction', 'Junction 被外部软件删成了普通目录、指向了旧移动路径，或指向目标已丢失', '点「强制覆盖同步」重建正确的目录联接'] },
            { cols: ['missing-target', '状态显示应已部署，但磁盘上的目标文件夹被外部手动删除了', '点「强制覆盖同步」或顶部「立即同步全部」重新创建'] },
          ],
        },
      },
      {
        id: 'mech-storage',
        badge: '机制 6',
        title: '数据目录、便携模式、快捷键 (Ctrl+K) 与系统托盘',
        summary: '了解所有持久化文件的存储位置、便携模式触发条件以及全局快捷操作。',
        paragraphs: [
          '标准模式下数据默认保存在 `~/.skillsman`（若修改了自定义目录，指向信息保存在 `%LOCALAPPDATA%\\SkillsMan\\bootstrap.json`）。如果在 `SkillsMan.exe` 同级目录存在名为 `portable` 的文件或 `data` 文件夹，应用会自动进入绿色便携模式，全部数据存入同级 `data/` 目录。',
        ],
        bullets: [
          '数据根目录结构：`state.json`（全局配置与部署追踪表）、`store/`（Skill 正本）、`repos/`（Git 仓库缓存）、`guides/`（工作流编排指引）、`backups/`（冲突解决备份）、`docs/`（浏览器打开文档缓存）。',
          '全局命令面板（`Ctrl+K`）：随时唤醒，支持模糊搜索页面导航、任意 Skill（回车直达详情抽屉）、工作流、项目以及「立即同步全部」「打开文档」等快捷动作。',
          'Windows 系统托盘菜单：左键单击显示/隐藏主窗口；右键支持快速勾选开关全局工作流、立即同步全部、运行健康检查、检查仓库更新、一键打开使用指南以及开机静默自启（`--minimized`）。',
        ],
      },
    ],
  },
  ui: {
    noSearchMatches: '没有找到匹配的内容，换个关键词试试吧（比如：收编、Junction、Cursor、工作流）。',
    clearSearch: '清空搜索',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    langSwitchLabel: '语言',
    offlineBadge: '单文件离线文档',
  },
};
