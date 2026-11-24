import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  Grid3X3,
  Layers,
  Lightbulb,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import {
  BUILTIN_AGENTS_DOC,
  DOCS_DATA,
  PRACTICE_SKILL_PRESETS,
  PRACTICE_SKILL_TAG,
  SKILL_TEMPLATES,
  type AppNavTarget,
  type DocLocale,
  type DocTab,
} from '../data/docs/index.ts';
import { useApp, type NavTab } from '../context/AppContext';
import {
  Badge,
  PageHeader,
  SegmentedControl,
  SettingsExpander,
} from '../components/FluentUI';

const PROGRESS_STORAGE_KEY = 'skillsman.docs.progress.v1';

function loadSavedProgress(): string[] {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveProgressIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage errors in restricted WebView environments
  }
}

function matchesText(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

export const DocsPage: React.FC = () => {
  const { snapshot, setActiveTab, openSkillDrawer, refresh, notify, t } = useApp();

  const locale: DocLocale = snapshot?.state.settings.language === 'en-US' ? 'en-US' : 'zh-CN';
  const currentTheme = snapshot?.state.settings.theme ?? 'system';
  const doc = DOCS_DATA[locale];

  const [docTab, setDocTab] = useState<DocTab>('guide');
  const [route, setRoute] = useState<'trackA' | 'trackB'>('trackA');
  const [activeScope, setActiveScope] = useState<'store' | 'global' | 'user' | 'project'>('store');
  const [search, setSearch] = useState('');
  const [doneCases, setDoneCases] = useState<Set<string>>(() => new Set(loadSavedProgress()));
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedCaseId, setHighlightedCaseId] = useState<string | null>(null);

  const demoSkill = useMemo(
    () =>
      (snapshot?.state.skills ?? []).find((sk) =>
        (sk.tags ?? []).includes(PRACTICE_SKILL_TAG)
      ) ?? null,
    [snapshot?.state.skills]
  );

  const q = search.trim().toLowerCase();

  const filteredConcepts = useMemo(
    () =>
      doc.guide.concepts.filter((c) =>
        matchesText(
          `${c.title} ${c.analogy} ${c.summary} ${c.details.join(' ')}`,
          q
        )
      ),
    [doc.guide.concepts, q]
  );

  const filteredCases = useMemo(
    () =>
      doc.guide.cases.filter((c) =>
        matchesText(
          `${c.badge} ${c.title} ${c.scenario} ${c.goal} ${c.steps
            .map((s) => `${s.title} ${s.detail} ${s.uiPath} ${s.tip ?? ''}`)
            .join(' ')} ${c.advancedNote.title} ${c.advancedNote.bullets.join(' ')}`,
          q
        )
      ),
    [doc.guide.cases, q]
  );

  const filteredRoles = useMemo(
    () =>
      doc.guide.roles.filter((r) =>
        matchesText(
          `${r.title} ${r.subtitle} ${r.persona} ${r.outcome} ${r.checklist
            .map((x) => x.label)
            .join(' ')}`,
          q
        )
      ),
    [doc.guide.roles, q]
  );

  const filteredTemplates = useMemo(
    () =>
      SKILL_TEMPLATES.filter((tpl) => {
        const title = locale === 'en-US' ? tpl.titleEn : tpl.titleZh;
        const desc = locale === 'en-US' ? tpl.descEn : tpl.descZh;
        return matchesText(`${title} ${desc} ${tpl.code}`, q);
      }),
    [locale, q]
  );

  const filteredModules = useMemo(
    () =>
      doc.features.modules.filter((m) =>
        matchesText(
          `${m.badge} ${m.title} ${m.summary} ${m.controls
            .map((c) => `${c.name} ${c.desc}`)
            .join(' ')} ${m.tips.join(' ')}`,
          q
        )
      ),
    [doc.features.modules, q]
  );

  const filteredAgents = useMemo(
    () =>
      BUILTIN_AGENTS_DOC.filter((a) =>
        matchesText(
          `${a.name} ${a.userSkillsDir} ${a.projectSkillsRelDir} ${
            locale === 'en-US' ? a.detectNotesEn : a.detectNotesZh
          }`,
          q
        )
      ),
    [locale, q]
  );

  const filteredMechanisms = useMemo(
    () =>
      doc.features.mechanisms.filter((m) =>
        matchesText(
          `${m.badge} ${m.title} ${m.summary} ${m.paragraphs.join(' ')} ${(
            m.bullets ?? []
          ).join(' ')} ${m.codeBlock?.code ?? ''}`,
          q
        )
      ),
    [doc.features.mechanisms, q]
  );

  const totalCases = doc.guide.cases.length;
  const doneCount = doc.guide.cases.filter((c) => doneCases.has(c.id)).length;
  const progressPct = Math.round((doneCount / Math.max(1, totalCases)) * 100);

  const activeScopeObj =
    doc.guide.scopeLayers.find((l) => l.id === activeScope) ?? doc.guide.scopeLayers[0];

  const handleOpenInBrowser = async () => {
    setOpeningBrowser(true);
    try {
      await SkillsService.OpenDocsInBrowser(docTab, locale, currentTheme);
      notify(t.docs.openedBrowserToast, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setOpeningBrowser(false);
    }
  };

  const handleCreateDemo = async () => {
    setSandboxBusy(true);
    try {
      const preset = PRACTICE_SKILL_PRESETS[locale];
      await SkillsService.CreateSkill(
        preset.name,
        preset.desc,
        preset.author,
        preset.version,
        [...preset.tags],
        preset.body
      );
      await refresh();
      notify(doc.sandbox.createdToast, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSandboxBusy(false);
    }
  };

  const handleCleanupDemo = async () => {
    if (!demoSkill) return;
    setSandboxBusy(true);
    try {
      await SkillsService.DeleteSkill(demoSkill.id);
      await refresh();
      notify(doc.sandbox.cleanedToast, 'info');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSandboxBusy(false);
    }
  };

  const toggleCaseDone = (caseId: string, checked: boolean) => {
    const next = new Set(doneCases);
    if (checked) next.add(caseId);
    else next.delete(caseId);
    setDoneCases(next);
    saveProgressIds(next);
  };

  const resetProgress = () => {
    const next = new Set<string>();
    setDoneCases(next);
    saveProgressIds(next);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    notify(doc.guide.copiedText, 'success');
    window.setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 1800);
  };

  const jumpToElement = (elId: string) => {
    const el = document.getElementById(elId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const jumpToCase = (caseId: string) => {
    setRoute('trackA');
    setHighlightedCaseId(caseId);
    window.setTimeout(() => {
      jumpToElement(caseId);
    }, 40);
    window.setTimeout(() => {
      setHighlightedCaseId((cur) => (cur === caseId ? null : cur));
    }, 1800);
  };

  const navigateApp = (tab: AppNavTarget) => {
    setActiveTab(tab as NavTab);
  };

  const guideNoResults =
    docTab === 'guide' &&
    q !== '' &&
    filteredConcepts.length === 0 &&
    filteredCases.length === 0 &&
    filteredRoles.length === 0 &&
    filteredTemplates.length === 0;

  const featuresNoResults =
    docTab === 'features' &&
    q !== '' &&
    filteredModules.length === 0 &&
    filteredAgents.length === 0 &&
    filteredMechanisms.length === 0;

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title={t.docs.title}
        subtitle={t.docs.subtitle}
        actions={
          <>
            <SegmentedControl
              value={docTab}
              onChange={(val) => setDocTab(val as DocTab)}
              options={[
                { value: 'guide', label: doc.hero.tabGuide },
                { value: 'features', label: doc.hero.tabFeatures },
              ]}
            />
            <button
              type="button"
              disabled={openingBrowser}
              onClick={() => void handleOpenInBrowser()}
              className="fluent-btn fluent-btn-primary"
            >
              <ExternalLink size={14} />
              {doc.hero.openBrowserBtn}
            </button>
          </>
        }
      />

      {/* Search & Progress Toolbar */}
      <div className="fluent-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            className="fluent-input w-full pl-8 pr-8"
            placeholder={doc.hero.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title={doc.ui.clearSearch}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {docTab === 'guide' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {doc.hero.progressLabel}:{' '}
              <strong className="text-[var(--text-primary)]">
                {doneCount} / {totalCases}
              </strong>{' '}
              ({progressPct}%)
            </span>
            <div className="w-[120px] h-2 rounded-full bg-[var(--card-subtle)] border border-[var(--card-border)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${progressPct}%`, background: 'var(--accent)' }}
              />
            </div>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={resetProgress}
                className="fluent-btn text-[12px] py-1 px-2.5"
              >
                <RotateCcw size={12} />
                {doc.hero.resetProgressBtn}
              </button>
            )}
          </div>
        )}
      </div>

      {(guideNoResults || featuresNoResults) && (
        <div className="fluent-card p-8 text-center space-y-3">
          <div className="text-[13.5px] text-[var(--text-secondary)]">
            {doc.ui.noSearchMatches}
          </div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="fluent-btn fluent-btn-primary"
          >
            {doc.ui.clearSearch}
          </button>
        </div>
      )}

      {/* ==================== GUIDE TAB ==================== */}
      {docTab === 'guide' && !guideNoResults && (
        <div className="space-y-6">
          {/* Beginner Practice Sandbox */}
          <div
            className="fluent-card p-4 space-y-3"
            style={{ borderColor: 'var(--accent-border)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="accent">
                    <Sparkles size={11} />
                    {doc.sandbox.badge}
                  </Badge>
                  <span className="text-[14.5px] font-semibold text-[var(--text-primary)]">
                    {doc.sandbox.title}
                  </span>
                </div>
                <p className="text-[12.5px] text-[var(--text-secondary)]">
                  {demoSkill ? doc.sandbox.descExists : doc.sandbox.descReady}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {!demoSkill ? (
                  <button
                    type="button"
                    disabled={sandboxBusy}
                    onClick={() => void handleCreateDemo()}
                    className="fluent-btn fluent-btn-primary"
                  >
                    <Sparkles size={14} />
                    {doc.sandbox.createBtn}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openSkillDrawer(demoSkill.id)}
                      className="fluent-btn"
                    >
                      <Eye size={13} className="text-[var(--accent)]" />
                      {doc.sandbox.openDrawerBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('matrix')}
                      className="fluent-btn"
                    >
                      <Grid3X3 size={13} className="text-[var(--accent)]" />
                      {doc.sandbox.goMatrixBtn}
                    </button>
                    <button
                      type="button"
                      disabled={sandboxBusy}
                      onClick={() => void handleCleanupDemo()}
                      className="fluent-btn text-[var(--danger)]"
                    >
                      <Trash2 size={13} />
                      {doc.sandbox.cleanupBtn}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lesson 0: Core Concepts */}
          {filteredConcepts.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <BookMarked size={17} className="text-[var(--accent)]" />
                  {doc.guide.conceptsTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {doc.guide.conceptsSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredConcepts.map((c) => (
                  <div key={c.id} className="fluent-card p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="accent">{c.badge}</Badge>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {c.title}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium text-[var(--accent)]">
                      {c.analogy}
                    </div>
                    <p className="text-[12.5px] text-[var(--text-secondary)]">
                      {c.summary}
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[12px] text-[var(--text-secondary)]">
                      {c.details.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interactive 3-Tier Scope Diagram + Matrix Legend */}
          {!q && (
            <>
              <section className="space-y-3">
                <div>
                  <h2 className="text-[17px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Layers size={17} className="text-[var(--accent)]" />
                    {doc.guide.scopeDiagramTitle}
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                    {doc.guide.scopeDiagramSubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {doc.guide.scopeLayers.map((layer) => {
                    const active = layer.id === activeScope;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setActiveScope(layer.id)}
                        className="fluent-card p-3.5 text-left cursor-pointer transition-colors"
                        style={
                          active
                            ? {
                                background: 'var(--accent-soft)',
                                borderColor: 'var(--accent-border)',
                              }
                            : undefined
                        }
                      >
                        <Badge tone={active ? 'accent' : 'neutral'}>{layer.badge}</Badge>
                        <div className="text-[13px] font-semibold text-[var(--text-primary)] mt-2">
                          {layer.title}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 truncate">
                          {layer.pathHint}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="fluent-card p-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="accent">{activeScopeObj.badge}</Badge>
                    <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                      {activeScopeObj.title}
                    </span>
                    <code className="text-[11.5px] font-mono px-2 py-0.5 rounded bg-[var(--card-subtle)] border border-[var(--card-border)]">
                      {activeScopeObj.pathHint}
                    </code>
                  </div>
                  <p className="text-[12.5px] text-[var(--text-secondary)]">
                    {activeScopeObj.meaning}
                  </p>
                  <p className="text-[12.5px] text-[var(--text-primary)]">
                    <span className="text-[var(--accent)] font-semibold">→ </span>
                    {activeScopeObj.whenToUse}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {activeScopeObj.ruleSummary}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h2 className="text-[17px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Grid3X3 size={17} className="text-[var(--accent)]" />
                    {doc.guide.matrixLegendTitle}
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                    {doc.guide.matrixLegendSubtitle}
                  </p>
                </div>

                <div className="fluent-card p-3.5 space-y-2">
                  {doc.guide.matrixLegend.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-[var(--card-border)] flex flex-wrap items-start gap-3"
                      style={{ background: 'var(--card-subtle)' }}
                    >
                      <Badge tone={item.tone} className="min-w-[88px] justify-center">
                        {item.label}
                      </Badge>
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-[12.5px] text-[var(--text-primary)]">
                          {item.meaning}
                        </div>
                        <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                          {item.clickAction}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Dual Route Section: Track A (6 Steps) + Track B (Role Tracks) */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                value={route}
                onChange={(v) => setRoute(v as 'trackA' | 'trackB')}
                options={[
                  { value: 'trackA', label: doc.guide.routeSwitchLabelA },
                  { value: 'trackB', label: doc.guide.routeSwitchLabelB },
                ]}
              />
              <span className="text-[12.5px] text-[var(--text-secondary)]">
                {route === 'trackA' ? doc.guide.routeADesc : doc.guide.routeBDesc}
              </span>
            </div>

            {(route === 'trackA' || q !== '') && (
              <div className="space-y-4">
                {filteredCases.map((c) => {
                  const done = doneCases.has(c.id);
                  const isHighlighted = highlightedCaseId === c.id;
                  return (
                    <div
                      key={c.id}
                      id={c.id}
                      className="fluent-card p-5 space-y-3.5 transition-all"
                      style={
                        isHighlighted
                          ? {
                              borderColor: 'var(--accent)',
                              boxShadow: '0 0 0 2px var(--accent-soft)',
                            }
                          : undefined
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge tone="accent">{c.badge}</Badge>
                            <Badge tone="neutral">{c.duration}</Badge>
                            {done && (
                              <Badge tone="success">
                                <CheckCircle2 size={11} />
                                {doc.guide.doneBadge}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                            {c.title}
                          </h3>
                        </div>

                        <label className="fluent-btn text-[12px] py-1.5 px-3 select-none">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent)]"
                            checked={done}
                            onChange={(e) => toggleCaseDone(c.id, e.target.checked)}
                          />
                          <span>{doc.guide.doneCheckboxLabel}</span>
                        </label>
                      </div>

                      <div
                        className="p-3 rounded-lg border border-[var(--card-border)] space-y-1 text-[12.5px]"
                        style={{ background: 'var(--card-subtle)' }}
                      >
                        <div className="text-[var(--text-primary)]">
                          <strong>{t.docs.scenarioLabel} </strong>
                          {c.scenario}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          <strong>{t.docs.goalLabel} </strong>
                          {c.goal}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {c.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-[var(--card-border)] flex items-start gap-3"
                            style={{ background: 'var(--card-subtle)' }}
                          >
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5"
                              style={{ background: 'var(--accent)', color: '#ffffff' }}
                            >
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                                  {step.title}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge tone="neutral">{step.uiPath}</Badge>
                                  {step.targetTab && (
                                    <button
                                      type="button"
                                      onClick={() => navigateApp(step.targetTab!)}
                                      className="fluent-btn text-[11.5px] py-0.5 px-2.5 text-[var(--accent)]"
                                    >
                                      {step.targetLabel || t.docs.goPracticeBtn}
                                      <ArrowRight size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                                {step.detail}
                              </p>
                              {step.tip && (
                                <div
                                  className="px-3 py-2 rounded-md text-[12px] flex items-start gap-2"
                                  style={{
                                    background: 'var(--accent-soft)',
                                    borderLeft: '3px solid var(--accent)',
                                  }}
                                >
                                  <Lightbulb
                                    size={14}
                                    className="text-[var(--accent)] shrink-0 mt-0.5"
                                  />
                                  <span className="text-[var(--text-primary)]">{step.tip}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="px-3.5 py-2.5 rounded-lg text-[12.5px] flex items-start gap-2"
                        style={{ background: 'var(--success-soft)' }}
                      >
                        <CheckCircle2
                          size={15}
                          className="text-[var(--success)] shrink-0 mt-0.5"
                        />
                        <div>
                          <strong className="text-[var(--success)]">
                            {doc.guide.verifyLabel}{' '}
                          </strong>
                          <span className="text-[var(--text-primary)]">{c.verify}</span>
                        </div>
                      </div>

                      <SettingsExpander
                        icon={<Compass size={15} />}
                        title={c.advancedNote.title}
                      >
                        <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-[var(--text-secondary)]">
                          {c.advancedNote.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </SettingsExpander>
                    </div>
                  );
                })}
              </div>
            )}

            {(route === 'trackB' || q !== '') && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {filteredRoles.map((r) => (
                  <div
                    key={r.id}
                    className="fluent-card p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <Badge tone="accent">{r.badge}</Badge>
                      <div>
                        <h3 className="text-[15.5px] font-semibold text-[var(--text-primary)]">
                          {r.title}
                        </h3>
                        <div className="text-[12.5px] font-medium text-[var(--accent)] mt-0.5">
                          {r.subtitle}
                        </div>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)]">{r.persona}</p>
                      <p className="text-[12px] text-[var(--text-primary)] font-medium">
                        {r.outcome}
                      </p>

                      <div className="space-y-1.5 pt-1">
                        {r.checklist.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-md border border-[var(--card-border)] flex items-center justify-between gap-2"
                            style={{ background: 'var(--card-subtle)' }}
                          >
                            <button
                              type="button"
                              onClick={() => jumpToCase(item.caseId)}
                              className="text-[12px] text-left text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer flex-1"
                            >
                              {item.label}
                            </button>
                            {item.targetTab && (
                              <button
                                type="button"
                                onClick={() => navigateApp(item.targetTab!)}
                                className="fluent-btn text-[11px] py-0.5 px-2 shrink-0"
                              >
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => jumpToCase(r.recommendedCaseIds[0] || 'case-1')}
                      className="fluent-btn fluent-btn-primary w-full"
                    >
                      {doc.guide.roleGoCaseBtn}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ready-to-Use SKILL.md Templates */}
          {filteredTemplates.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
                  {doc.guide.templatesTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {doc.guide.templatesSubtitle}
                </p>
              </div>

              <div className="space-y-3">
                {filteredTemplates.map((tpl) => {
                  const title = locale === 'en-US' ? tpl.titleEn : tpl.titleZh;
                  const desc = locale === 'en-US' ? tpl.descEn : tpl.descZh;
                  const copied = copiedId === tpl.id;
                  return (
                    <div key={tpl.id} className="fluent-card p-4 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge tone="accent">{tpl.badge}</Badge>
                            <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                              {title}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                            {desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopy(tpl.id, tpl.code)}
                          className="fluent-btn fluent-btn-primary text-[12px] py-1 px-3"
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? doc.guide.copiedText : doc.guide.copyBtn}
                        </button>
                      </div>

                      <pre
                        className="p-3 rounded-lg border border-[var(--card-border)] font-mono text-[12px] overflow-x-auto select-text"
                        style={{ background: 'var(--card-subtle)', userSelect: 'text' }}
                      >
                        {tpl.code}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ==================== FEATURES TAB ==================== */}
      {docTab === 'features' && !featuresNoResults && (
        <div className="space-y-6">
          {/* Quick Jump Anchors */}
          {!q && (
            <div className="fluent-card p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] font-semibold text-[var(--text-muted)] mr-1">
                  {t.docs.quickJumpModules}:
                </span>
                {doc.features.modules.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => jumpToElement(m.id)}
                    className="fluent-btn text-[11.5px] py-0.5 px-2.5"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] font-semibold text-[var(--text-muted)] mr-1">
                  {t.docs.quickJumpSpecs}:
                </span>
                <button
                  type="button"
                  onClick={() => jumpToElement('feat-agents-table')}
                  className="fluent-btn text-[11.5px] py-0.5 px-2.5"
                >
                  {doc.features.tocAgentsTitle}
                </button>
                {doc.features.mechanisms.map((mech) => (
                  <button
                    key={mech.id}
                    type="button"
                    onClick={() => jumpToElement(mech.id)}
                    className="fluent-btn text-[11.5px] py-0.5 px-2.5"
                  >
                    {mech.badge}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8 UI Modules */}
          {filteredModules.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
                  {doc.features.modulesTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {doc.features.modulesSubtitle}
                </p>
              </div>

              <div className="space-y-3">
                {filteredModules.map((m) => (
                  <div key={m.id} id={m.id} className="fluent-card p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone="accent">{m.badge}</Badge>
                          <h3 className="text-[15.5px] font-semibold text-[var(--text-primary)]">
                            {m.title}
                          </h3>
                        </div>
                        <p className="text-[12.5px] text-[var(--text-secondary)]">
                          {m.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateApp(m.navTab)}
                        className="fluent-btn text-[12px] py-1 px-2.5 shrink-0"
                      >
                        {doc.features.openPageBtn}
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {m.controls.map((ctrl, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-[var(--card-border)]"
                          style={{ background: 'var(--card-subtle)' }}
                        >
                          <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                            {ctrl.name}
                          </div>
                          <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                            {ctrl.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    {m.tips.length > 0 && (
                      <div
                        className="px-3 py-2 rounded-md text-[12px] flex items-start gap-2"
                        style={{
                          background: 'var(--accent-soft)',
                          borderLeft: '3px solid var(--accent)',
                        }}
                      >
                        <Lightbulb
                          size={14}
                          className="text-[var(--accent)] shrink-0 mt-0.5"
                        />
                        <span>
                          <strong>{doc.features.tipsLabel}: </strong>
                          {m.tips.join(' ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 11 Built-in Agent Presets Table */}
          {filteredAgents.length > 0 && (
            <section id="feat-agents-table" className="space-y-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Cpu size={17} className="text-[var(--accent)]" />
                  {doc.features.agentsTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {doc.features.agentsSubtitle}
                </p>
              </div>

              <div className="fluent-card overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr
                      className="border-b border-[var(--divider)]"
                      style={{ background: 'var(--card-subtle)' }}
                    >
                      {doc.features.agentsHeaders.map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((a) => (
                      <tr key={a.id} className="border-b border-[var(--divider)] last:border-b-0">
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{a.name}</td>
                        <td className="px-3 py-2.5">
                          <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-[var(--card-subtle)] border border-[var(--card-border)]">
                            {a.userSkillsDir}
                          </code>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-[var(--card-subtle)] border border-[var(--card-border)]">
                            {a.projectSkillsRelDir}
                          </code>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone="neutral">{a.defaultMode}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                          {locale === 'en-US' ? a.detectNotesEn : a.detectNotesZh}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Core Mechanisms & Specs */}
          {filteredMechanisms.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
                  {doc.features.mechanismsTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {doc.features.mechanismsSubtitle}
                </p>
              </div>

              <div className="space-y-3">
                {filteredMechanisms.map((mech) => (
                  <div key={mech.id} id={mech.id} className="fluent-card p-4 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="accent">{mech.badge}</Badge>
                      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                        {mech.title}
                      </h3>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)]">{mech.summary}</p>
                    {mech.paragraphs.map((p, idx) => (
                      <p key={idx} className="text-[12.5px] text-[var(--text-secondary)]">
                        {p}
                      </p>
                    ))}
                    {mech.bullets && mech.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-[var(--text-secondary)]">
                        {mech.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}

                    {mech.table && (
                      <div className="border border-[var(--card-border)] rounded-lg overflow-x-auto mt-1">
                        <table className="w-full border-collapse text-[12.5px]">
                          <thead>
                            <tr
                              className="border-b border-[var(--divider)]"
                              style={{ background: 'var(--card-subtle)' }}
                            >
                              {mech.table.headers.map((h) => (
                                <th key={h} className="text-left px-3 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {mech.table.rows.map((r, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-[var(--divider)] last:border-b-0"
                              >
                                {r.cols.map((col, ci) => (
                                  <td key={ci} className="px-3 py-2 align-top">
                                    {col}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {mech.codeBlock && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                            {mech.codeBlock.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopy(mech.id, mech.codeBlock!.code)}
                            className="fluent-btn text-[11.5px] py-0.5 px-2.5"
                          >
                            {copiedId === mech.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === mech.id ? doc.guide.copiedText : doc.guide.copyBtn}
                          </button>
                        </div>
                        <pre
                          className="p-3 rounded-lg border border-[var(--card-border)] font-mono text-[12px] overflow-x-auto select-text"
                          style={{ background: 'var(--card-subtle)', userSelect: 'text' }}
                        >
                          {mech.codeBlock.code}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
