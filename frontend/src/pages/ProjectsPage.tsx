import React, { useEffect, useState } from 'react';
import {
  FolderPlus,
  Radar,
  RefreshCw,
  Trash2,
  FolderGit2,
  Check,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { Project, ProjectAgentOverride } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import {
  Badge,
  EmptyState,
  Modal,
  PageHeader,
  SettingsCard,
  ToggleSwitch,
} from '../components/FluentUI';

export const ProjectsPage: React.FC = () => {
  const { snapshot, refresh, notify, openSkillDrawer, t } = useApp();
  const projects = snapshot?.state.projects ?? [];
  const agents = snapshot?.state.agents ?? [];
  const workflows = snapshot?.state.workflows ?? [];
  const skills = snapshot?.state.skills ?? [];

  const [selectedId, setSelectedId] = useState('');
  const [overrideAgentId, setOverrideAgentId] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCandidates, setScanCandidates] = useState<string[]>([]);
  const [selectedScanPaths, setSelectedScanPaths] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId && projects.length > 0) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  const project = projects.find((p) => p.id === selectedId) ?? projects[0] ?? null;

  useEffect(() => {
    if (project && (!overrideAgentId || !(project.enabledAgentIds ?? []).includes(overrideAgentId))) {
      setOverrideAgentId((project.enabledAgentIds ?? [])[0] ?? '');
    }
  }, [project, overrideAgentId]);

  const handleAddProject = async () => {
    try {
      const folder = await SkillsService.PickProjectFolder();
      if (!folder) return;
      const added = await SkillsService.AddProject(folder);
      await refresh();
      setSelectedId(added.id);
      notify(`Added project ${added.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleScanWorkspace = async () => {
    try {
      const candidates = (await SkillsService.ScanWorkspaceForProjects()) ?? [];
      setScanCandidates(candidates);
      setSelectedScanPaths(new Set(candidates));
      setScanOpen(true);
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleBatchAdd = async () => {
    const list = Array.from(selectedScanPaths);
    if (list.length === 0) return;
    setBusy(true);
    try {
      const added = (await SkillsService.AddProjectsBatch(list)) ?? [];
      await refresh();
      if (added.length > 0) setSelectedId(added[0].id);
      setScanOpen(false);
      notify(`Added ${added.length} project(s)`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveProject = async (next: Project) => {
    try {
      await SkillsService.UpdateProject(next);
      await refresh();
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleSyncProject = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const res = await SkillsService.SyncProject(project.id);
      await refresh();
      notify(
        `Synced ${project.name}: +${res.created} / ~${res.updated} / -${res.removed}`,
        'success'
      );
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await SkillsService.DeleteProject(project.id);
      setSelectedId('');
      await refresh();
      notify(`Removed ${project.name}`, 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const toggleArr = (arr: string[] | null | undefined, id: string): string[] => {
    const list = arr ?? [];
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  };

  const activeOverride: ProjectAgentOverride = (project?.agentOverrides ?? {})[overrideAgentId] ?? {
    deployMode: '',
    extraSkillIds: [],
    mutedSkillIds: [],
    extraWorkflowIds: [],
    mutedWorkflowIds: [],
  };

  const updateOverride = (mut: (ov: ProjectAgentOverride) => ProjectAgentOverride) => {
    if (!project || !overrideAgentId) return;
    const nextOverrides = { ...(project.agentOverrides ?? {}) };
    nextOverrides[overrideAgentId] = mut({
      deployMode: activeOverride.deployMode ?? '',
      extraSkillIds: [...(activeOverride.extraSkillIds ?? [])],
      mutedSkillIds: [...(activeOverride.mutedSkillIds ?? [])],
      extraWorkflowIds: [...(activeOverride.extraWorkflowIds ?? [])],
      mutedWorkflowIds: [...(activeOverride.mutedWorkflowIds ?? [])],
    });
    void saveProject({ ...project, agentOverrides: nextOverrides });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.projects.title}
        subtitle={t.projects.subtitle}
        actions={
          <>
            <button type="button" onClick={() => void handleScanWorkspace()} className="fluent-btn">
              <Radar size={14} className="text-[var(--accent)]" />
              {t.projects.scanWorkspace}
            </button>
            <button
              type="button"
              onClick={() => void handleAddProject()}
              className="fluent-btn fluent-btn-primary"
            >
              <FolderPlus size={14} />
              {t.projects.addProject}
            </button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={24} />}
          title={t.projects.title}
          description={t.projects.noProjects}
          action={
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleScanWorkspace()} className="fluent-btn">
                {t.projects.scanWorkspace}
              </button>
              <button
                type="button"
                onClick={() => void handleAddProject()}
                className="fluent-btn fluent-btn-primary"
              >
                {t.projects.addProject}
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left project list */}
          <div className="lg:col-span-4 space-y-2">
            {projects.map((p) => {
              const selected = project?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full fluent-card p-3.5 text-left cursor-pointer transition-colors ${
                    selected ? 'border-[var(--accent)] bg-[var(--card-hover)]' : 'fluent-card-interactive'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[13.5px] truncate">{p.name}</span>
                    <Badge tone="accent">{(p.enabledAgentIds ?? []).length} Agents</Badge>
                  </div>
                  <div className="text-[11.5px] font-mono text-[var(--text-muted)] mt-1 truncate">
                    {p.path}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                    {(p.workflowIds ?? []).length} workflows · {(p.directSkillIds ?? []).length} direct skills
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right project inspector */}
          {project && (
            <div className="lg:col-span-8 space-y-3">
              <div className="fluent-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold truncate">{project.name}</div>
                  <div className="text-[12px] font-mono text-[var(--text-muted)] truncate">
                    {project.path}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDeleteProject()}
                    className="fluent-btn text-[var(--danger)]"
                    title={t.projects.removeProject}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSyncProject()}
                    className="fluent-btn fluent-btn-primary"
                  >
                    <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                    {t.projects.syncProject}
                  </button>
                </div>
              </div>

              {/* Enabled Agents */}
              <div className="fluent-card p-4 space-y-2.5">
                <div className="text-[13px] font-semibold">{t.projects.enabledAgents}</div>
                <div className="flex flex-wrap gap-1.5">
                  {agents.map((a) => {
                    const enabled = (project.enabledAgentIds ?? []).includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          void saveProject({
                            ...project,
                            enabledAgentIds: toggleArr(project.enabledAgentIds, a.id),
                          })
                        }
                        className="px-2.5 py-1 rounded-md text-[12px] border inline-flex items-center gap-1.5 cursor-pointer"
                        style={
                          enabled
                            ? {
                                background: 'var(--accent-soft)',
                                borderColor: 'var(--accent-border)',
                                color: 'var(--accent)',
                              }
                            : {
                                background: 'var(--card-subtle)',
                                borderColor: 'var(--card-border)',
                                color: 'var(--text-secondary)',
                              }
                        }
                      >
                        {enabled && <Check size={12} />}
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bound Workflows */}
              <div className="fluent-card p-4 space-y-2.5">
                <div className="text-[13px] font-semibold">{t.projects.boundWorkflows}</div>
                <div className="flex flex-wrap gap-1.5">
                  {workflows.map((wf) => {
                    const active = (project.workflowIds ?? []).includes(wf.id);
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() =>
                          void saveProject({
                            ...project,
                            workflowIds: toggleArr(project.workflowIds, wf.id),
                          })
                        }
                        className="px-2.5 py-1 rounded-md text-[12px] border inline-flex items-center gap-1.5 cursor-pointer"
                        style={
                          active
                            ? {
                                background: 'var(--accent-soft)',
                                borderColor: 'var(--accent-border)',
                                color: 'var(--accent)',
                              }
                            : {
                                background: 'var(--card-subtle)',
                                borderColor: 'var(--card-border)',
                                color: 'var(--text-secondary)',
                              }
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: wf.color || 'var(--accent)' }}
                        />
                        {wf.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Skills */}
              <div className="fluent-card p-4 space-y-2.5">
                <div className="text-[13px] font-semibold">{t.projects.directSkills}</div>
                {skills.length === 0 ? (
                  <div className="text-[12px] text-[var(--text-secondary)]">No skills in store.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((sk) => {
                      const active = (project.directSkillIds ?? []).includes(sk.id);
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() =>
                            void saveProject({
                              ...project,
                              directSkillIds: toggleArr(project.directSkillIds, sk.id),
                            })
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openSkillDrawer(sk.id);
                          }}
                          className="px-2.5 py-1 rounded-md text-[12px] border inline-flex items-center gap-1.5 cursor-pointer"
                          style={
                            active
                              ? {
                                  background: 'var(--success-soft)',
                                  borderColor: 'transparent',
                                  color: 'var(--success)',
                                }
                              : {
                                  background: 'var(--card-subtle)',
                                  borderColor: 'var(--card-border)',
                                  color: 'var(--text-secondary)',
                                }
                          }
                        >
                          {active && <Check size={12} />}
                          {sk.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Deploy Options */}
              <div className="space-y-2">
                <SettingsCard
                  title={t.projects.deployMode}
                  right={
                    <select
                      className="fluent-input text-[12.5px]"
                      value={project.deployModeOverride || ''}
                      onChange={(e) =>
                        void saveProject({ ...project, deployModeOverride: e.target.value })
                      }
                    >
                      <option value="">{t.projects.followAgent}</option>
                      <option value="junction">{t.projects.junctionMode}</option>
                      <option value="copy">{t.projects.copyMode}</option>
                    </select>
                  }
                />
                <SettingsCard
                  title={t.projects.manageGitignore}
                  description={t.projects.manageGitignoreDesc}
                  right={
                    <ToggleSwitch
                      checked={project.manageGitignore}
                      onChange={(next) =>
                        void saveProject({ ...project, manageGitignore: next })
                      }
                    />
                  }
                />
                <SettingsCard
                  title={t.projects.guideEnabled}
                  right={
                    <ToggleSwitch
                      checked={project.workflowGuideEnabled}
                      onChange={(next) =>
                        void saveProject({ ...project, workflowGuideEnabled: next })
                      }
                    />
                  }
                />
              </div>

              {/* Per-Agent Override */}
              {(project.enabledAgentIds ?? []).length > 0 && (
                <div className="fluent-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{t.projects.agentOverrides}</span>
                    <select
                      className="fluent-input text-[12.5px]"
                      value={overrideAgentId}
                      onChange={(e) => setOverrideAgentId(e.target.value)}
                    >
                      {(project.enabledAgentIds ?? []).map((aid) => {
                        const a = agents.find((x) => x.id === aid);
                        return (
                          <option key={aid} value={aid}>
                            {a?.name || aid}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-[var(--text-secondary)]">{t.projects.deployMode}</span>
                    <select
                      className="fluent-input text-[12px]"
                      value={activeOverride.deployMode || ''}
                      onChange={(e) =>
                        updateOverride((ov) => ({ ...ov, deployMode: e.target.value }))
                      }
                    >
                      <option value="">{t.projects.followAgent}</option>
                      <option value="junction">Junction</option>
                      <option value="copy">Copy</option>
                    </select>
                  </div>

                  {skills.length > 0 && (
                    <div>
                      <div className="text-[12px] text-[var(--text-secondary)] mb-1.5">
                        Extra Skills for this Agent
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((sk) => {
                          const on = (activeOverride.extraSkillIds ?? []).includes(sk.id);
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              onClick={() =>
                                updateOverride((ov) => ({
                                  ...ov,
                                  extraSkillIds: toggleArr(ov.extraSkillIds, sk.id),
                                }))
                              }
                              className="px-2 py-0.5 rounded text-[11.5px] border cursor-pointer"
                              style={
                                on
                                  ? {
                                      background: 'var(--accent-soft)',
                                      borderColor: 'var(--accent-border)',
                                      color: 'var(--accent)',
                                    }
                                  : {
                                      background: 'var(--card-subtle)',
                                      borderColor: 'var(--card-border)',
                                      color: 'var(--text-secondary)',
                                    }
                              }
                            >
                              {sk.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        open={scanOpen}
        title={t.projects.scanModalTitle}
        onClose={() => setScanOpen(false)}
        widthClass="max-w-xl"
      >
        {scanCandidates.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[var(--text-secondary)]">
            No new project directories found in selected workspace.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto fluent-scroll">
              {scanCandidates.map((p) => (
                <label
                  key={p}
                  className="fluent-card px-3 py-2 flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={selectedScanPaths.has(p)}
                    onChange={(e) => {
                      const next = new Set(selectedScanPaths);
                      if (e.target.checked) next.add(p);
                      else next.delete(p);
                      setSelectedScanPaths(next);
                    }}
                  />
                  <span className="text-[12.5px] font-mono truncate">{p}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setScanOpen(false)} className="fluent-btn">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || selectedScanPaths.size === 0}
                onClick={() => void handleBatchAdd()}
                className="fluent-btn fluent-btn-primary"
              >
                {t.projects.addSelected} ({selectedScanPaths.size})
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
