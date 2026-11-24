import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  GitBranch,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { Workflow, WorkflowStage } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import { Badge, PageHeader, SettingsCard, ToggleSwitch } from '../components/FluentUI';

const COLORS = ['#0078D4', '#0F7B0F', '#8764B8', '#CA5010', '#038387', '#C239B3'];

export const WorkflowsPage: React.FC = () => {
  const { snapshot, refresh, notify, t } = useApp();
  const workflows = snapshot?.state.workflows ?? [];
  const skills = snapshot?.state.skills ?? [];
  const agents = (snapshot?.state.agents ?? []).filter((a) => a.enabled);
  const projects = snapshot?.state.projects ?? [];
  const globalWfIds = new Set(snapshot?.state.global.workflowIds ?? []);

  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId && workflows.length > 0) {
      setSelectedId(workflows[0].id);
    }
  }, [workflows, selectedId]);

  useEffect(() => {
    const found = workflows.find((w) => w.id === selectedId);
    if (found) {
      setDraft(JSON.parse(JSON.stringify(found)));
    } else if (workflows.length > 0) {
      setSelectedId(workflows[0].id);
      setDraft(JSON.parse(JSON.stringify(workflows[0])));
    } else {
      setDraft(null);
    }
  }, [selectedId, workflows]);

  const skillById = useMemo(() => {
    const m = new Map<string, (typeof skills)[number]>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  const handleNewWorkflow = () => {
    const empty: Workflow = {
      id: '',
      name: 'New Workflow',
      slug: '',
      description: '',
      color: COLORS[workflows.length % COLORS.length],
      generateGuide: false,
      stages: [
        { id: 'stg-1', name: '规划 / Plan', order: 1, skillIds: [] },
        { id: 'stg-2', name: '实现 / Build', order: 2, skillIds: [] },
        { id: 'stg-3', name: '验证 / Verify', order: 3, skillIds: [] },
      ],
      createdAt: '',
      updatedAt: '',
    };
    setSelectedId('');
    setDraft(empty);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await SkillsService.SaveWorkflow(draft);
      await refresh();
      setSelectedId(saved.id);
      notify(`Saved workflow ${saved.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id) {
      setDraft(null);
      return;
    }
    try {
      await SkillsService.DeleteWorkflow(draft.id);
      setSelectedId('');
      await refresh();
      notify('Deleted workflow', 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const updateStage = (idx: number, updater: (s: WorkflowStage) => WorkflowStage) => {
    if (!draft) return;
    const stages = [...(draft.stages ?? [])];
    stages[idx] = updater(stages[idx]);
    setDraft({ ...draft, stages });
  };

  const moveStage = (idx: number, delta: number) => {
    if (!draft) return;
    const stages = [...(draft.stages ?? [])];
    const target = idx + delta;
    if (target < 0 || target >= stages.length) return;
    const tmp = stages[idx];
    stages[idx] = stages[target];
    stages[target] = tmp;
    setDraft({ ...draft, stages });
  };

  const addStage = () => {
    if (!draft) return;
    const stages = [...(draft.stages ?? [])];
    stages.push({
      id: `stg-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      order: stages.length + 1,
      skillIds: [],
    });
    setDraft({ ...draft, stages });
  };

  const removeStage = (idx: number) => {
    if (!draft) return;
    const stages = [...(draft.stages ?? [])];
    stages.splice(idx, 1);
    setDraft({ ...draft, stages });
  };

  const handleBind = async (
    scope: 'global' | 'user' | 'project',
    targetId: string,
    enabled: boolean
  ) => {
    if (!draft?.id) return;
    try {
      await SkillsService.BindWorkflow(draft.id, scope, targetId, '', enabled);
      await refresh();
      notify('Updated binding & synced', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.workflows.title}
        subtitle={t.workflows.subtitle}
        actions={
          <button
            type="button"
            onClick={handleNewWorkflow}
            className="fluent-btn fluent-btn-primary"
          >
            <Plus size={14} />
            {t.workflows.createWorkflow}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-2">
          {workflows.map((wf) => {
            const active = draft?.id === wf.id;
            const totalSkills = new Set((wf.stages ?? []).flatMap((s) => s.skillIds ?? [])).size;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => setSelectedId(wf.id)}
                className={`w-full fluent-card p-3.5 text-left flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  active ? 'border-[var(--accent)] bg-[var(--card-hover)]' : 'fluent-card-interactive'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: wf.color || 'var(--accent)' }}
                    />
                    <span className="font-semibold text-[13.5px] truncate">{wf.name}</span>
                  </div>
                  <div className="text-[11.5px] text-[var(--text-secondary)] mt-1">
                    {(wf.stages ?? []).length} stages · {totalSkills} skills
                  </div>
                </div>
                {globalWfIds.has(wf.id) && <Badge tone="accent">Global</Badge>}
              </button>
            );
          })}
        </div>

        {/* Right Staged Editor */}
        <div className="lg:col-span-8 space-y-4">
          {!draft ? (
            <div className="fluent-card p-8 text-center text-[13px] text-[var(--text-secondary)]">
              <GitBranch size={24} className="mx-auto mb-2 text-[var(--accent)]" />
              Select or create a workflow
            </div>
          ) : (
            <>
              <div className="fluent-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                      className="fluent-input flex-1 font-semibold text-[14px]"
                      placeholder={t.workflows.wfName}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                    <div className="flex items-center gap-1">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setDraft({ ...draft, color: c })}
                          className="w-5 h-5 rounded-full cursor-pointer border-2"
                          style={{
                            background: c,
                            borderColor: draft.color === c ? '#ffffff' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="fluent-btn text-[var(--danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSave()}
                      className="fluent-btn fluent-btn-primary"
                    >
                      <Save size={14} />
                      {t.workflows.saveWorkflow}
                    </button>
                  </div>
                </div>

                <input
                  className="fluent-input w-full"
                  placeholder={t.workflows.wfDesc}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />

                <SettingsCard
                  title={t.workflows.generateGuide}
                  description={t.workflows.generateGuideDesc}
                  right={
                    <ToggleSwitch
                      checked={draft.generateGuide}
                      onChange={(next) => setDraft({ ...draft, generateGuide: next })}
                    />
                  }
                />
              </div>

              {/* Stages */}
              <div className="fluent-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-semibold">{t.workflows.stagesTitle}</div>
                  <button type="button" onClick={addStage} className="fluent-btn text-[12px] py-1">
                    <Plus size={13} />
                    {t.workflows.addStage}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(draft.stages ?? []).map((stg, idx) => (
                    <div
                      key={stg.id || idx}
                      className="p-3 rounded-lg border border-[var(--card-border)] space-y-2.5"
                      style={{ background: 'var(--card-subtle)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Badge tone="accent">{idx + 1}</Badge>
                          <input
                            className="fluent-input flex-1 text-[13px] font-medium"
                            value={stg.name}
                            onChange={(e) =>
                              updateStage(idx, (s) => ({ ...s, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveStage(idx, -1)}
                            className="p-1 rounded hover:bg-[var(--card-bg)] disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (draft.stages?.length ?? 1) - 1}
                            onClick={() => moveStage(idx, 1)}
                            className="p-1 rounded hover:bg-[var(--card-bg)] disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStage(idx)}
                            className="p-1 rounded hover:bg-[var(--card-bg)] text-[var(--danger)] cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Assigned skills inside stage */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(stg.skillIds ?? []).map((sid) => {
                          const sk = skillById.get(sid);
                          return (
                            <span
                              key={sid}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            >
                              {sk?.name || sid}
                              <button
                                type="button"
                                onClick={() =>
                                  updateStage(idx, (s) => ({
                                    ...s,
                                    skillIds: (s.skillIds ?? []).filter((id) => id !== sid),
                                  }))
                                }
                                className="hover:opacity-70 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}

                        <select
                          className="fluent-input text-[12px] py-1"
                          value=""
                          onChange={(e) => {
                            const sid = e.target.value;
                            if (!sid) return;
                            updateStage(idx, (s) => ({
                              ...s,
                              skillIds: (s.skillIds ?? []).includes(sid)
                                ? s.skillIds
                                : [...(s.skillIds ?? []), sid],
                            }));
                          }}
                        >
                          <option value="">{t.workflows.addSkillToStage}</option>
                          {skills
                            .filter((sk) => !(stg.skillIds ?? []).includes(sk.id))
                            .map((sk) => (
                              <option key={sk.id} value={sk.id}>
                                {sk.name} ({sk.slug})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Binding Panel (available once workflow is saved) */}
              {draft.id && (
                <div className="fluent-card p-4 space-y-3">
                  <div className="text-[14px] font-semibold">{t.workflows.quickBind}</div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[13px] font-medium">{t.workflows.bindGlobal}</span>
                    <ToggleSwitch
                      checked={globalWfIds.has(draft.id)}
                      onChange={(next) => void handleBind('global', '', next)}
                    />
                  </div>

                  <div>
                    <div className="text-[12px] text-[var(--text-secondary)] mb-1.5">
                      {t.workflows.bindUsers}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {agents.map((a) => {
                        const bound = (a.userWorkflowIds ?? []).includes(draft.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => void handleBind('user', a.id, !bound)}
                            className="px-2.5 py-1 rounded-md text-[12px] border cursor-pointer transition-colors"
                            style={
                              bound
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
                            {a.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {projects.length > 0 && (
                    <div>
                      <div className="text-[12px] text-[var(--text-secondary)] mb-1.5">
                        {t.workflows.bindProjects}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projects.map((p) => {
                          const bound = (p.workflowIds ?? []).includes(draft.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => void handleBind('project', p.id, !bound)}
                              className="px-2.5 py-1 rounded-md text-[12px] border cursor-pointer transition-colors"
                              style={
                                bound
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
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
