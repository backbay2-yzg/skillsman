import React, { useEffect, useState } from 'react';
import {
  Palette,
  Languages,
  HardDrive,
  FolderOpen,
  Globe,
  KeyRound,
  BellRing,
  Power,
  Terminal,
  Save,
  Info,
} from 'lucide-react';
import * as SkillsService from '../../bindings/skillsman/internal/service/skillsservice';
import {
  Language,
  ThemeMode,
  type Settings,
} from '../../bindings/skillsman/internal/model/models';
import { useApp } from '../context/AppContext';
import {
  Badge,
  PageHeader,
  SegmentedControl,
  SettingsCard,
  ToggleSwitch,
} from '../components/FluentUI';

export const SettingsPage: React.FC = () => {
  const { snapshot, refresh, notify, t } = useApp();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (snapshot?.state.settings) {
      setForm({ ...snapshot.state.settings });
    }
  }, [snapshot?.state.settings]);

  if (!form || !snapshot) return null;

  const save = async (next: Settings) => {
    setForm(next);
    setSaving(true);
    try {
      await SkillsService.SaveSettings(next);
      await refresh();
      notify(t.settings.savedToast, 'success');
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePickStore = async () => {
    try {
      const dir = await SkillsService.PickStoreRootFolder();
      if (dir) {
        await save({ ...form, customStoreRoot: dir });
      }
    } catch (err: any) {
      notify(err?.message || String(err), 'error');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={t.settings.title}
        subtitle={t.settings.subtitle}
        actions={
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(form)}
            className="fluent-btn fluent-btn-primary"
          >
            <Save size={14} />
            {t.settings.saveBtn}
          </button>
        }
      />

      {/* Appearance & Language */}
      <section className="space-y-2">
        <div className="text-[12.5px] font-semibold text-[var(--text-secondary)] px-1">
          {t.settings.secAppearance}
        </div>
        <SettingsCard
          icon={<Palette size={16} />}
          title={t.settings.themeLabel}
          description={t.settings.themeDesc}
          right={
            <SegmentedControl
              value={form.theme}
              onChange={(v) => void save({ ...form, theme: v as ThemeMode })}
              options={[
                { value: ThemeMode.ThemeSystem, label: t.settings.themeSystem },
                { value: ThemeMode.ThemeLight, label: t.settings.themeLight },
                { value: ThemeMode.ThemeDark, label: t.settings.themeDark },
              ]}
            />
          }
        />
        <SettingsCard
          icon={<Palette size={16} />}
          title={t.settings.accentLabel}
          description={t.settings.accentDesc}
          right={
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full border border-[var(--card-border)]"
                style={{ background: snapshot.systemTheme.accentColor }}
              />
              <ToggleSwitch
                checked={form.followSystemAccent}
                onChange={(next) => void save({ ...form, followSystemAccent: next })}
              />
            </div>
          }
        />
        <SettingsCard
          icon={<Languages size={16} />}
          title={t.settings.langLabel}
          description={t.settings.langDesc}
          right={
            <SegmentedControl
              value={form.language}
              onChange={(v) => void save({ ...form, language: v as Language })}
              options={[
                { value: Language.LangZhCN, label: '简体中文' },
                { value: Language.LangEnUS, label: 'English' },
              ]}
            />
          }
        />
      </section>

      {/* Storage & Portable */}
      <section className="space-y-2">
        <div className="text-[12.5px] font-semibold text-[var(--text-secondary)] px-1">
          {t.settings.secStorage}
        </div>
        <SettingsCard
          icon={<HardDrive size={16} />}
          title={t.settings.storePathLabel}
          description={snapshot.portable ? t.settings.portableOn : t.settings.portableOff}
          right={
            <div className="flex items-center gap-2">
              <Badge tone={snapshot.portable ? 'accent' : 'neutral'}>
                {snapshot.storeRoot}
              </Badge>
              <button
                type="button"
                onClick={() => void SkillsService.OpenStoreFolder()}
                className="fluent-btn text-[12px] py-1"
              >
                <FolderOpen size={13} />
                {t.settings.openDir}
              </button>
            </div>
          }
        />
        {!snapshot.portable && (
          <SettingsCard
            icon={<FolderOpen size={16} />}
            title={t.settings.customRootLabel}
            description={t.settings.customRootDesc}
            right={
              <div className="flex items-center gap-2">
                <input
                  className="fluent-input w-[220px] font-mono text-[12px]"
                  placeholder="~/.skillsman"
                  value={form.customStoreRoot}
                  onChange={(e) => setForm({ ...form, customStoreRoot: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => void handlePickStore()}
                  className="fluent-btn text-[12px] py-1"
                >
                  {t.settings.chooseDir}
                </button>
              </div>
            }
          />
        )}
      </section>

      {/* Network & Proxy */}
      <section className="space-y-2">
        <div className="text-[12.5px] font-semibold text-[var(--text-secondary)] px-1">
          {t.settings.secNetwork}
        </div>
        <SettingsCard
          icon={<Globe size={16} />}
          title={t.settings.proxyLabel}
          description={t.settings.proxyDesc}
          right={
            <input
              className="fluent-input w-[240px] font-mono text-[12px]"
              placeholder="http://127.0.0.1:7890"
              value={form.httpProxy}
              onChange={(e) => setForm({ ...form, httpProxy: e.target.value })}
            />
          }
        />
        <SettingsCard
          icon={<Globe size={16} />}
          title={t.settings.mirrorLabel}
          description={t.settings.mirrorDesc}
          right={
            <input
              className="fluent-input w-[240px] font-mono text-[12px]"
              placeholder="https://gh-proxy.com/"
              value={form.githubMirror}
              onChange={(e) => setForm({ ...form, githubMirror: e.target.value })}
            />
          }
        />
        <SettingsCard
          icon={<KeyRound size={16} />}
          title={t.settings.tokenLabel}
          description={t.settings.tokenDesc}
          right={
            <input
              type="password"
              className="fluent-input w-[240px] font-mono text-[12px]"
              placeholder="ghp_..."
              value={form.githubToken}
              onChange={(e) => setForm({ ...form, githubToken: e.target.value })}
            />
          }
        />
      </section>

      {/* Tray & Background */}
      <section className="space-y-2">
        <div className="text-[12.5px] font-semibold text-[var(--text-secondary)] px-1">
          {t.settings.secTray}
        </div>
        <SettingsCard
          icon={<BellRing size={16} />}
          title={t.settings.closeToTrayLabel}
          description={t.settings.closeToTrayDesc}
          right={
            <ToggleSwitch
              checked={form.closeToTray}
              onChange={(next) => void save({ ...form, closeToTray: next })}
            />
          }
        />
        <SettingsCard
          icon={<Power size={16} />}
          title={t.settings.autoStartLabel}
          description={t.settings.autoStartDesc}
          right={
            <ToggleSwitch
              checked={form.autoStart}
              onChange={(next) => void save({ ...form, autoStart: next })}
            />
          }
        />
        <SettingsCard
          icon={<BellRing size={16} />}
          title={t.settings.autoUpdateLabel}
          description={t.settings.autoUpdateDesc}
          right={
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={15}
                max={1440}
                className="fluent-input w-[84px] text-center"
                value={form.checkIntervalMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    checkIntervalMinutes: Math.max(15, Number(e.target.value) || 60),
                  })
                }
              />
              <ToggleSwitch
                checked={form.autoCheckUpdates}
                onChange={(next) => void save({ ...form, autoCheckUpdates: next })}
              />
            </div>
          }
        />
        <SettingsCard
          icon={<Terminal size={16} />}
          title={t.settings.editorLabel}
          description={t.settings.editorDesc}
          right={
            <input
              className="fluent-input w-[220px] font-mono text-[12px]"
              placeholder="code"
              value={form.defaultEditor}
              onChange={(e) => setForm({ ...form, defaultEditor: e.target.value })}
            />
          }
        />
      </section>

      {/* About */}
      <SettingsCard
        icon={<Info size={16} />}
        title={`SkillsMan v${snapshot.appVersion}`}
        description="Go + Wails v3 + React · Windows 11 Fluent Mica · Native System Tray"
      />
    </div>
  );
};
