import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  BookOpen,
  GitBranch,
  FolderGit2,
  Bot,
  LayoutDashboard,
  Grid3X3,
  Store,
  BookMarked,
  ExternalLink,
  Settings,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import { NavTab, useApp } from '../context/AppContext';

interface PaletteItem {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    commandOpen,
    setCommandOpen,
    snapshot,
    setActiveTab,
    openSkillDrawer,
    runSyncAll,
    notify,
    t,
  } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandOpen]);

  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: 'act-sync',
        label: t.syncAll,
        sub: 'Action · Deploy Global, User & Project targets',
        icon: <RefreshCw size={15} />,
        action: () => void runSyncAll(),
      },
      {
        id: 'act-open-docs-browser',
        label: t.docs.openBrowserCmd,
        sub: t.docs.openBrowserCmdSub,
        icon: <ExternalLink size={15} />,
        action: () =>
          void SkillsService.OpenDocsInBrowser(
            'guide',
            snapshot?.state.settings.language ?? 'zh-CN',
            snapshot?.state.settings.theme ?? 'system'
          ).catch((err: any) => notify(err?.message || String(err), 'error')),
      },
    ];

    const navMap: { id: NavTab; label: string; icon: React.ReactNode }[] = [
      { id: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard size={15} /> },
      { id: 'matrix', label: t.nav.matrix, icon: <Grid3X3 size={15} /> },
      { id: 'library', label: t.nav.library, icon: <BookOpen size={15} /> },
      { id: 'workflows', label: t.nav.workflows, icon: <GitBranch size={15} /> },
      { id: 'projects', label: t.nav.projects, icon: <FolderGit2 size={15} /> },
      { id: 'repos', label: t.nav.repos, icon: <Store size={15} /> },
      { id: 'agents', label: t.nav.agents, icon: <Bot size={15} /> },
      { id: 'docs', label: t.nav.docs, icon: <BookMarked size={15} /> },
      { id: 'settings', label: t.nav.settings, icon: <Settings size={15} /> },
    ];
    for (const n of navMap) {
      items.push({
        id: 'nav-' + n.id,
        label: n.label,
        sub: 'Navigate',
        icon: n.icon,
        action: () => setActiveTab(n.id),
      });
    }

    for (const sk of snapshot?.state.skills ?? []) {
      items.push({
        id: 'sk-' + sk.id,
        label: sk.name,
        sub: `Skill · ${sk.slug} ${sk.description ? '· ' + sk.description : ''}`,
        icon: <BookOpen size={15} />,
        action: () => openSkillDrawer(sk.id),
      });
    }

    for (const wf of snapshot?.state.workflows ?? []) {
      items.push({
        id: 'wf-' + wf.id,
        label: wf.name,
        sub: `Workflow · ${(wf.stages ?? []).length} stages`,
        icon: <GitBranch size={15} />,
        action: () => setActiveTab('workflows'),
      });
    }

    for (const p of snapshot?.state.projects ?? []) {
      items.push({
        id: 'proj-' + p.id,
        label: p.name,
        sub: `Project · ${p.path}`,
        icon: <FolderGit2 size={15} />,
        action: () => setActiveTab('projects'),
      });
    }

    return items;
  }, [snapshot, t, runSyncAll, setActiveTab, openSkillDrawer, notify]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    return allItems
      .filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.sub.toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [allItems, query]);

  if (!commandOpen) return null;

  const execute = (item: PaletteItem | undefined) => {
    if (!item) return;
    setCommandOpen(false);
    item.action();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] p-4"
      style={{ background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(4px)' }}
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-[560px] rounded-xl border border-[var(--card-border)] shadow-2xl overflow-hidden"
        style={{ background: 'var(--drawer-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--divider)] flex items-center gap-2.5">
          <Search size={16} className="text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none text-[14px] text-[var(--text-primary)]"
            placeholder={t.searchShortcutHint}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCommandOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                execute(filtered[selectedIndex]);
              }
            }}
          />
        </div>

        <div className="max-h-[340px] overflow-y-auto fluent-scroll p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-[var(--text-secondary)]">
              No matching items
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => execute(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-3 py-2 rounded-md flex items-center gap-3 text-left cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--card-subtle)]'
                }`}
              >
                <span className="text-[var(--accent)] shrink-0">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {item.label}
                  </div>
                  <div className="text-[11.5px] text-[var(--text-secondary)] truncate">
                    {item.sub}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
