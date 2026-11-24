import React, { useState } from 'react';
import {
  GitBranch,
  RefreshCw,
  Trash2,
  Download,
  Search,
  Plus,
  ArrowUpCircle,
  Check,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { RegistryItem } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import { Badge, PageHeader, SegmentedControl } from '../components/FluentUI';

export const ReposPage: React.FC = () => {
  const { snapshot, refresh, notify, t } = useApp();
  const [tab, setTab] = useState<'git' | 'market'>('git');

  // Git tab state
  const [repoURL, setRepoURL] = useState('');
  const [repoBranch, setRepoBranch] = useState('');
  const [repoBusyId, setRepoBusyId] = useState<string | null>(null);
  const [selectedSubpaths, setSelectedSubpaths] = useState<Record<string, Set<string>>>({});

  // Market tab state
  const registries = snapshot?.state.registries ?? [];
  const [regId, setRegId] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RegistryItem[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customURL, setCustomURL] = useState('');
  const [showAddReg, setShowAddReg] = useState(false);

  const repos = snapshot?.state.repos ?? [];
  const activeRegId = regId || registries[0]?.id || '';

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoURL.trim()) return;
    setRepoBusyId('adding');
    try {
      const added = await SkillsService.AddRepo(repoURL.trim(), repoBranch.trim(), '');
      setRepoURL('');
      setRepoBranch('');
      await refresh();
      notify(`Synced ${added.name} (${(added.discoveredSkills ?? []).length} skills)`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setRepoBusyId(null);
    }
  };

  const handleRefreshRepo = async (id: string) => {
    setRepoBusyId(id);
    try {
      const r = await SkillsService.RefreshRepo(id);
      await refresh();
      notify(`Refreshed ${r.name} (${(r.discoveredSkills ?? []).length} skills)`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setRepoBusyId(null);
    }
  };

  const handleCheckAll = async () => {
    setRepoBusyId('check-all');
    try {
      const updated = (await SkillsService.CheckAllUpdates()) ?? [];
      await refresh();
      notify(
        updated.length > 0 ? `Updates: ${updated.join(', ')}` : t.dashboard.upToDate,
        updated.length > 0 ? 'info' : 'success'
      );
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setRepoBusyId(null);
    }
  };

  const toggleSubpath = (repoId: string, sub: string) => {
    setSelectedSubpaths((prev) => {
      const nextSet = new Set(prev[repoId] ?? []);
      if (nextSet.has(sub)) nextSet.delete(sub);
      else nextSet.add(sub);
      return { ...prev, [repoId]: nextSet };
    });
  };

  const handleInstallRepoSkills = async (repoId: string, subpaths: string[]) => {
    if (subpaths.length === 0) return;
    setRepoBusyId(repoId);
    try {
      const installed = (await SkillsService.InstallRepoSkills(repoId, subpaths)) ?? [];
      await refresh();
      notify(`Installed ${installed.length} skill(s) into central store`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setRepoBusyId(null);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    try {
      await SkillsService.DeleteRepo(repoId);
      await refresh();
      notify('Removed repository source', 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleSearchMarket = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearching(true);
    try {
      const items = (await SkillsService.SearchRegistry(activeRegId, query)) ?? [];
      setResults(items);
      if (items.length === 0) {
        notify('No matching skills found', 'info');
      }
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleInstallMarketItem = async (item: RegistryItem) => {
    setInstallingId(item.id || item.slug);
    try {
      const sk = await SkillsService.InstallRegistryItem(item);
      await refresh();
      notify(`Installed ${sk.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setInstallingId(null);
    }
  };

  const handleAddCustomRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customURL.trim()) return;
    try {
      const reg = await SkillsService.AddCustomRegistry(customName.trim(), customURL.trim());
      setCustomName('');
      setCustomURL('');
      setShowAddReg(false);
      setRegId(reg.id);
      await refresh();
      notify(`Added registry ${reg.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.repos.title}
        subtitle={t.repos.subtitle}
        actions={
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as 'git' | 'market')}
            options={[
              { value: 'git', label: t.repos.tabGit },
              { value: 'market', label: t.repos.tabRegistry },
            ]}
          />
        }
      />

      {tab === 'git' ? (
        <div className="space-y-4">
          <form onSubmit={(e) => void handleAddRepo(e)} className="fluent-card p-3.5 flex flex-wrap gap-2.5">
            <input
              className="fluent-input flex-1 min-w-[220px]"
              placeholder={t.repos.urlPlaceholder}
              value={repoURL}
              onChange={(e) => setRepoURL(e.target.value)}
            />
            <input
              className="fluent-input w-[150px]"
              placeholder={t.repos.branchPlaceholder}
              value={repoBranch}
              onChange={(e) => setRepoBranch(e.target.value)}
            />
            <button
              type="submit"
              disabled={repoBusyId === 'adding'}
              className="fluent-btn fluent-btn-primary"
            >
              <Plus size={14} />
              {t.repos.addRepo}
            </button>
            <button
              type="button"
              disabled={repoBusyId === 'check-all'}
              onClick={() => void handleCheckAll()}
              className="fluent-btn"
            >
              <ArrowUpCircle size={14} />
              {t.repos.checkAllUpdates}
            </button>
          </form>

          <div className="space-y-3">
            {repos.map((r) => {
              const busy = repoBusyId === r.id;
              const discovered = r.discoveredSkills ?? [];
              const selSet = selectedSubpaths[r.id] ?? new Set<string>();

              return (
                <div key={r.id} className="fluent-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <GitBranch size={15} className="text-[var(--accent)] shrink-0" />
                        <span className="font-semibold text-[14px]">{r.name || r.url}</span>
                        {r.branch && <Badge tone="neutral">{r.branch}</Badge>}
                        {r.lastCommit && <Badge tone="neutral">{r.lastCommit.slice(0, 7)}</Badge>}
                        {r.hasUpdate && <Badge tone="warning">{t.dashboard.hasUpdate}</Badge>}
                      </div>
                      <div className="text-[11.5px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                        {r.url}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {discovered.length > 0 && (
                        <>
                          <button
                            type="button"
                            disabled={busy || selSet.size === 0}
                            onClick={() => void handleInstallRepoSkills(r.id, Array.from(selSet))}
                            className="fluent-btn fluent-btn-primary text-[12px] py-1 px-2.5"
                          >
                            <Download size={13} />
                            {t.repos.installSelected} ({selSet.size})
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleInstallRepoSkills(
                                r.id,
                                discovered.map((d) => d.subpath)
                              )
                            }
                            className="fluent-btn text-[12px] py-1 px-2.5"
                          >
                            {t.repos.installAll}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRefreshRepo(r.id)}
                        className="fluent-btn text-[12px] py-1 px-2.5"
                      >
                        <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
                        {t.repos.refreshScan}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRepo(r.id)}
                        className="fluent-btn text-[12px] py-1 px-2 text-[var(--danger)]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {discovered.length === 0 ? (
                    <div className="text-[12.5px] text-[var(--text-secondary)]">
                      {t.repos.notSyncedYet}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {discovered.map((d) => {
                        const checked = selSet.has(d.subpath);
                        return (
                          <label
                            key={d.subpath}
                            className="px-3 py-2 rounded-lg border border-[var(--card-border)] flex items-start gap-2.5 cursor-pointer hover:bg-[var(--card-subtle)]"
                            style={{ background: 'var(--card-subtle)' }}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-[var(--accent)]"
                              checked={checked}
                              onChange={() => toggleSubpath(r.id, d.subpath)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[13px] font-medium truncate">{d.name}</span>
                                {d.installedSkillId && (
                                  <Badge tone="success">
                                    <Check size={10} />
                                    {t.repos.installed}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                                {d.subpath}
                              </div>
                              {d.description && (
                                <div className="text-[11.5px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                                  {d.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="fluent-card p-3.5 space-y-3">
            <form onSubmit={(e) => void handleSearchMarket(e)} className="flex flex-wrap gap-2.5">
              <select
                className="fluent-input min-w-[180px]"
                value={activeRegId}
                onChange={(e) => setRegId(e.target.value)}
              >
                {registries.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
              <input
                className="fluent-input flex-1 min-w-[220px]"
                placeholder={t.repos.searchRegistryPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={searching}
                className="fluent-btn fluent-btn-primary"
              >
                <Search size={14} />
                {t.repos.searchBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowAddReg((v) => !v)}
                className="fluent-btn"
              >
                <Plus size={14} />
                {t.repos.addCustomRegistry}
              </button>
            </form>

            {showAddReg && (
              <form
                onSubmit={(e) => void handleAddCustomRegistry(e)}
                className="pt-2 border-t border-[var(--divider)] flex flex-wrap gap-2"
              >
                <input
                  className="fluent-input w-[180px]"
                  placeholder={t.repos.registryName}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <input
                  className="fluent-input flex-1 min-w-[220px]"
                  placeholder={t.repos.registryUrl}
                  value={customURL}
                  onChange={(e) => setCustomURL(e.target.value)}
                />
                <button type="submit" className="fluent-btn fluent-btn-primary">
                  Add
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((item) => {
              const key = item.id || item.slug;
              const installing = installingId === key;
              return (
                <div key={key} className="fluent-card p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] truncate">{item.name}</div>
                        <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                          {item.author ? `@${item.author} · ` : ''}
                          {item.repoUrl}
                          {item.subpath ? ` (${item.subpath})` : ''}
                        </div>
                      </div>
                      {item.installs > 0 && <Badge tone="accent">{item.installs}</Badge>}
                    </div>
                    {item.description && (
                      <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--divider)]">
                    <div className="flex gap-1 flex-wrap">
                      {(item.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge key={tag} tone="neutral">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={installing}
                      onClick={() => void handleInstallMarketItem(item)}
                      className="fluent-btn fluent-btn-primary text-[12px] py-1 px-3 shrink-0"
                    >
                      <Download size={13} />
                      {installing ? '...' : t.repos.installBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
