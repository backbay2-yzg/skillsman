import React, { useState } from 'react';
import {
  LayoutDashboard,
  Grid3X3,
  BookOpen,
  GitBranch,
  FolderGit2,
  Store,
  Bot,
  BookMarked,
  Settings,
  PanelLeft,
} from 'lucide-react';
import { NavTab, useApp } from '../context/AppContext';

export const NavRail: React.FC = () => {
  const { activeTab, setActiveTab, snapshot, healthIssues, t } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const conflictCount = healthIssues.length;
  const repoUpdateCount =
    (snapshot?.state.repos ?? []).filter((r) => r.hasUpdate).length +
    (snapshot?.state.skills ?? []).filter((s) => s.hasUpdate).length;

  const mainItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; tone?: 'danger' | 'accent' }[] = [
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: <LayoutDashboard size={17} />,
      badge: conflictCount > 0 ? conflictCount : undefined,
      tone: 'danger',
    },
    { id: 'matrix', label: t.nav.matrix, icon: <Grid3X3 size={17} /> },
    { id: 'library', label: t.nav.library, icon: <BookOpen size={17} /> },
    { id: 'workflows', label: t.nav.workflows, icon: <GitBranch size={17} /> },
    { id: 'projects', label: t.nav.projects, icon: <FolderGit2 size={17} /> },
    {
      id: 'repos',
      label: t.nav.repos,
      icon: <Store size={17} />,
      badge: repoUpdateCount > 0 ? repoUpdateCount : undefined,
      tone: 'accent',
    },
    { id: 'agents', label: t.nav.agents, icon: <Bot size={17} /> },
  ];

  const renderItem = (item: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    tone?: 'danger' | 'accent';
  }) => {
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveTab(item.id)}
        title={collapsed ? item.label : undefined}
        className={`relative w-full h-[38px] px-2.5 rounded-md flex items-center gap-3 text-[13px] transition-colors cursor-pointer ${
          active
            ? 'font-medium text-[var(--text-primary)] bg-[var(--card-bg)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-subtle)]'
        }`}
      >
        {/* Magpie / Win11 3px active indicator pill */}
        {active && (
          <span
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        )}
        <span className={`shrink-0 ${active ? 'text-[var(--accent)]' : ''}`}>{item.icon}</span>
        {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
        {!collapsed && item.badge !== undefined && (
          <span
            className="px-1.5 py-0.5 text-[10.5px] font-semibold rounded-full leading-none"
            style={{
              background: item.tone === 'danger' ? 'var(--danger-soft)' : 'var(--accent-soft)',
              color: item.tone === 'danger' ? 'var(--danger)' : 'var(--accent)',
            }}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`shrink-0 flex flex-col justify-between py-2 px-2 transition-[width] duration-150 ${
        collapsed ? 'w-[54px]' : 'w-[206px]'
      }`}
    >
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full h-[34px] px-2.5 rounded-md flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-subtle)] cursor-pointer mb-1"
          title="Toggle navigation"
        >
          <PanelLeft size={16} />
        </button>
        {mainItems.map(renderItem)}
      </div>

      <div className="pt-2 border-t border-[var(--divider)] space-y-1">
        {renderItem({
          id: 'docs',
          label: t.nav.docs,
          icon: <BookMarked size={17} />,
        })}
        {renderItem({
          id: 'settings',
          label: t.nav.settings,
          icon: <Settings size={17} />,
        })}
      </div>
    </aside>
  );
};
