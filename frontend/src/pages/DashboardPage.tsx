import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  FolderGit2,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Archive,
  Download,
  ArrowUpCircle,
  BookMarked,
  ExternalLink,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import { useApp } from '../context/AppContext';
import { Badge, PageHeader, ToggleSwitch } from '../components/FluentUI';

export const DashboardPage: React.FC = () => {
  const {
    snapshot,
    syncing,
    runSyncAll,
    runHealthCheck,
    healthIssues,
    setActiveTab,
    refresh,
    notify,
    t,
  } = useApp();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const st = snapshot?.state;
  const skills = st?.skills ?? [];
  const agents = st?.agents ?? [];
  const projects = st?.projects ?? [];
  const workflows = st?.workflows ?? [];
  const repos = st?.repos ?? [];
  const globalWfs = new Set(st?.global.workflowIds ?? []);
  const enabledAgents = agents.filter((a) => a.enabled);

  const handleToggleGlobalWf = async (wfId: string, enabled: boolean) => {
    try {
      await SkillsService.ToggleGlobalWorkflow(wfId, enabled);
      await refresh();
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const updated = (await SkillsService.CheckAllUpdates()) ?? [];
      await refresh();
      notify(
        updated.length > 0
          ? `${t.dashboard.hasUpdate}: ${updated.join(', ')}`
          : t.dashboard.upToDate,
        updated.length > 0 ? 'info' : 'success'
      );
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleConflictBackup = async (targetPath: string) => {
    try {
      await SkillsService.ResolveConflictBackup(targetPath);
      await refresh();
      notify('Backed up and synced', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleConflictAdopt = async (targetPath: string) => {
    try {
      await SkillsService.ResolveConflictAdopt(targetPath);
      await refresh();
      notify('Adopted into central store', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleForceSync = async (targetPath: string) => {
    try {
      await SkillsService.ForceSyncDrift(targetPath);
      await refresh();
      notify('Synced target from central store', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const kpis = [
    {
      label: t.dashboard.kpiSkills,
      value: skills.length,
      icon: <BookOpen size={18} />,
      onClick: () => setActiveTab('library'),
    },
    {
      label: t.dashboard.kpiAgents,
      value: `${enabledAgents.length} / ${agents.length}`,
      icon: <Bot size={18} />,
      onClick: () => setActiveTab('agents'),
    },
    {
      label: t.dashboard.kpiProjects,
      value: projects.length,
      icon: <FolderGit2 size={18} />,
      onClick: () => setActiveTab('projects'),
    },
    {
      label: t.dashboard.kpiWorkflows,
      value: workflows.length,
      icon: <GitBranch size={18} />,
      onClick: () => setActiveTab('workflows'),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        actions={
          <>
            <button
              type="button"
              onClick={() => void runHealthCheck()}
              className="fluent-btn"
            >
              <ShieldCheck size={15} className="text-[var(--accent)]" />
              {t.healthCheck}
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void runSyncAll()}
              className="fluent-btn fluent-btn-primary"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? t.syncing : t.syncAll}
            </button>
          </>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            className="fluent-card fluent-card-interactive p-4 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="text-[12px] text-[var(--text-secondary)]">{k.label}</div>
              <div className="text-[22px] font-semibold mt-1 text-[var(--text-primary)]">
                {k.value}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
              {k.icon}
            </div>
          </button>
        ))}
      </div>

      {skills.length === 0 && (
        <div
          className="fluent-card p-4 flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--accent-border)' }}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--accent-soft)] text-[var(--accent)]">
              <BookMarked size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                {t.docs.onboardingTitle}
              </div>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                {t.docs.onboardingDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                void SkillsService.OpenDocsInBrowser(
                  'guide',
                  st?.settings.language ?? 'zh-CN',
                  st?.settings.theme ?? 'system'
                )
                  .then(() => notify(t.docs.openedBrowserToast, 'success'))
                  .catch((err: any) => notify(err?.message || String(err), 'error'))
              }
              className="fluent-btn"
            >
              <ExternalLink size={14} />
              {t.docs.openBrowserShort}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className="fluent-btn fluent-btn-primary"
            >
              <BookMarked size={14} />
              {t.docs.openGuideBtn} →
            </button>
          </div>
        </div>
      )}

      {/* Quick Global Workflows */}
      <div className="fluent-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">
            {t.dashboard.quickGlobalWorkflows}
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer"
          >
            {t.nav.workflows} →
          </button>
        </div>
        {workflows.length === 0 ? (
          <div className="text-[12.5px] text-[var(--text-secondary)]">
            {t.dashboard.noWorkflows}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {workflows.map((wf) => {
              const active = globalWfs.has(wf.id);
              const skillCount = new Set(
                (wf.stages ?? []).flatMap((s) => s.skillIds ?? [])
              ).size;
              return (
                <div
                  key={wf.id}
                  className="px-3.5 py-2.5 rounded-lg border border-[var(--card-border)] flex items-center justify-between gap-3"
                  style={{ background: 'var(--card-subtle)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: wf.color || 'var(--accent)' }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{wf.name}</div>
                      <div className="text-[11.5px] text-[var(--text-secondary)]">
                        {(wf.stages ?? []).length} stages · {skillCount} skills
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={active}
                    onChange={(next) => void handleToggleGlobalWf(wf.id, next)}
                    label={wf.name}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Health & Conflicts */}
      <div className="fluent-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {healthIssues.length > 0 ? (
              <AlertTriangle size={16} className="text-[var(--warning)]" />
            ) : (
              <CheckCircle2 size={16} className="text-[var(--success)]" />
            )}
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">
              {t.dashboard.healthPanel}
            </span>
            {healthIssues.length > 0 && (
              <Badge tone="danger">{healthIssues.length}</Badge>
            )}
          </div>
        </div>

        {healthIssues.length === 0 ? (
          <div className="text-[12.5px] text-[var(--text-secondary)] py-1">
            {t.dashboard.allHealthy}
          </div>
        ) : (
          <div className="space-y-2">
            {healthIssues.map((issue, i) => (
              <div
                key={issue.targetPath + i}
                className="p-3 rounded-lg border border-[var(--card-border)] flex flex-wrap items-center justify-between gap-3"
                style={{ background: 'var(--card-subtle)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={issue.kind === 'conflict' ? 'danger' : 'warning'}>
                      {issue.kind}
                    </Badge>
                    <span className="font-medium text-[13px]">{issue.skillSlug}</span>
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      {issue.message}
                    </span>
                  </div>
                  <div className="text-[11.5px] font-mono text-[var(--text-muted)] mt-1 truncate">
                    {issue.targetPath}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {issue.kind === 'conflict' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleConflictAdopt(issue.targetPath)}
                        className="fluent-btn text-[12px] py-1 px-2.5"
                      >
                        <Download size={13} />
                        {t.dashboard.adoptToStore}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleConflictBackup(issue.targetPath)}
                        className="fluent-btn text-[12px] py-1 px-2.5"
                      >
                        <Archive size={13} />
                        {t.dashboard.backupOverwrite}
                      </button>
                    </>
                  )}
                  {(issue.kind === 'drift' || issue.kind === 'broken-junction' || issue.kind === 'missing-target') && (
                    <button
                      type="button"
                      onClick={() => void handleForceSync(issue.targetPath)}
                      className="fluent-btn fluent-btn-primary text-[12px] py-1 px-2.5"
                    >
                      <RefreshCw size={13} />
                      {t.dashboard.forceSync}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repo Status */}
      <div className="fluent-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">
            {t.dashboard.recentRepos}
          </div>
          <button
            type="button"
            disabled={checkingUpdates}
            onClick={() => void handleCheckUpdates()}
            className="fluent-btn text-[12px] py-1 px-2.5"
          >
            <ArrowUpCircle size={13} />
            {t.dashboard.checkUpdates}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {repos.map((r) => (
            <div
              key={r.id}
              onClick={() => setActiveTab('repos')}
              className="px-3.5 py-2.5 rounded-lg border border-[var(--card-border)] flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
              style={{ background: 'var(--card-subtle)' }}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{r.name || r.url}</div>
                <div className="text-[11.5px] text-[var(--text-secondary)] truncate">
                  {r.lastCommit ? `SHA ${r.lastCommit.slice(0, 7)} · ${(r.discoveredSkills ?? []).length} skills` : r.url}
                </div>
              </div>
              {r.hasUpdate ? (
                <Badge tone="warning">{t.dashboard.hasUpdate}</Badge>
              ) : r.lastCommit ? (
                <Badge tone="success">{t.dashboard.upToDate}</Badge>
              ) : (
                <Badge tone="neutral">Ready</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
