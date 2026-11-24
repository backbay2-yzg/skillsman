import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Events } from '@wailsio/runtime';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type {
  AppSnapshot,
  HealthIssue,
  SyncSummary,
} from '../../bindings/skillsman/internal/model/models';
import { getTranslations, Translations } from '../i18n/translations';

export type NavTab =
  | 'dashboard'
  | 'matrix'
  | 'library'
  | 'workflows'
  | 'projects'
  | 'repos'
  | 'agents'
  | 'docs'
  | 'settings';

export interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextValue {
  snapshot: AppSnapshot | null;
  loading: boolean;
  syncing: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  drawerSkillId: string | null;
  openSkillDrawer: (skillId: string) => void;
  closeSkillDrawer: () => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  healthIssues: HealthIssue[];
  t: Translations;
  isDark: boolean;
  refresh: () => Promise<void>;
  runSyncAll: () => Promise<SyncSummary | null>;
  runHealthCheck: () => Promise<HealthIssue[]>;
  notify: (message: string, kind?: ToastItem['kind']) => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function applyThemeTokens(snapshot: AppSnapshot | null) {
  const themeSetting = snapshot?.state.settings.theme ?? 'system';
  const sysDark = snapshot?.systemTheme?.isDark ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = themeSetting === 'dark' || (themeSetting === 'system' && sysDark);

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const followAccent = snapshot?.state.settings.followSystemAccent ?? true;
  const accent = followAccent && snapshot?.systemTheme?.accentColor
    ? snapshot.systemTheme.accentColor
    : isDark
    ? '#60CDFF'
    : '#0078D4';

  const rgb = hexToRgb(accent);
  root.style.setProperty('--accent', accent);
  if (rgb) {
    root.style.setProperty('--accent-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.16 : 0.13})`);
    root.style.setProperty('--accent-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.36 : 0.34})`);
    // Brighten slightly on dark hover, darken on light hover
    const d = isDark ? 16 : -16;
    const hr = Math.max(0, Math.min(255, rgb.r + d));
    const hg = Math.max(0, Math.min(255, rgb.g + d));
    const hb = Math.max(0, Math.min(255, rgb.b + d));
    root.style.setProperty('--accent-hover', `rgb(${hr}, ${hg}, ${hb})`);
  }

  return isDark;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [drawerSkillId, setDrawerSkillId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const snap = await SkillsService.GetSnapshot();
      setSnapshot(snap);
      const issues = await SkillsService.CheckHealth();
      setHealthIssues(issues ?? []);
    } catch (err) {
      console.error('Failed to refresh snapshot', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runSyncAll = useCallback(async (): Promise<SyncSummary | null> => {
    setSyncing(true);
    try {
      const res = await SkillsService.SyncAll();
      await refresh();
      const lang = snapshot?.state.settings.language;
      if (res.conflicts && res.conflicts.length > 0) {
        notify(
          lang === 'en-US'
            ? `Synced with ${res.conflicts.length} conflict(s) protected`
            : `同步完成（保留了 ${res.conflicts.length} 处冲突目录）`,
          'warning'
        );
      } else {
        notify(
          lang === 'en-US'
            ? `Synced: +${res.created} / ~${res.updated} / -${res.removed}`
            : `同步完成：新建 ${res.created} · 更新 ${res.updated} · 清理 ${res.removed}`,
          'success'
        );
      }
      return res;
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
      return null;
    } finally {
      setSyncing(false);
    }
  }, [notify, refresh, snapshot?.state.settings.language]);

  const runHealthCheck = useCallback(async (): Promise<HealthIssue[]> => {
    try {
      const issues = (await SkillsService.CheckHealth()) ?? [];
      setHealthIssues(issues);
      return issues;
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
      return [];
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offState = Events.On('state:changed', (ev: any) => {
      if (ev?.data === 'tray:health') {
        setActiveTab('dashboard');
      } else if (ev?.data === 'tray:docs') {
        setActiveTab('docs');
      }
      void refresh();
    });
    const offUpdate = Events.On('update:available', (ev: any) => {
      if (ev?.data) {
        notify(`Repos updated: ${ev.data}`, 'info');
      }
      void refresh();
    });
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      offState();
      offUpdate();
      window.removeEventListener('keydown', handleKey);
    };
  }, [notify, refresh]);

  const isDark = useMemo(() => applyThemeTokens(snapshot), [snapshot]);
  const t = useMemo(() => getTranslations(snapshot?.state.settings.language), [snapshot?.state.settings.language]);

  const value = useMemo<AppContextValue>(
    () => ({
      snapshot,
      loading,
      syncing,
      activeTab,
      setActiveTab,
      drawerSkillId,
      openSkillDrawer: (id) => setDrawerSkillId(id),
      closeSkillDrawer: () => setDrawerSkillId(null),
      commandOpen,
      setCommandOpen,
      healthIssues,
      t,
      isDark,
      refresh,
      runSyncAll,
      runHealthCheck,
      notify,
      toasts,
      dismissToast,
    }),
    [
      snapshot,
      loading,
      syncing,
      activeTab,
      drawerSkillId,
      commandOpen,
      healthIssues,
      t,
      isDark,
      refresh,
      runSyncAll,
      runHealthCheck,
      notify,
      toasts,
      dismissToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
