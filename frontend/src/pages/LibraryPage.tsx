import React, { useMemo, useState } from 'react';
import {
  Plus,
  FolderPlus,
  FileArchive,
  Radar,
  BookOpen,
  BookMarked,
  ArrowUpCircle,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import type { LocalDetectedSkill } from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import { Badge, EmptyState, Modal, PageHeader, SegmentedControl } from '../components/FluentUI';
import { CreateSkillModal } from '../components/CreateSkillModal';

export const LibraryPage: React.FC = () => {
  const { snapshot, openSkillDrawer, setActiveTab, refresh, notify, t } = useApp();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const [adoptModalOpen, setAdoptModalOpen] = useState(false);
  const [detectedLocal, setDetectedLocal] = useState<LocalDetectedSkill[]>([]);
  const [selectedAdoptPaths, setSelectedAdoptPaths] = useState<Set<string>>(new Set());
  const [adopting, setAdopting] = useState(false);

  const skills = snapshot?.state.skills ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((sk) => {
      if (sourceFilter !== 'all' && sk.sourceType !== sourceFilter) return false;
      if (!q) return true;
      return (
        sk.name.toLowerCase().includes(q) ||
        sk.slug.toLowerCase().includes(q) ||
        sk.description.toLowerCase().includes(q) ||
        (sk.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [skills, search, sourceFilter]);

  const handleImportFolder = async () => {
    try {
      const sk = await SkillsService.ImportSkillFolder();
      if (sk) {
        await refresh();
        notify(`Imported ${sk.name}`, 'success');
      }
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleImportZip = async () => {
    try {
      const sk = await SkillsService.ImportSkillZip();
      if (sk) {
        await refresh();
        notify(`Imported ${sk.name}`, 'success');
      }
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleScanLocal = async () => {
    try {
      const items = (await SkillsService.ScanLocalSkills()) ?? [];
      setDetectedLocal(items);
      setSelectedAdoptPaths(new Set(items.filter((i) => !i.alreadyInDb).map((i) => i.path)));
      setAdoptModalOpen(true);
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  const handleAdoptSelected = async () => {
    const paths = Array.from(selectedAdoptPaths);
    if (paths.length === 0) return;
    setAdopting(true);
    try {
      const adopted = (await SkillsService.AdoptLocalSkills(paths)) ?? [];
      await refresh();
      setAdoptModalOpen(false);
      notify(`Adopted ${adopted.length} skill(s)`, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setAdopting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.library.title}
        subtitle={t.library.subtitle}
        actions={
          <>
            <button type="button" onClick={() => void handleScanLocal()} className="fluent-btn">
              <Radar size={14} className="text-[var(--accent)]" />
              {t.library.scanLocal}
            </button>
            <button type="button" onClick={() => void handleImportFolder()} className="fluent-btn">
              <FolderPlus size={14} />
              {t.library.importFolder}
            </button>
            <button type="button" onClick={() => void handleImportZip()} className="fluent-btn">
              <FileArchive size={14} />
              {t.library.importZip}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="fluent-btn fluent-btn-primary"
            >
              <Plus size={14} />
              {t.library.newSkill}
            </button>
          </>
        }
      />

      <div className="fluent-card p-3 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            { value: 'all', label: t.library.allSources },
            { value: 'local', label: 'Local' },
            { value: 'git', label: 'Git' },
            { value: 'registry', label: 'Market' },
            { value: 'adopted', label: 'Adopted' },
          ]}
        />
        <input
          className="fluent-input w-full sm:w-[260px]"
          placeholder={t.library.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title={t.library.emptyTitle}
          description={t.library.emptyDesc}
          action={
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button type="button" onClick={() => setActiveTab('docs')} className="fluent-btn">
                <BookMarked size={14} className="text-[var(--accent)]" />
                {t.docs.openGuideBtn}
              </button>
              <button type="button" onClick={() => void handleScanLocal()} className="fluent-btn">
                <Radar size={14} />
                {t.library.scanLocal}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="fluent-btn fluent-btn-primary"
              >
                <Plus size={14} />
                {t.library.newSkill}
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((sk) => (
            <div
              key={sk.id}
              onClick={() => openSkillDrawer(sk.id)}
              className="fluent-card fluent-card-interactive p-4 cursor-pointer flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                      {sk.name}
                    </div>
                    <div className="text-[11.5px] font-mono text-[var(--text-muted)] truncate">
                      {sk.slug}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sk.hasUpdate && (
                      <Badge tone="warning">
                        <ArrowUpCircle size={11} />
                        {t.library.updateAvailable}
                      </Badge>
                    )}
                    <Badge tone="accent">{sk.sourceType}</Badge>
                  </div>
                </div>

                {sk.description && (
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {sk.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--divider)]">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {(sk.tags ?? []).slice(0, 3).map((tag) => (
                    <Badge key={tag} tone="neutral">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                  {(sk.files ?? []).length} files
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSkillModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal
        open={adoptModalOpen}
        title={t.library.adoptModalTitle}
        onClose={() => setAdoptModalOpen(false)}
        widthClass="max-w-2xl"
      >
        {detectedLocal.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[var(--text-secondary)]">
            {t.library.noLocalFound}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12.5px] text-[var(--text-secondary)]">{t.library.adoptModalDesc}</p>
            <div className="space-y-2 max-h-[340px] overflow-y-auto fluent-scroll pr-1">
              {detectedLocal.map((item) => {
                const checked = selectedAdoptPaths.has(item.path);
                return (
                  <label
                    key={item.path}
                    className="fluent-card p-3 flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-[var(--accent)]"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedAdoptPaths);
                        if (e.target.checked) next.add(item.path);
                        else next.delete(item.path);
                        setSelectedAdoptPaths(next);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13px]">{item.name}</span>
                        <Badge tone="accent">{item.agentName}</Badge>
                        {item.alreadyInDb && <Badge tone="warning">Slug exists</Badge>}
                      </div>
                      {item.description && (
                        <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                      <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                        {item.path}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdoptModalOpen(false)}
                className="fluent-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adopting || selectedAdoptPaths.size === 0}
                onClick={() => void handleAdoptSelected()}
                className="fluent-btn fluent-btn-primary"
              >
                {t.library.adoptSelected} ({selectedAdoptPaths.size})
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
