import React, { useEffect, useMemo, useState } from 'react';
import { EyeOff, Globe, Check, AlertTriangle, Plus } from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { MatrixCell, MatrixRow, MatrixSnapshot } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import { Badge, EmptyState, PageHeader, SegmentedControl } from '../components/FluentUI';

export const MatrixPage: React.FC = () => {
  const { snapshot, openSkillDrawer, refresh, notify, setActiveTab, t } = useApp();
  const [scope, setScope] = useState<'global' | 'user' | 'project'>('global');
  const [projectId, setProjectId] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<'all' | 'skill' | 'workflow'>('all');
  const [search, setSearch] = useState('');
  const [matrix, setMatrix] = useState<MatrixSnapshot | null>(null);

  const projects = snapshot?.state.projects ?? [];
  const selectedProjObj = useMemo(
    () => projects.find((p) => p.id === projectId) ?? projects[0],
    [projects, projectId]
  );

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const loadMatrix = async () => {
    try {
      const m = await SkillsService.GetMatrix(scope, selectedProjObj?.id ?? '');
      setMatrix(m);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedProjObj?.id, snapshot]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (matrix?.rows ?? []).filter((r) => {
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
    });
  }, [matrix?.rows, kindFilter, search]);

  const handleGlobalRowToggle = async (row: MatrixRow) => {
    try {
      if (row.kind === 'workflow') {
        await SkillsService.ToggleGlobalWorkflow(row.id, !row.globalBound);
      } else {
        await SkillsService.ToggleGlobalSkill(row.id, !row.globalBound);
      }
      await refresh();
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleProjectWideToggle = async (row: MatrixRow) => {
    if (!selectedProjObj) return;
    try {
      const bound =
        row.kind === 'workflow'
          ? (selectedProjObj.workflowIds ?? []).includes(row.id)
          : (selectedProjObj.directSkillIds ?? []).includes(row.id);
      if (row.kind === 'workflow') {
        await SkillsService.ToggleProjectWorkflow(selectedProjObj.id, '', row.id, !bound);
      } else {
        await SkillsService.ToggleProjectSkill(selectedProjObj.id, '', row.id, !bound);
      }
      await refresh();
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleCellClick = async (row: MatrixRow, cell: MatrixCell) => {
    try {
      if (scope === 'global') {
        // In Global view, clicking an agent cell toggles global mute for that agent
        const nextMuted = !cell.muted;
        if (row.kind === 'workflow') {
          await SkillsService.ToggleAgentGlobalWorkflowMute(cell.agentId, row.id, nextMuted);
        } else {
          await SkillsService.ToggleAgentGlobalMute(cell.agentId, row.id, nextMuted);
        }
      } else if (scope === 'user') {
        if (cell.muted) {
          if (row.kind === 'workflow') {
            await SkillsService.ToggleAgentGlobalWorkflowMute(cell.agentId, row.id, false);
          } else {
            await SkillsService.ToggleAgentGlobalMute(cell.agentId, row.id, false);
          }
        } else if (cell.direct) {
          if (row.kind === 'workflow') {
            await SkillsService.ToggleAgentUserWorkflow(cell.agentId, row.id, false);
          } else {
            await SkillsService.ToggleAgentUserSkill(cell.agentId, row.id, false);
          }
        } else if (cell.inherited) {
          if (row.kind === 'workflow') {
            await SkillsService.ToggleAgentGlobalWorkflowMute(cell.agentId, row.id, true);
          } else {
            await SkillsService.ToggleAgentGlobalMute(cell.agentId, row.id, true);
          }
        } else {
          if (row.kind === 'workflow') {
            await SkillsService.ToggleAgentUserWorkflow(cell.agentId, row.id, true);
          } else {
            await SkillsService.ToggleAgentUserSkill(cell.agentId, row.id, true);
          }
        }
      } else if (scope === 'project' && selectedProjObj) {
        if (row.kind === 'workflow') {
          const ov = selectedProjObj.agentOverrides?.[cell.agentId];
          const extra = (ov?.extraWorkflowIds ?? []).includes(row.id);
          await SkillsService.ToggleProjectWorkflow(selectedProjObj.id, cell.agentId, row.id, !extra);
        } else {
          if (cell.muted) {
            await SkillsService.ToggleProjectSkillMute(selectedProjObj.id, cell.agentId, row.id, false);
          } else if (cell.direct) {
            await SkillsService.ToggleProjectSkill(selectedProjObj.id, cell.agentId, row.id, false);
          } else if (cell.inherited) {
            await SkillsService.ToggleProjectSkillMute(selectedProjObj.id, cell.agentId, row.id, true);
          } else {
            await SkillsService.ToggleProjectSkill(selectedProjObj.id, cell.agentId, row.id, true);
          }
        }
      }
      await refresh();
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const agents = matrix?.agents ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.matrix.title}
        subtitle={t.matrix.subtitle}
        actions={
          <SegmentedControl
            value={scope}
            onChange={(v) => setScope(v as 'global' | 'user' | 'project')}
            options={[
              { value: 'global', label: t.matrix.scopeGlobal },
              { value: 'user', label: t.matrix.scopeUser },
              { value: 'project', label: t.matrix.scopeProject },
            ]}
          />
        }
      />

      {/* Filter & Project Bar */}
      <div className="fluent-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <SegmentedControl
            value={kindFilter}
            onChange={(v) => setKindFilter(v as 'all' | 'skill' | 'workflow')}
            options={[
              { value: 'all', label: t.matrix.filterAll },
              { value: 'skill', label: t.matrix.filterSkills },
              { value: 'workflow', label: t.matrix.filterWorkflows },
            ]}
          />

          {scope === 'project' && (
            <select
              className="fluent-input text-[12.5px] min-w-[200px]"
              value={selectedProjObj?.id ?? ''}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          className="fluent-input w-full sm:w-[240px]"
          placeholder={t.matrix.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {scope === 'project' && projects.length === 0 ? (
        <EmptyState
          icon={<Plus size={22} />}
          title={t.projects.title}
          description={t.matrix.noProjectTip}
          action={
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className="fluent-btn fluent-btn-primary"
            >
              {t.nav.projects}
            </button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={<Globe size={22} />}
          title={t.matrix.title}
          description={t.matrix.noItems}
        />
      ) : (
        <div className="fluent-card overflow-hidden">
          <div className="overflow-x-auto fluent-scroll">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--divider)]" style={{ background: 'var(--card-subtle)' }}>
                  <th className="py-2.5 px-4 text-[12px] font-semibold text-[var(--text-secondary)] min-w-[230px]">
                    Skill / Workflow
                  </th>
                  {(scope === 'global' || scope === 'project') && (
                    <th className="py-2.5 px-3 text-[12px] font-semibold text-[var(--text-secondary)] text-center w-[96px]">
                      {scope === 'global' ? t.matrix.globalBound : 'Project'}
                    </th>
                  )}
                  {agents.map((a) => (
                    <th
                      key={a.id}
                      className="py-2.5 px-3 text-[12px] font-semibold text-[var(--text-primary)] text-center min-w-[115px]"
                    >
                      <div className="truncate">{a.name}</div>
                      <div className="text-[10.5px] font-normal text-[var(--text-muted)]">
                        {a.defaultDeployMode}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const projectWideBound =
                    selectedProjObj &&
                    (row.kind === 'workflow'
                      ? (selectedProjObj.workflowIds ?? []).includes(row.id)
                      : (selectedProjObj.directSkillIds ?? []).includes(row.id));

                  return (
                    <tr
                      key={row.kind + '-' + row.id}
                      className="border-b border-[var(--divider)] last:border-b-0 hover:bg-[var(--card-subtle)] transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.kind === 'workflow' ? (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: row.color || 'var(--accent)' }}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => row.kind === 'skill' && openSkillDrawer(row.id)}
                            className={`text-[13px] font-medium truncate text-left ${
                              row.kind === 'skill'
                                ? 'hover:text-[var(--accent)] cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            {row.name}
                          </button>
                          <Badge tone={row.kind === 'workflow' ? 'accent' : 'neutral'}>
                            {row.kind === 'workflow' ? 'WF' : row.slug}
                          </Badge>
                        </div>
                      </td>

                      {scope === 'global' && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => void handleGlobalRowToggle(row)}
                            className="px-2.5 py-1 rounded-md text-[11.5px] font-medium cursor-pointer transition-colors border"
                            style={
                              row.globalBound
                                ? {
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                    borderColor: 'var(--accent-border)',
                                  }
                                : {
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    borderColor: 'var(--card-border)',
                                  }
                            }
                          >
                            {row.globalBound ? t.matrix.globalBound : t.matrix.inactive}
                          </button>
                        </td>
                      )}

                      {scope === 'project' && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => void handleProjectWideToggle(row)}
                            className="px-2.5 py-1 rounded-md text-[11.5px] font-medium cursor-pointer transition-colors border"
                            style={
                              projectWideBound
                                ? {
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                    borderColor: 'var(--accent-border)',
                                  }
                                : {
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    borderColor: 'var(--card-border)',
                                  }
                            }
                          >
                            {projectWideBound ? t.matrix.direct : t.matrix.inactive}
                          </button>
                        </td>
                      )}

                      {(row.cells ?? []).map((cell) => {
                        let bg = 'transparent';
                        let fg = 'var(--text-muted)';
                        let border = 'var(--card-border)';
                        let label = t.matrix.inactive;
                        let icon: React.ReactNode = null;

                        if (cell.status === 'conflict') {
                          bg = 'var(--danger-soft)';
                          fg = 'var(--danger)';
                          border = 'transparent';
                          label = t.matrix.conflict;
                          icon = <AlertTriangle size={12} />;
                        } else if (cell.muted) {
                          bg = 'var(--warning-soft)';
                          fg = 'var(--warning)';
                          border = 'transparent';
                          label = t.matrix.muted;
                          icon = <EyeOff size={12} />;
                        } else if (cell.direct) {
                          bg = 'var(--accent-soft)';
                          fg = 'var(--accent)';
                          border = 'var(--accent-border)';
                          label = t.matrix.direct;
                          icon = <Check size={12} />;
                        } else if (cell.active) {
                          bg = 'var(--success-soft)';
                          fg = 'var(--success)';
                          border = 'transparent';
                          label = t.matrix.inherited;
                          icon = <Check size={12} />;
                        }

                        return (
                          <td key={cell.agentId} className="py-2 px-3 text-center">
                            <button
                              type="button"
                              title={(cell.sources ?? []).join(', ') || label}
                              onClick={() => void handleCellClick(row, cell)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium border cursor-pointer min-w-[78px] transition-opacity hover:opacity-85"
                              style={{ background: bg, color: fg, borderColor: border }}
                            >
                              {icon}
                              <span>{label}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--divider)] text-[11.5px] text-[var(--text-muted)]">
            {t.matrix.legend}
          </div>
        </div>
      )}
    </div>
  );
};
