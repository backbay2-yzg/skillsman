import React, { useState } from 'react';
import { Bot, Plus, Radar, Save, Trash2, X } from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import {
  DeployMode,
  type AgentProfile,
} from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import {
  Badge,
  Modal,
  PageHeader,
  SettingsExpander,
  ToggleSwitch,
} from '../components/FluentUI';

export const AgentsPage: React.FC = () => {
  const { snapshot, refresh, notify, t } = useApp();
  const agents = snapshot?.state.agents ?? [];
  const skills = snapshot?.state.skills ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUserDir, setNewUserDir] = useState('');
  const [newProjRelDir, setNewProjRelDir] = useState('');
  const [newMode, setNewMode] = useState<DeployMode>(DeployMode.DeployJunction);

  const skillNameMap = new Map(skills.map((s) => [s.id, s.name]));

  const handleSaveAgent = async (agent: AgentProfile) => {
    try {
      await SkillsService.SaveAgent(agent);
      await refresh();
      notify(`Saved ${agent.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleRedetect = async () => {
    try {
      await SkillsService.RedetectAgents();
      await refresh();
      notify('Agent detection refreshed', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await SkillsService.SaveAgent({
        id: '',
        name: newName.trim(),
        icon: 'Cpu',
        builtin: false,
        enabled: true,
        detected: false,
        userSkillsDir: newUserDir.trim(),
        projectSkillsRelDir: newProjRelDir.trim(),
        defaultDeployMode: newMode,
        globalMutedSkillIds: [],
        globalMutedWorkflowIds: [],
        userSkillIds: [],
        userWorkflowIds: [],
        workflowGuideEnabled: true,
      });
      setAddOpen(false);
      setNewName('');
      setNewUserDir('');
      setNewProjRelDir('');
      await refresh();
      notify('Added custom agent', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleDeleteCustom = async (id: string) => {
    try {
      await SkillsService.DeleteAgent(id);
      await refresh();
      notify('Deleted custom agent', 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.agents.title}
        subtitle={t.agents.subtitle}
        actions={
          <>
            <button type="button" onClick={() => void handleRedetect()} className="fluent-btn">
              <Radar size={14} className="text-[var(--accent)]" />
              {t.agents.redetect}
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="fluent-btn fluent-btn-primary"
            >
              <Plus size={14} />
              {t.agents.addCustom}
            </button>
          </>
        }
      />

      <div className="space-y-2.5">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            skillNameMap={skillNameMap}
            onSave={handleSaveAgent}
            onDelete={handleDeleteCustom}
          />
        ))}
      </div>

      <Modal open={addOpen} title={t.agents.addCustom} onClose={() => setAddOpen(false)}>
        <form onSubmit={(e) => void handleAddCustom(e)} className="space-y-3">
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              Agent Name *
            </label>
            <input
              required
              className="fluent-input w-full"
              placeholder="e.g. Roo Code"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t.agents.userDir}
            </label>
            <input
              className="fluent-input w-full font-mono text-[12px]"
              placeholder="e.g. ~/.roo/skills"
              value={newUserDir}
              onChange={(e) => setNewUserDir(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t.agents.projectRelDir}
            </label>
            <input
              className="fluent-input w-full font-mono text-[12px]"
              placeholder="e.g. .roo/skills"
              value={newProjRelDir}
              onChange={(e) => setNewProjRelDir(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t.agents.defaultMode}
            </label>
            <select
              className="fluent-input w-full"
              value={newMode}
              onChange={(e) => setNewMode(e.target.value as DeployMode)}
            >
              <option value={DeployMode.DeployJunction}>Junction</option>
              <option value={DeployMode.DeployCopy}>Copy</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="fluent-btn">
              Cancel
            </button>
            <button type="submit" className="fluent-btn fluent-btn-primary">
              {t.agents.addCustom}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const AgentCard: React.FC<{
  agent: AgentProfile;
  skillNameMap: Map<string, string>;
  onSave: (a: AgentProfile) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ agent, skillNameMap, onSave, onDelete }) => {
  const { t, refresh } = useApp();
  const [userDir, setUserDir] = useState(agent.userSkillsDir);
  const [projDir, setProjDir] = useState(agent.projectSkillsRelDir);
  const [mode, setMode] = useState<DeployMode>(agent.defaultDeployMode);
  const [guide, setGuide] = useState(agent.workflowGuideEnabled);

  const handleUnmuteSkill = async (skillId: string) => {
    await SkillsService.ToggleAgentGlobalMute(agent.id, skillId, false);
    await refresh();
  };

  return (
    <SettingsExpander
      icon={<Bot size={16} />}
      title={agent.name}
      description={`${agent.userSkillsDir || '—'}  ·  ${agent.projectSkillsRelDir || '—'}`}
      badges={
        <>
          {agent.detected && <Badge tone="success">{t.agents.detectedBadge}</Badge>}
          {!agent.builtin && <Badge tone="accent">{t.agents.customBadge}</Badge>}
          <Badge tone="neutral">{agent.defaultDeployMode}</Badge>
        </>
      }
      right={
        <ToggleSwitch
          checked={agent.enabled}
          onChange={(next) => void onSave({ ...agent, enabled: next })}
          label={agent.name}
        />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
            {t.agents.userDir}
          </label>
          <input
            className="fluent-input w-full font-mono text-[12px]"
            value={userDir}
            onChange={(e) => setUserDir(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
            {t.agents.projectRelDir}
          </label>
          <input
            className="fluent-input w-full font-mono text-[12px]"
            value={projDir}
            onChange={(e) => setProjDir(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {t.agents.defaultMode}:
            </span>
            <select
              className="fluent-input text-[12px] py-1"
              value={mode}
              onChange={(e) => setMode(e.target.value as DeployMode)}
            >
              <option value={DeployMode.DeployJunction}>Junction</option>
              <option value={DeployMode.DeployCopy}>Copy</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {t.agents.guideToggle}:
            </span>
            <ToggleSwitch checked={guide} onChange={setGuide} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!agent.builtin && (
            <button
              type="button"
              onClick={() => void onDelete(agent.id)}
              className="fluent-btn text-[12px] py-1 text-[var(--danger)]"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void onSave({
                ...agent,
                userSkillsDir: userDir,
                projectSkillsRelDir: projDir,
                defaultDeployMode: mode,
                workflowGuideEnabled: guide,
              })
            }
            className="fluent-btn fluent-btn-primary text-[12px] py-1 px-3"
          >
            <Save size={13} />
            Save
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--divider)]">
        <div className="text-[11.5px] text-[var(--text-secondary)] mb-1.5">
          {t.agents.mutedGlobal}:
        </div>
        {(agent.globalMutedSkillIds ?? []).length === 0 ? (
          <span className="text-[11.5px] text-[var(--text-muted)]">{t.agents.noMuted}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(agent.globalMutedSkillIds ?? []).map((sid) => (
              <span
                key={sid}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] bg-[var(--warning-soft)] text-[var(--warning)]"
              >
                {skillNameMap.get(sid) || sid}
                <button
                  type="button"
                  onClick={() => void handleUnmuteSkill(sid)}
                  className="cursor-pointer hover:opacity-75"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </SettingsExpander>
  );
};
