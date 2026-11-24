# SkillsMan

**轻量级 Windows AI Agent Skills 与工作流管理器**（基于 Go + Wails v3 + React 18 + Tailwind CSS，Windows 11 Fluent / Mica 风格）。

在一个中央库里统一管理所有 `SKILL.md` 技能包，按**全局级 / 用户级 / 项目级**三层规则精准分发到电脑上的 11 个主流 AI 编程工具（支持自定义 Agent），告别手动复制粘贴与目录混乱。

---

## 文档与小白入门教程

项目内置**完整中英双语**的零基础案例教程与功能参考手册，支持以下两种方式阅读：

- **浏览器离线版（双击即用）**：打开 [docs/index.html](docs/index.html) —— 单文件零外链依赖，复刻 Fluent / Mica 浅深色主题，包含 6 步零基础通关案例、3 条角色速通路线、交互式作用域图解、`SKILL.md` 一键复制模板与全量功能速查表。
- **应用内交互版**：启动 SkillsMan 后，点击左侧导航栏 **「使用指南」**（或按 `Ctrl+K` 搜索 / 右键系统托盘 **「使用指南与功能文档」**），可一边看案例一边**一键跳转真实功能页**或使用**新手练习沙盒**，也可随时点击右上角 **「在浏览器中打开」**。

---

## 核心特性

- **11 个内置 AI Agent + 自定义 Agent**：开箱支持 `Universal (.agents)`、`Claude Code`、`OpenAI Codex`、`Antigravity / Gemini`、`Cursor`、`Windsurf`、`VS Code Copilot`、`OpenCode`、`Trae`、`Qoder`、`CodeBuddy`，支持本机自动探测与自定义路径模板。
- **中央库统一管理**：支持新建 Skill、导入本地文件夹 / ZIP、**一键扫描收编本机散落 Skills**、Markdown 在线预览与编辑、外部编辑器打开与生效链路（Effective Trace）审计。
- **三层作用域分配矩阵**：直观切换全局级、用户级与项目级，支持单 Agent 单独屏蔽（Mute）与直配覆写。
- **多阶段工作流套件**：按阶段编排多个 Skills 为复用套件，可选自动导出 `workflow-<slug>/SKILL.md` 编排指引，支持从**系统托盘右键菜单**秒级开关全局工作流。
- **项目级隔离与安全部署**：
  - 支持 **Windows Junction**（零拷贝实时同步，无需管理员权限）与 **Copy**（真实文件复制，适合提交 Git / 容器）。
  - 支持项目级与单 Agent 级部署模式覆写，自动原子维护 `.gitignore` 托管区块（`# >>> SkillsMan Managed >>>`）。
- **仓库与在线市场**：支持 Git/GitHub 单仓与 Monorepo 递归扫描、上游更新检测、`skills.sh` 在线市场检索及自定义 JSON 源，内置 HTTP/SOCKS5 代理、GitHub 加速镜像与 Token 支持。
- **健康检查与无损冲突保护**：自动检测 `conflict`、`drift`、`broken-junction`、`missing-target`，绝不静默覆盖本地文件，提供「收编入库」「备份后覆盖」「强制覆盖同步」。
- **绿色便携模式 & 托盘驻留**：在 `SkillsMan.exe` 同级目录放置 `portable` 空文件或 `data/` 文件夹即可开启便携模式；支持关闭隐藏至托盘与开机静默自启（`--minimized`）。

---

## 开发与构建命令

> 构建前如需更新离线文档 HTML，请先执行 `pnpm --dir frontend run build:docs` 生成 `docs/index.html`（该文件会被 `docs/embed.go` 通过 `//go:embed` 内嵌进应用二进制）。

```powershell
# 1. 生成离线单文件文档 (docs/index.html)
pnpm --dir frontend run build:docs

# 2. 生成 Wails v3 TypeScript 绑定
wails3 generate bindings -clean=true -ts -i

# 3. 前端类型检查与生产构建
pnpm --dir frontend run build

# 4. 运行 Go 单元测试
go test -v ./...

# 5. 开发模式启动
wails3 dev -config ./build/config.yml

# 6. 编译 Windows 生产可执行文件
go build -tags production -trimpath -buildvcs=false -ldflags="-w -s -H windowsgui" -o bin/SkillsMan.exe .
```

---

## 目录结构概览

```text
skillsman/
├── main.go                       # Wails v3 主入口、Mica 窗口、系统托盘与后台更新检查
├── docs/
│   ├── index.html                # 独立离线双语使用指南与功能文档（由脚本生成）
│   └── embed.go                  # Go embed 嵌入定义
├── frontend/
│   ├── scripts/build-docs-html.mjs  # 从单一事实源生成 docs/index.html
│   └── src/
│       ├── data/docs/            # 双语教程与功能文档单一事实源（types/shared/zhCN/enUS）
│       ├── pages/                # 总览、分配矩阵、Skills库、工作流、项目、市场、Agent、使用指南、设置
│       └── components/           # TitleBar、NavRail、SkillDrawer、CommandPalette、FluentUI
└── internal/
    ├── agents/                   # 11 个内置 Agent 预设与路径探测
    ├── deployer/                 # Junction/Copy 部署器、健康检查、冲突处理与 .gitignore 托管
    ├── model/                    # 核心状态与前后端传输数据结构
    ├── repo/                     # Git 仓库扫描更新与 skills.sh / 自定义 JSON 注册表检索
    ├── resolver/                 # 三层作用域矩阵与生效链路解析器
    ├── service/                  # 暴露给前端的 Wails RPC 服务
    ├── skillpkg/                 # SKILL.md YAML Frontmatter 解析、哈希计算与 ZIP 导入
    ├── storage/                  # 原子状态持久化、标准目录与便携模式路径解析
    └── winutil/                  # Windows Junction、主题/强调色、开机自启与外壳启动工具
```
