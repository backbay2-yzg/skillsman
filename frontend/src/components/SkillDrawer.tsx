import React, { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import {
  X,
  FolderOpen,
  ExternalLink,
  Save,
  Trash2,
  Eye,
  Edit3,
  Network,
  ArrowUpCircle,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { SkillContent, SkillTraceItem } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import { Badge } from './FluentUI';

function sanitizeRenderedHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
}

export const SkillDrawer: React.FC = () => {
  const { drawerSkillId, closeSkillDrawer, snapshot, refresh, notify, t } = useApp();
  const [tab, setTab] = useState<'preview' | 'edit' | 'trace'>('preview');
  const [content, setContent] = useState<SkillContent | null>(null);
  const [trace, setTrace] = useState<SkillTraceItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [author, setAuthor] = useState('');
  const [version, setVersion] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [body, setBody] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const skill = useMemo(
    () => (snapshot?.state.skills ?? []).find((s) => s.id === drawerSkillId) ?? null,
    [snapshot?.state.skills, drawerSkillId]
  );

  useEffect(() => {
    if (!drawerSkillId) {
      setContent(null);
      setTrace([]);
      setConfirmDelete(false);
      return;
    }
    setTab('preview');
    setConfirmDelete(false);
    void (async () => {
      try {
        const [c, tr] = await Promise.all([
          SkillsService.ReadSkillContent(drawerSkillId),
          SkillsService.TraceSkill(drawerSkillId),
        ]);
        setContent(c);
        setTrace(tr ?? []);
        setName(c.name || '');
        setDesc(c.description || '');
        setAuthor(c.author || '');
        setVersion(c.version || '');
        setTagsStr((c.tags ?? []).join(', '));
        setBody(c.body || '');
      } catch (err: any) {
        notify(err?.message || String(err), 'error');
      }
    })();
  }, [drawerSkillId, notify]);

  const renderedHtml = useMemo(() => {
    if (!body) return '';
    const raw = marked.parse(body, { async: false }) as string;
    return sanitizeRenderedHtml(raw);
  }, [body]);

  if (!drawerSkillId || !skill) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = tagsStr
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      await SkillsService.SaveSkillContent(skill.id, name, desc, author, version, tags, body);
      await refresh();
      const updatedContent = await SkillsService.ReadSkillContent(skill.id);
      setContent(updatedContent);
      notify(t.settings.savedToast, 'success');
      setTab('preview');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRemote = async () => {
    setSaving(true);
    try {
      await SkillsService.UpdateInstalledSkill(skill.id);
      await refresh();
      const c = await SkillsService.ReadSkillContent(skill.id);
      setContent(c);
      setBody(c.body || '');
      notify('Updated from upstream', 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await SkillsService.DeleteSkill(skill.id);
      closeSkillDrawer();
      await refresh();
      notify(`Deleted ${skill.name}`, 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0, 0, 0, 0.28)' }}
      onClick={closeSkillDrawer}
    >
      <div
        className="w-full max-w-[600px] h-full flex flex-col border-l border-[var(--card-border)] shadow-2xl"
        style={{ background: 'var(--drawer-bg)', backdropFilter: 'blur(20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--divider)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[17px] font-semibold text-[var(--text-primary)] truncate">
                {skill.name}
              </h2>
              <Badge tone="neutral">{skill.slug}</Badge>
              <Badge tone="accent">{skill.sourceType}</Badge>
              {skill.hasUpdate && <Badge tone="warning">{t.library.updateAvailable}</Badge>}
            </div>
            {skill.description && (
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                {skill.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closeSkillDrawer}
            className="p-1.5 rounded-md hover:bg-[var(--card-subtle)] text-[var(--text-secondary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action & Tab Strip */}
        <div className="px-5 py-2.5 border-b border-[var(--divider)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[
              { id: 'preview' as const, label: t.drawer.preview, icon: <Eye size={13} /> },
              { id: 'edit' as const, label: t.drawer.edit, icon: <Edit3 size={13} /> },
              { id: 'trace' as const, label: `${t.drawer.trace} (${trace.length})`, icon: <Network size={13} /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === item.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {skill.hasUpdate && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleUpdateRemote()}
                className="fluent-btn fluent-btn-primary text-[12px] py-1 px-2.5"
              >
                <ArrowUpCircle size={13} />
                {t.library.updateNow}
              </button>
            )}
            <button
              type="button"
              onClick={() => void SkillsService.OpenSkillFolder(skill.id)}
              className="fluent-btn text-[12px] py-1 px-2.5"
              title={t.drawer.openFolder}
            >
              <FolderOpen size={13} />
            </button>
            <button
              type="button"
              onClick={() => void SkillsService.OpenSkillEditor(skill.id)}
              className="fluent-btn text-[12px] py-1 px-2.5"
              title={t.drawer.openExternal}
            >
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto fluent-scroll p-5">
          {tab === 'preview' && (
            <div className="space-y-4">
              {(skill.tags ?? []).length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(skill.tags ?? []).map((tag) => (
                    <Badge key={tag} tone="neutral">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div
                className="md-body fluent-card p-4"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />

              {content && (content.files ?? []).length > 0 && (
                <div className="fluent-card p-3.5">
                  <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
                    Files ({content.files?.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(content.files ?? []).map((f) => (
                      <code
                        key={f}
                        className="text-[11.5px] px-2 py-0.5 rounded bg-[var(--card-subtle)] border border-[var(--card-border)]"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                    {t.drawer.name}
                  </label>
                  <input
                    className="fluent-input w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                    {t.drawer.tags}
                  </label>
                  <input
                    className="fluent-input w-full"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                    {t.drawer.author}
                  </label>
                  <input
                    className="fluent-input w-full"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                    {t.drawer.version}
                  </label>
                  <input
                    className="fluent-input w-full"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                  {t.drawer.description}
                </label>
                <input
                  className="fluent-input w-full"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
                  {t.drawer.markdownBody}
                </label>
                <textarea
                  rows={14}
                  className="fluent-input w-full font-mono text-[12.5px]"
                  style={{ userSelect: 'text' }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 'trace' && (
            <div className="space-y-2.5">
              {trace.length === 0 ? (
                <div className="fluent-card p-6 text-center text-[13px] text-[var(--text-secondary)]">
                  {t.drawer.noTrace}
                </div>
              ) : (
                trace.map((item, idx) => (
                  <div key={idx} className="fluent-card p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={item.scope === 'project' ? 'accent' : 'neutral'}>
                          {item.scope}
                        </Badge>
                        <span className="font-medium text-[13px]">{item.agentName}</span>
                        {item.projectName && (
                          <span className="text-[12px] text-[var(--text-secondary)]">
                            / {item.projectName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone="neutral">{item.deployMode}</Badge>
                        {item.muted ? (
                          <Badge tone="warning">Muted</Badge>
                        ) : item.status === 'conflict' ? (
                          <Badge tone="danger">Conflict</Badge>
                        ) : item.active ? (
                          <Badge tone="success">{item.status}</Badge>
                        ) : (
                          <Badge tone="neutral">{item.status}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)] font-mono truncate">
                      {item.targetPath}
                    </div>
                    {(item.sources ?? []).length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {(item.sources ?? []).map((s) => (
                          <Badge key={s} tone="neutral">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--divider)] flex items-center justify-between gap-2">
          <div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="fluent-btn text-[12.5px] text-[var(--danger)]"
              >
                <Trash2 size={13} />
                {t.drawer.delete}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="fluent-btn text-[12px]"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                  {t.drawer.delete}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="fluent-btn text-[12px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {tab === 'edit' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="fluent-btn fluent-btn-primary"
            >
              <Save size={14} />
              {t.drawer.save}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
