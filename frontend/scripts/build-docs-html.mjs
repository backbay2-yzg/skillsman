import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCS_DATA,
  BUILTIN_AGENTS_DOC,
  SKILL_TEMPLATES,
} from '../src/data/docs/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..');
const outDir = path.join(repoRoot, 'docs');
const outFile = path.join(outDir, 'index.html');
const iconPath = path.join(frontendDir, 'public', 'appicon.png');

let iconDataUri = '';
if (fs.existsSync(iconPath)) {
  const b64 = fs.readFileSync(iconPath).toString('base64');
  iconDataUri = `data:image/png;base64,${b64}`;
}

function safeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const payload = {
  docs: DOCS_DATA,
  agents: BUILTIN_AGENTS_DOC,
  templates: SKILL_TEMPLATES,
};

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SkillsMan · 使用指南与功能文档</title>
  ${iconDataUri ? `<link rel="icon" type="image/png" href="${iconDataUri}" />` : ''}
  <style>
    :root {
      color-scheme: light;
      --accent: #0078d4;
      --accent-hover: #106ebe;
      --accent-soft: rgba(0, 120, 212, 0.13);
      --accent-border: rgba(0, 120, 212, 0.34);

      --mica-bg: radial-gradient(circle at 12% 10%, rgba(0, 120, 212, 0.12), transparent 44%),
                 radial-gradient(circle at 88% 12%, rgba(3, 131, 135, 0.09), transparent 40%),
                 #f3f3f3;
      --mica-shell: rgba(243, 243, 243, 0.84);
      --mica-canvas: rgba(255, 255, 255, 0.72);
      --card-bg: rgba(255, 255, 255, 0.84);
      --card-hover: rgba(255, 255, 255, 0.96);
      --card-subtle: rgba(0, 0, 0, 0.035);
      --card-border: rgba(0, 0, 0, 0.085);
      --divider: rgba(0, 0, 0, 0.075);
      --input-bg: rgba(255, 255, 255, 0.84);
      --input-border: rgba(0, 0, 0, 0.15);
      --drawer-bg: rgba(249, 249, 249, 0.96);

      --text-primary: #1a1a1a;
      --text-secondary: #5c5c5c;
      --text-muted: #8a8a8a;

      --success: #0f7b0f;
      --success-soft: rgba(15, 123, 15, 0.12);
      --warning: #9d5d00;
      --warning-soft: rgba(157, 93, 0, 0.12);
      --danger: #c42b1c;
      --danger-soft: rgba(196, 43, 28, 0.12);
    }

    html.dark {
      color-scheme: dark;
      --accent: #60cdff;
      --accent-hover: #4cc2ff;
      --accent-soft: rgba(96, 205, 255, 0.16);
      --accent-border: rgba(96, 205, 255, 0.36);

      --mica-bg: radial-gradient(circle at 12% 10%, rgba(96, 205, 255, 0.12), transparent 44%),
                 radial-gradient(circle at 88% 12%, rgba(135, 100, 184, 0.11), transparent 40%),
                 #1b1b1b;
      --mica-shell: rgba(28, 28, 28, 0.82);
      --mica-canvas: rgba(38, 38, 38, 0.72);
      --card-bg: rgba(48, 48, 48, 0.76);
      --card-hover: rgba(58, 58, 58, 0.88);
      --card-subtle: rgba(255, 255, 255, 0.045);
      --card-border: rgba(255, 255, 255, 0.085);
      --divider: rgba(255, 255, 255, 0.08);
      --input-bg: rgba(36, 36, 36, 0.82);
      --input-border: rgba(255, 255, 255, 0.14);
      --drawer-bg: rgba(34, 34, 34, 0.96);

      --text-primary: #ffffff;
      --text-secondary: #cccccc;
      --text-muted: #929292;

      --success: #6ccb5f;
      --success-soft: rgba(108, 203, 95, 0.15);
      --warning: #fce100;
      --warning-soft: rgba(252, 225, 0, 0.14);
      --danger: #ff99a4;
      --danger-soft: rgba(255, 153, 164, 0.15);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: var(--mica-bg);
      background-attachment: fixed;
      color: var(--text-primary);
      font-family: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", "Microsoft YaHei UI", system-ui, -apple-system, sans-serif;
      font-size: 13.5px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      background: var(--mica-shell);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--divider);
    }

    .topbar-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .brand img {
      width: 24px;
      height: 24px;
      border-radius: 5px;
    }

    .brand-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .topbar-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .shell-grid {
      max-width: 1280px;
      margin: 18px auto 40px;
      padding: 0 20px;
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .toc-rail {
      position: sticky;
      top: 72px;
      background: var(--mica-canvas);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 10px;
      max-height: calc(100vh - 96px);
      overflow-y: auto;
    }

    .toc-group-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      padding: 6px 10px 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .toc-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 12.5px;
      text-align: left;
      cursor: pointer;
      transition: background-color 120ms ease, color 120ms ease;
    }

    .toc-link:hover {
      background: var(--card-subtle);
      color: var(--text-primary);
      text-decoration: none;
    }

    .toc-link.active {
      background: var(--card-bg);
      color: var(--text-primary);
      font-weight: 600;
    }

    .toc-link.active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      border-radius: 999px;
      background: var(--accent);
    }

    .canvas-main {
      background: var(--mica-canvas);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
      min-width: 0;
    }

    .fluent-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      transition: background-color 140ms ease, border-color 140ms ease;
    }

    .fluent-card-interactive:hover {
      background: var(--card-hover);
    }

    .fluent-input {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-bottom: 2px solid var(--input-border);
      color: var(--text-primary);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }

    .fluent-input:focus {
      border-bottom-color: var(--accent);
    }

    .fluent-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      color: var(--text-primary);
      font-family: inherit;
      transition: background-color 120ms ease, border-color 120ms ease;
    }

    .fluent-btn:hover {
      background: var(--card-hover);
    }

    .fluent-btn-primary {
      background: var(--accent);
      color: #ffffff;
      border-color: transparent;
    }

    html.dark .fluent-btn-primary {
      color: #0b1926;
      font-weight: 600;
    }

    .fluent-btn-primary:hover {
      background: var(--accent-hover);
    }

    .segmented {
      display: inline-flex;
      align-items: center;
      padding: 2px;
      border-radius: 7px;
      border: 1px solid var(--card-border);
      background: var(--card-subtle);
      gap: 2px;
    }

    .segmented button {
      border: none;
      background: transparent;
      color: var(--text-secondary);
      padding: 5px 11px;
      border-radius: 5px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 120ms ease, color 120ms ease;
    }

    .segmented button.active {
      background: var(--card-hover);
      color: var(--text-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .badge-neutral {
      background: var(--card-subtle);
      color: var(--text-secondary);
      border-color: var(--card-border);
    }
    .badge-accent {
      background: var(--accent-soft);
      color: var(--accent);
      border-color: var(--accent-border);
    }
    .badge-success {
      background: var(--success-soft);
      color: var(--success);
    }
    .badge-warning {
      background: var(--warning-soft);
      color: var(--warning);
    }
    .badge-danger {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .hero-box {
      padding: 20px;
      margin-bottom: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hero-box h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    .hero-box p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 13.5px;
    }

    .section-block {
      margin-top: 26px;
      scroll-margin-top: 76px;
    }

    .section-head {
      margin-bottom: 12px;
    }

    .section-head h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .section-head p {
      margin: 4px 0 0;
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .scope-flow {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    .scope-node {
      padding: 12px;
      text-align: left;
      cursor: pointer;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      color: var(--text-primary);
      font-family: inherit;
      transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
    }

    .scope-node:hover {
      background: var(--card-hover);
    }

    .scope-node.active {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .progress-bar-track {
      height: 8px;
      border-radius: 999px;
      background: var(--card-subtle);
      border: 1px solid var(--card-border);
      overflow: hidden;
      flex: 1;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 999px;
      transition: width 220ms ease;
    }

    .case-card {
      padding: 18px;
      margin-bottom: 14px;
      scroll-margin-top: 78px;
    }

    .case-card.flash-highlight {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-soft);
    }

    .step-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: var(--card-subtle);
      border: 1px solid var(--card-border);
    }

    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--accent);
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    html.dark .step-num {
      color: #0b1926;
    }

    .tip-callout {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--accent-soft);
      border-left: 3px solid var(--accent);
      font-size: 12px;
      color: var(--text-primary);
    }

    .verify-box {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 7px;
      background: var(--success-soft);
      border: 1px solid transparent;
      font-size: 12.5px;
      color: var(--text-primary);
    }

    details.expander {
      margin-top: 12px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: var(--card-subtle);
      overflow: hidden;
    }

    details.expander summary {
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    details.expander summary::-webkit-details-marker {
      display: none;
    }

    details.expander summary::after {
      content: "▾";
      font-size: 12px;
      color: var(--text-secondary);
      transition: transform 140ms ease;
    }

    details.expander[open] summary::after {
      transform: rotate(180deg);
    }

    details.expander .expander-body {
      padding: 0 12px 12px;
      border-top: 1px solid var(--divider);
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    pre.code-block {
      margin: 8px 0 0;
      padding: 12px;
      border-radius: 7px;
      background: var(--card-subtle);
      border: 1px solid var(--card-border);
      font-family: "Cascadia Code", "Consolas", monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      color: var(--text-primary);
      white-space: pre;
    }

    code.inline {
      font-family: "Cascadia Code", "Consolas", monospace;
      font-size: 12px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--card-subtle);
      border: 1px solid var(--card-border);
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      background: var(--card-bg);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    th, td {
      text-align: left;
      padding: 9px 12px;
      border-bottom: 1px solid var(--divider);
      vertical-align: top;
    }

    th {
      font-weight: 600;
      background: var(--card-subtle);
      color: var(--text-primary);
      white-space: nowrap;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 60;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: var(--drawer-bg);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
      font-size: 12.5px;
      opacity: 0;
      pointer-events: none;
      transform: translateY(8px);
      transition: opacity 150ms ease, transform 150ms ease;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 960px) {
      .shell-grid {
        grid-template-columns: 1fr;
      }
      .toc-rail {
        position: static;
        max-height: none;
      }
      .grid-2, .grid-3, .scope-flow {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      .topbar, .toc-rail, .no-print {
        display: none !important;
      }
      .shell-grid {
        display: block;
        margin: 0;
        padding: 0;
      }
      .canvas-main {
        border: none;
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        ${iconDataUri ? `<img src="${iconDataUri}" alt="SkillsMan" />` : ''}
        <span class="brand-title" id="brandTitle">SkillsMan</span>
        <span class="badge badge-accent" id="offlineBadge"></span>
      </div>

      <div class="segmented" id="mainTabSwitch"></div>

      <div class="topbar-controls">
        <input type="search" id="searchInput" class="fluent-input" style="min-width: 220px;" />
        <div class="segmented" id="langSwitch"></div>
        <div class="segmented" id="themeSwitch"></div>
      </div>
    </div>
  </header>

  <div class="shell-grid">
    <aside class="toc-rail" id="tocRail"></aside>
    <main class="canvas-main" id="mainContent"></main>
  </div>

  <div class="toast" id="toastBox"></div>

  <script>
    const LAUNCH_PREF = /*__SKILLSMAN_LAUNCH_PREF__*/null;
    const DATA = ${safeJsonForScript(payload)};
    const PROGRESS_KEY = 'skillsman.docs.progress.v1';

    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function parseHashParams() {
      const h = (window.location.hash || '').replace(/^#/, '');
      if (!h || !h.includes('=')) return {};
      const out = {};
      for (const pair of h.split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) out[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      return out;
    }

    function loadProgress() {
      try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
      } catch {
        return new Set();
      }
    }

    function saveProgress(set) {
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(set)));
      } catch {}
    }

    const hashPref = parseHashParams();
    let initialPref = {
      tab: localStorage.getItem('skillsman.docs.tab') || 'guide',
      lang: localStorage.getItem('skillsman.docs.lang') || 'zh-CN',
      theme: localStorage.getItem('skillsman.docs.theme') || 'system',
    };

    if (LAUNCH_PREF && typeof LAUNCH_PREF === 'object') {
      const lastTs = localStorage.getItem('skillsman.docs.lastLaunchTs');
      if (String(LAUNCH_PREF.ts || '') !== String(lastTs || '')) {
        if (LAUNCH_PREF.tab === 'guide' || LAUNCH_PREF.tab === 'features') initialPref.tab = LAUNCH_PREF.tab;
        if (LAUNCH_PREF.lang === 'zh-CN' || LAUNCH_PREF.lang === 'en-US') initialPref.lang = LAUNCH_PREF.lang;
        if (LAUNCH_PREF.theme === 'system' || LAUNCH_PREF.theme === 'light' || LAUNCH_PREF.theme === 'dark') {
          initialPref.theme = LAUNCH_PREF.theme;
        }
        try {
          localStorage.setItem('skillsman.docs.lastLaunchTs', String(LAUNCH_PREF.ts || ''));
        } catch {}
      }
    }

    if (hashPref.tab === 'guide' || hashPref.tab === 'features') initialPref.tab = hashPref.tab;
    if (hashPref.lang === 'zh-CN' || hashPref.lang === 'en-US') initialPref.lang = hashPref.lang;
    if (hashPref.theme === 'system' || hashPref.theme === 'light' || hashPref.theme === 'dark') {
      initialPref.theme = hashPref.theme;
    }

    const state = {
      tab: initialPref.tab === 'features' ? 'features' : 'guide',
      lang: initialPref.lang === 'en-US' ? 'en-US' : 'zh-CN',
      theme: ['system', 'light', 'dark'].includes(initialPref.theme) ? initialPref.theme : 'system',
      route: 'trackA',
      activeScope: 'store',
      activeToc: '',
      search: '',
      doneCases: loadProgress(),
    };

    function applyTheme() {
      const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = state.theme === 'dark' || (state.theme === 'system' && sysDark);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.lang = state.lang;
      try {
        localStorage.setItem('skillsman.docs.tab', state.tab);
        localStorage.setItem('skillsman.docs.lang', state.lang);
        localStorage.setItem('skillsman.docs.theme', state.theme);
      } catch {}
    }

    function showToast(msg) {
      const el = document.getElementById('toastBox');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    }

    async function copyText(text, okMsg) {
      try {
        await navigator.clipboard.writeText(text);
        showToast(okMsg);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(okMsg);
      }
    }

    function matchesQuery(text, q) {
      if (!q) return true;
      return String(text || '').toLowerCase().includes(q);
    }

    function scrollToSection(id) {
      state.activeToc = id;
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('flash-highlight');
        setTimeout(() => target.classList.remove('flash-highlight'), 1400);
      }
      renderToc();
    }

    function renderTopbar() {
      const doc = DATA.docs[state.lang];
      document.title = doc.hero.title;
      document.getElementById('offlineBadge').textContent = doc.ui.offlineBadge;
      const searchInput = document.getElementById('searchInput');
      searchInput.placeholder = doc.hero.searchPlaceholder;
      if (searchInput.value !== state.search) searchInput.value = state.search;

      document.getElementById('mainTabSwitch').innerHTML = [
        { id: 'guide', label: doc.hero.tabGuide },
        { id: 'features', label: doc.hero.tabFeatures },
      ]
        .map(
          (item) =>
            \`<button type="button" class="\${state.tab === item.id ? 'active' : ''}" data-tab="\${item.id}">\${escapeHtml(item.label)}</button>\`
        )
        .join('');

      document.getElementById('langSwitch').innerHTML = [
        { id: 'zh-CN', label: '中文' },
        { id: 'en-US', label: 'EN' },
      ]
        .map(
          (item) =>
            \`<button type="button" class="\${state.lang === item.id ? 'active' : ''}" data-lang="\${item.id}">\${item.label}</button>\`
        )
        .join('');

      document.getElementById('themeSwitch').innerHTML = [
        { id: 'system', label: doc.ui.themeSystem },
        { id: 'light', label: doc.ui.themeLight },
        { id: 'dark', label: doc.ui.themeDark },
      ]
        .map(
          (item) =>
            \`<button type="button" class="\${state.theme === item.id ? 'active' : ''}" data-theme="\${item.id}">\${escapeHtml(item.label)}</button>\`
        )
        .join('');
    }

    function renderToc() {
      const doc = DATA.docs[state.lang];
      const rail = document.getElementById('tocRail');
      const items =
        state.tab === 'guide'
          ? [
              { group: doc.hero.tabGuide, links: [
                { id: 'sec-concepts', label: doc.guide.conceptsTitle },
                { id: 'sec-scope', label: doc.guide.scopeDiagramTitle },
                { id: 'sec-legend', label: doc.guide.matrixLegendTitle },
                { id: 'sec-routes', label: state.route === 'trackA' ? doc.guide.routeSwitchLabelA : doc.guide.routeSwitchLabelB },
                ...doc.guide.cases.map((c) => ({ id: c.id, label: c.badge + ' · ' + c.title })),
                { id: 'sec-templates', label: doc.guide.templatesTitle },
              ]},
            ]
          : [
              { group: doc.features.tocModulesTitle, links: doc.features.modules.map((m) => ({ id: m.id, label: m.title })) },
              { group: doc.features.tocAgentsTitle, links: [{ id: 'sec-agents-table', label: doc.features.agentsTitle }] },
              { group: doc.features.tocMechanismsTitle, links: doc.features.mechanisms.map((m) => ({ id: m.id, label: m.title })) },
            ];

      rail.innerHTML = items
        .map(
          (g) => \`
          <div class="toc-group-label">\${escapeHtml(g.group)}</div>
          \${g.links
            .map(
              (l) =>
                \`<button type="button" class="toc-link \${state.activeToc === l.id ? 'active' : ''}" data-scroll="\${escapeHtml(l.id)}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(l.label)}</span></button>\`
            )
            .join('')}
        \`
        )
        .join('');
    }

    function renderGuide() {
      const doc = DATA.docs[state.lang];
      const q = state.search.trim().toLowerCase();
      const totalCases = doc.guide.cases.length;
      const doneCount = doc.guide.cases.filter((c) => state.doneCases.has(c.id)).length;
      const pct = Math.round((doneCount / Math.max(1, totalCases)) * 100);

      const concepts = doc.guide.concepts.filter((c) =>
        matchesQuery(c.title + ' ' + c.analogy + ' ' + c.summary + ' ' + c.details.join(' '), q)
      );
      const cases = doc.guide.cases.filter((c) =>
        matchesQuery(
          c.badge + ' ' + c.title + ' ' + c.scenario + ' ' + c.goal + ' ' +
          c.steps.map((s) => s.title + ' ' + s.detail + ' ' + s.uiPath).join(' ') + ' ' +
          c.advancedNote.title + ' ' + c.advancedNote.bullets.join(' '),
          q
        )
      );
      const roles = doc.guide.roles.filter((r) =>
        matchesQuery(r.title + ' ' + r.subtitle + ' ' + r.persona + ' ' + r.outcome + ' ' + r.checklist.map((i) => i.label).join(' '), q)
      );
      const templates = DATA.templates.filter((t) => {
        const title = state.lang === 'en-US' ? t.titleEn : t.titleZh;
        const desc = state.lang === 'en-US' ? t.descEn : t.descZh;
        return matchesQuery(title + ' ' + desc + ' ' + t.code, q);
      });

      const activeScopeObj =
        doc.guide.scopeLayers.find((l) => l.id === state.activeScope) || doc.guide.scopeLayers[0];

      const noResults =
        q && concepts.length === 0 && cases.length === 0 && roles.length === 0 && templates.length === 0;

      if (noResults) {
        return \`
          <div class="fluent-card" style="padding: 36px; text-align: center;">
            <p style="color: var(--text-secondary); margin: 0 0 12px;">\${escapeHtml(doc.ui.noSearchMatches)}</p>
            <button type="button" class="fluent-btn fluent-btn-primary" id="clearSearchBtn">\${escapeHtml(doc.ui.clearSearch)}</button>
          </div>
        \`;
      }

      return \`
        <section class="fluent-card hero-box">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <span class="badge badge-accent">\${escapeHtml(doc.hero.badge)}</span>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;color:var(--text-secondary);">\${escapeHtml(doc.hero.progressLabel)}: <strong>\${doneCount}/\${totalCases}</strong> (\${pct}%)</span>
              <div class="progress-bar-track" style="width:120px;"><div class="progress-bar-fill" style="width:\${pct}%;"></div></div>
              \${doneCount > 0 ? \`<button type="button" class="fluent-btn" id="resetProgressBtn">\${escapeHtml(doc.hero.resetProgressBtn)}</button>\` : ''}
            </div>
          </div>
          <h1>\${escapeHtml(doc.hero.title)}</h1>
          <p>\${escapeHtml(doc.hero.subtitle)}</p>
        </section>

        \${concepts.length > 0 ? \`
        <section class="section-block" id="sec-concepts">
          <div class="section-head">
            <h2>\${escapeHtml(doc.guide.conceptsTitle)}</h2>
            <p>\${escapeHtml(doc.guide.conceptsSubtitle)}</p>
          </div>
          <div class="grid-2">
            \${concepts
              .map(
                (c) => \`
              <article class="fluent-card" style="padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span class="badge badge-accent">\${escapeHtml(c.badge)}</span>
                  <strong style="font-size:14.5px;">\${escapeHtml(c.title)}</strong>
                </div>
                <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:6px;">\${escapeHtml(c.analogy)}</div>
                <p style="margin:0 0 8px;font-size:12.5px;color:var(--text-secondary);">\${escapeHtml(c.summary)}</p>
                <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--text-secondary);">
                  \${c.details.map((d) => \`<li style="margin:3px 0;">\${escapeHtml(d)}</li>\`).join('')}
                </ul>
              </article>
            \`
              )
              .join('')}
          </div>
        </section>
        \` : ''}

        \${!q ? \`
        <section class="section-block" id="sec-scope">
          <div class="section-head">
            <h2>\${escapeHtml(doc.guide.scopeDiagramTitle)}</h2>
            <p>\${escapeHtml(doc.guide.scopeDiagramSubtitle)}</p>
          </div>
          <div class="scope-flow">
            \${doc.guide.scopeLayers
              .map(
                (l) => \`
              <button type="button" class="scope-node \${state.activeScope === l.id ? 'active' : ''}" data-scope="\${escapeHtml(l.id)}">
                <span class="badge \${state.activeScope === l.id ? 'badge-accent' : 'badge-neutral'}" style="margin-bottom:6px;">\${escapeHtml(l.badge)}</span>
                <div style="font-weight:600;font-size:13px;margin-bottom:3px;">\${escapeHtml(l.title)}</div>
                <div style="font-size:11px;font-family:monospace;color:var(--text-muted);word-break:break-all;">\${escapeHtml(l.pathHint)}</div>
              </button>
            \`
              )
              .join('')}
          </div>
          <div class="fluent-card" style="padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span class="badge badge-accent">\${escapeHtml(activeScopeObj.badge)}</span>
              <strong>\${escapeHtml(activeScopeObj.title)}</strong>
              <code class="inline">\${escapeHtml(activeScopeObj.pathHint)}</code>
            </div>
            <p style="margin:4px 0;font-size:12.5px;color:var(--text-secondary);">\${escapeHtml(activeScopeObj.meaning)}</p>
            <p style="margin:4px 0;font-size:12.5px;"><strong>→</strong> \${escapeHtml(activeScopeObj.whenToUse)}</p>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted);">\${escapeHtml(activeScopeObj.ruleSummary)}</p>
          </div>
        </section>

        <section class="section-block" id="sec-legend">
          <div class="section-head">
            <h2>\${escapeHtml(doc.guide.matrixLegendTitle)}</h2>
            <p>\${escapeHtml(doc.guide.matrixLegendSubtitle)}</p>
          </div>
          <div class="fluent-card" style="padding:14px;display:grid;gap:8px;">
            \${doc.guide.matrixLegend
              .map(
                (item) => \`
              <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:6px;background:var(--card-subtle);">
                <span class="badge badge-\${escapeHtml(item.tone)}" style="min-width:86px;justify-content:center;">\${escapeHtml(item.label)}</span>
                <div style="font-size:12.5px;flex:1;">
                  <div>\${escapeHtml(item.meaning)}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">\${escapeHtml(item.clickAction)}</div>
                </div>
              </div>
            \`
              )
              .join('')}
          </div>
        </section>
        \` : ''}

        <section class="section-block" id="sec-routes">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
            <div class="segmented" id="routeSwitch">
              <button type="button" class="\${state.route === 'trackA' ? 'active' : ''}" data-route="trackA">\${escapeHtml(doc.guide.routeSwitchLabelA)}</button>
              <button type="button" class="\${state.route === 'trackB' ? 'active' : ''}" data-route="trackB">\${escapeHtml(doc.guide.routeSwitchLabelB)}</button>
            </div>
            <span style="font-size:12.5px;color:var(--text-secondary);">\${escapeHtml(state.route === 'trackA' ? doc.guide.routeADesc : doc.guide.routeBDesc)}</span>
          </div>

          \${state.route === 'trackA' || q
            ? cases
                .map((c) => {
                  const done = state.doneCases.has(c.id);
                  return \`
                <article class="fluent-card case-card" id="\${escapeHtml(c.id)}">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                    <div>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                        <span class="badge badge-accent">\${escapeHtml(c.badge)}</span>
                        <span class="badge badge-neutral">\${escapeHtml(c.duration)}</span>
                        \${done ? \`<span class="badge badge-success">✓ \${escapeHtml(doc.guide.doneBadge)}</span>\` : ''}
                      </div>
                      <h3 style="margin:0;font-size:16px;font-weight:600;">\${escapeHtml(c.title)}</h3>
                    </div>
                    <label class="fluent-btn no-print" style="user-select:none;">
                      <input type="checkbox" class="case-check" data-case="\${escapeHtml(c.id)}" \${done ? 'checked' : ''} />
                      <span>\${escapeHtml(doc.guide.doneCheckboxLabel)}</span>
                    </label>
                  </div>

                  <div style="padding:10px 12px;border-radius:7px;background:var(--card-subtle);margin-bottom:12px;font-size:12.5px;">
                    <div><strong>\${state.lang === 'en-US' ? 'Scenario:' : '适用场景：'}</strong> \${escapeHtml(c.scenario)}</div>
                    <div style="margin-top:4px;color:var(--text-secondary);"><strong>\${state.lang === 'en-US' ? 'Goal:' : '达成目标：'}</strong> \${escapeHtml(c.goal)}</div>
                  </div>

                  <div style="display:grid;gap:8px;">
                    \${c.steps
                      .map(
                        (s, idx) => \`
                      <div class="step-item">
                        <span class="step-num">\${idx + 1}</span>
                        <div style="flex:1;min-width:0;">
                          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                            <strong style="font-size:13.5px;">\${escapeHtml(s.title)}</strong>
                            <span class="badge badge-neutral">\${escapeHtml(s.uiPath)}</span>
                          </div>
                          <p style="margin:5px 0 0;font-size:12.5px;color:var(--text-secondary);">\${escapeHtml(s.detail)}</p>
                          \${s.tip ? \`<div class="tip-callout">\${escapeHtml(s.tip)}</div>\` : ''}
                        </div>
                      </div>
                    \`
                      )
                      .join('')}
                  </div>

                  <div class="verify-box">
                    <strong>✓ \${escapeHtml(doc.guide.verifyLabel)}</strong> \${escapeHtml(c.verify)}
                  </div>

                  <details class="expander">
                    <summary>\${escapeHtml(c.advancedNote.title)}</summary>
                    <div class="expander-body">
                      <ul style="margin:8px 0 0;padding-left:18px;">
                        \${c.advancedNote.bullets.map((b) => \`<li style="margin:4px 0;">\${escapeHtml(b)}</li>\`).join('')}
                      </ul>
                    </div>
                  </details>
                </article>
              \`;
                })
                .join('')
            : ''}

          \${state.route === 'trackB' || q
            ? \`
            <div class="grid-3" style="margin-top: 12px;">
              \${roles
                .map(
                  (r) => \`
                <article class="fluent-card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                  <div>
                    <span class="badge badge-accent" style="margin-bottom:8px;">\${escapeHtml(r.badge)}</span>
                    <h3 style="margin:0 0 4px;font-size:15.5px;">\${escapeHtml(r.title)}</h3>
                    <div style="font-size:12.5px;color:var(--accent);font-weight:500;margin-bottom:8px;">\${escapeHtml(r.subtitle)}</div>
                    <p style="margin:0 0 6px;font-size:12px;color:var(--text-secondary);">\${escapeHtml(r.persona)}</p>
                    <p style="margin:0 0 10px;font-size:12px;color:var(--text-primary);">\${escapeHtml(r.outcome)}</p>
                    <div style="display:grid;gap:6px;">
                      \${r.checklist
                        .map(
                          (item) => \`
                        <button type="button" class="fluent-btn" style="justify-content:flex-start;text-align:left;font-size:12px;" data-jump-case="\${escapeHtml(item.caseId)}">
                          \${escapeHtml(item.label)}
                        </button>
                      \`
                        )
                        .join('')}
                    </div>
                  </div>
                  <button type="button" class="fluent-btn fluent-btn-primary" data-jump-case="\${escapeHtml(r.recommendedCaseIds[0] || 'case-1')}">
                    \${escapeHtml(doc.guide.roleGoCaseBtn)} →
                  </button>
                </article>
              \`
                )
                .join('')}
            </div>
          \`
            : ''}
        </section>

        \${templates.length > 0 ? \`
        <section class="section-block" id="sec-templates">
          <div class="section-head">
            <h2>\${escapeHtml(doc.guide.templatesTitle)}</h2>
            <p>\${escapeHtml(doc.guide.templatesSubtitle)}</p>
          </div>
          <div style="display:grid;gap:12px;">
            \${templates
              .map((t) => {
                const title = state.lang === 'en-US' ? t.titleEn : t.titleZh;
                const desc = state.lang === 'en-US' ? t.descEn : t.descZh;
                return \`
                <article class="fluent-card" style="padding:16px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span class="badge badge-accent">\${escapeHtml(t.badge)}</span>
                        <strong>\${escapeHtml(title)}</strong>
                      </div>
                      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">\${escapeHtml(desc)}</div>
                    </div>
                    <button type="button" class="fluent-btn fluent-btn-primary copy-tpl-btn" data-tpl="\${escapeHtml(t.id)}">\${escapeHtml(doc.guide.copyBtn)}</button>
                  </div>
                  <pre class="code-block">\${escapeHtml(t.code)}</pre>
                </article>
              \`;
              })
              .join('')}
          </div>
        </section>
        \` : ''}
      \`;
    }

    function renderFeatures() {
      const doc = DATA.docs[state.lang];
      const q = state.search.trim().toLowerCase();

      const modules = doc.features.modules.filter((m) =>
        matchesQuery(
          m.badge + ' ' + m.title + ' ' + m.summary + ' ' +
          m.controls.map((c) => c.name + ' ' + c.desc).join(' ') + ' ' +
          m.tips.join(' '),
          q
        )
      );

      const agents = DATA.agents.filter((a) =>
        matchesQuery(
          a.name + ' ' + a.userSkillsDir + ' ' + a.projectSkillsRelDir + ' ' +
          (state.lang === 'en-US' ? a.detectNotesEn : a.detectNotesZh),
          q
        )
      );

      const mechanisms = doc.features.mechanisms.filter((m) =>
        matchesQuery(
          m.badge + ' ' + m.title + ' ' + m.summary + ' ' + m.paragraphs.join(' ') + ' ' +
          (m.bullets || []).join(' ') + ' ' + (m.codeBlock?.code || ''),
          q
        )
      );

      if (q && modules.length === 0 && agents.length === 0 && mechanisms.length === 0) {
        return \`
          <div class="fluent-card" style="padding: 36px; text-align: center;">
            <p style="color: var(--text-secondary); margin: 0 0 12px;">\${escapeHtml(doc.ui.noSearchMatches)}</p>
            <button type="button" class="fluent-btn fluent-btn-primary" id="clearSearchBtn">\${escapeHtml(doc.ui.clearSearch)}</button>
          </div>
        \`;
      }

      return \`
        <section class="fluent-card hero-box">
          <span class="badge badge-accent" style="align-self:flex-start;">\${escapeHtml(doc.hero.tabFeatures)}</span>
          <h1>\${escapeHtml(doc.features.modulesTitle)}</h1>
          <p>\${escapeHtml(doc.features.modulesSubtitle)}</p>
        </section>

        \${modules.length > 0 ? \`
        <section class="section-block" id="sec-modules" style="margin-top:0;">
          <div style="display:grid;gap:12px;">
            \${modules
              .map(
                (m) => \`
              <article class="fluent-card" style="padding:18px;scroll-margin-top:76px;" id="\${escapeHtml(m.id)}">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                  <span class="badge badge-accent">\${escapeHtml(m.badge)}</span>
                  <h3 style="margin:0;font-size:16px;">\${escapeHtml(m.title)}</h3>
                </div>
                <p style="margin:0 0 12px;font-size:13px;color:var(--text-secondary);">\${escapeHtml(m.summary)}</p>
                <div style="display:grid;gap:7px;">
                  \${m.controls
                    .map(
                      (c) => \`
                    <div style="padding:9px 11px;border-radius:6px;background:var(--card-subtle);border:1px solid var(--card-border);">
                      <strong style="font-size:12.5px;">\${escapeHtml(c.name)}</strong>
                      <div style="font-size:12.5px;color:var(--text-secondary);margin-top:2px;">\${escapeHtml(c.desc)}</div>
                    </div>
                  \`
                    )
                    .join('')}
                </div>
                \${m.tips.length > 0 ? \`
                  <div class="tip-callout" style="margin-top:10px;">
                    <strong>\${escapeHtml(doc.features.tipsLabel)}:</strong> \${escapeHtml(m.tips.join(' '))}
                  </div>
                \` : ''}
              </article>
            \`
              )
              .join('')}
          </div>
        </section>
        \` : ''}

        \${agents.length > 0 ? \`
        <section class="section-block" id="sec-agents-table">
          <div class="section-head">
            <h2>\${escapeHtml(doc.features.agentsTitle)}</h2>
            <p>\${escapeHtml(doc.features.agentsSubtitle)}</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  \${doc.features.agentsHeaders.map((h) => \`<th>\${escapeHtml(h)}</th>\`).join('')}
                </tr>
              </thead>
              <tbody>
                \${agents
                  .map(
                    (a) => \`
                  <tr>
                    <td><strong>\${escapeHtml(a.name)}</strong></td>
                    <td><code class="inline">\${escapeHtml(a.userSkillsDir)}</code></td>
                    <td><code class="inline">\${escapeHtml(a.projectSkillsRelDir)}</code></td>
                    <td><span class="badge badge-neutral">\${escapeHtml(a.defaultMode)}</span></td>
                    <td style="color:var(--text-secondary);">\${escapeHtml(state.lang === 'en-US' ? a.detectNotesEn : a.detectNotesZh)}</td>
                  </tr>
                \`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </section>
        \` : ''}

        \${mechanisms.length > 0 ? \`
        <section class="section-block" id="sec-mechanisms">
          <div class="section-head">
            <h2>\${escapeHtml(doc.features.mechanismsTitle)}</h2>
            <p>\${escapeHtml(doc.features.mechanismsSubtitle)}</p>
          </div>
          <div style="display:grid;gap:12px;">
            \${mechanisms
              .map(
                (m) => \`
              <article class="fluent-card" style="padding:18px;scroll-margin-top:76px;" id="\${escapeHtml(m.id)}">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                  <span class="badge badge-accent">\${escapeHtml(m.badge)}</span>
                  <h3 style="margin:0;font-size:15.5px;">\${escapeHtml(m.title)}</h3>
                </div>
                <p style="margin:0 0 8px;font-size:13px;color:var(--text-primary);">\${escapeHtml(m.summary)}</p>
                \${m.paragraphs.map((p) => \`<p style="margin:6px 0;font-size:12.5px;color:var(--text-secondary);">\${escapeHtml(p)}</p>\`).join('')}
                \${m.bullets && m.bullets.length > 0 ? \`
                  <ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">
                    \${m.bullets.map((b) => \`<li style="margin:4px 0;">\${escapeHtml(b)}</li>\`).join('')}
                  </ul>
                \` : ''}
                \${m.table ? \`
                  <div class="table-wrap" style="margin-top:10px;">
                    <table>
                      <thead><tr>\${m.table.headers.map((h) => \`<th>\${escapeHtml(h)}</th>\`).join('')}</tr></thead>
                      <tbody>
                        \${m.table.rows.map((r) => \`<tr>\${r.cols.map((col) => \`<td>\${escapeHtml(col)}</td>\`).join('')}</tr>\`).join('')}
                      </tbody>
                    </table>
                  </div>
                \` : ''}
                \${m.codeBlock ? \`
                  <div style="margin-top:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <span style="font-size:12px;color:var(--text-muted);font-weight:600;">\${escapeHtml(m.codeBlock.label)}</span>
                      <button type="button" class="fluent-btn copy-mech-btn" data-mech="\${escapeHtml(m.id)}">\${escapeHtml(doc.guide.copyBtn)}</button>
                    </div>
                    <pre class="code-block">\${escapeHtml(m.codeBlock.code)}</pre>
                  </div>
                \` : ''}
              </article>
            \`
              )
              .join('')}
          </div>
        </section>
        \` : ''}
      \`;
    }

    function renderAll() {
      applyTheme();
      renderTopbar();
      renderToc();
      document.getElementById('mainContent').innerHTML =
        state.tab === 'guide' ? renderGuide() : renderFeatures();
    }

    document.getElementById('mainTabSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      state.tab = btn.dataset.tab;
      state.activeToc = '';
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('langSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      state.lang = btn.dataset.lang;
      renderAll();
    });

    document.getElementById('themeSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-theme]');
      if (!btn) return;
      state.theme = btn.dataset.theme;
      renderAll();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      state.search = e.target.value || '';
      renderAll();
    });

    document.getElementById('tocRail').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-scroll]');
      if (!btn) return;
      scrollToSection(btn.dataset.scroll);
    });

    document.getElementById('mainContent').addEventListener('click', (e) => {
      const scopeBtn = e.target.closest('button[data-scope]');
      if (scopeBtn) {
        state.activeScope = scopeBtn.dataset.scope;
        renderAll();
        return;
      }
      const routeBtn = e.target.closest('button[data-route]');
      if (routeBtn) {
        state.route = routeBtn.dataset.route;
        renderAll();
        return;
      }
      const jumpBtn = e.target.closest('button[data-jump-case]');
      if (jumpBtn) {
        const cid = jumpBtn.dataset.jumpCase;
        state.route = 'trackA';
        renderAll();
        setTimeout(() => scrollToSection(cid), 30);
        return;
      }
      const resetBtn = e.target.closest('#resetProgressBtn');
      if (resetBtn) {
        state.doneCases.clear();
        saveProgress(state.doneCases);
        renderAll();
        return;
      }
      const clearBtn = e.target.closest('#clearSearchBtn');
      if (clearBtn) {
        state.search = '';
        renderAll();
        return;
      }
      const copyTplBtn = e.target.closest('button.copy-tpl-btn');
      if (copyTplBtn) {
        const tpl = DATA.templates.find((t) => t.id === copyTplBtn.dataset.tpl);
        if (tpl) {
          copyText(tpl.code, DATA.docs[state.lang].guide.copiedText);
        }
        return;
      }
      const copyMechBtn = e.target.closest('button.copy-mech-btn');
      if (copyMechBtn) {
        const m = DATA.docs[state.lang].features.mechanisms.find((x) => x.id === copyMechBtn.dataset.mech);
        if (m && m.codeBlock) {
          copyText(m.codeBlock.code, DATA.docs[state.lang].guide.copiedText);
        }
      }
    });

    document.getElementById('mainContent').addEventListener('change', (e) => {
      const cb = e.target.closest('input.case-check');
      if (!cb) return;
      const cid = cb.dataset.case;
      if (cb.checked) state.doneCases.add(cid);
      else state.doneCases.delete(cid);
      saveProgress(state.doneCases);
      renderAll();
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.theme === 'system') applyTheme();
      });
    }

    renderAll();
  </script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
console.log(`Generated ${outFile} (${Buffer.byteLength(html, 'utf8')} bytes)`);
