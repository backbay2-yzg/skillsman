import React from 'react';
import { Minus, Square, X, Search, RefreshCw } from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import { useApp } from '../context/AppContext';
import { Badge } from './FluentUI';

export const TitleBar: React.FC = () => {
  const { snapshot, syncing, runSyncAll, setCommandOpen, t } = useApp();

  return (
    <header
      className="h-[42px] shrink-0 flex items-center justify-between pl-3.5 pr-0 select-none wails-drag"
      onDoubleClick={() => void SkillsService.WindowToggleMaximize()}
    >
      {/* Left brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/appicon.png" alt="SkillsMan" className="w-5 h-5 rounded-sm shrink-0" />
        <span className="text-[12.5px] font-semibold tracking-tight text-[var(--text-primary)]">
          {t.appName}
        </span>
        {snapshot?.portable && <Badge tone="accent">{t.portable}</Badge>}
      </div>

      {/* Center Ctrl+K quick launcher */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="wails-no-drag hidden sm:flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--card-border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors cursor-pointer min-w-[260px] max-w-[360px]"
        style={{ background: 'var(--card-subtle)' }}
      >
        <Search size={13} className="shrink-0 opacity-75" />
        <span className="truncate flex-1 text-left">{t.searchShortcutHint}</span>
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--card-bg)] border border-[var(--card-border)]">
          Ctrl+K
        </kbd>
      </button>

      {/* Right actions + Win11 caption controls */}
      <div className="flex items-center h-full wails-no-drag">
        <button
          type="button"
          onClick={() => void runSyncAll()}
          disabled={syncing}
          title={t.syncAll}
          className="mr-2 px-2.5 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin text-[var(--accent)]' : 'text-[var(--accent)]'} />
          <span className="hidden md:inline">{syncing ? t.syncing : t.syncAll}</span>
        </button>

        <button
          type="button"
          aria-label="Minimize"
          onClick={() => void SkillsService.WindowMinimize()}
          className="w-[46px] h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => void SkillsService.WindowToggleMaximize()}
          className="w-[46px] h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => void SkillsService.WindowHideOrClose()}
          className="w-[46px] h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[#C42B1C] hover:text-white transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
};
