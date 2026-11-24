import React, { useState } from 'react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import { useApp } from '../context/AppContext';
import { Modal } from './FluentUI';

export const CreateSkillModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { refresh, openSkillDrawer, notify, t } = useApp();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [body, setBody] = useState(
    '## When to use\n\nDescribe the trigger conditions for this skill.\n\n## Instructions\n\n1. Step one\n2. Step two\n'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const tags = tagsStr
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      const created = await SkillsService.CreateSkill(
        name.trim(),
        desc.trim(),
        author.trim(),
        '1.0.0',
        tags,
        body
      );
      await refresh();
      onClose();
      setName('');
      setDesc('');
      setTagsStr('');
      openSkillDrawer(created.id);
      notify(`Created skill ${created.name}`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title={t.library.newSkill} onClose={onClose} widthClass="max-w-xl">
      <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t.drawer.name} *
            </label>
            <input
              required
              className="fluent-input w-full"
              placeholder="e.g. Go Clean Reviewer"
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
              placeholder="go, review, testing"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t.drawer.description}
            </label>
            <input
              className="fluent-input w-full"
              placeholder="Short summary for frontmatter"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
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
        </div>

        <div>
          <label className="text-[12px] text-[var(--text-secondary)] block mb-1">
            {t.drawer.markdownBody}
          </label>
          <textarea
            rows={8}
            className="fluent-input w-full font-mono text-[12.5px]"
            style={{ userSelect: 'text' }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="fluent-btn">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="fluent-btn fluent-btn-primary">
            {t.library.newSkill}
          </button>
        </div>
      </form>
    </Modal>
  );
};
