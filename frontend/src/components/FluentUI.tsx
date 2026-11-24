import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
    <div>
      <h1 className="text-[24px] font-semibold tracking-tight leading-tight text-[var(--text-primary)]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className="relative inline-flex items-center shrink-0 w-[40px] h-[20px] rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
    style={{
      background: checked ? 'var(--accent)' : 'transparent',
      border: checked ? '1px solid transparent' : '1px solid var(--input-border)',
    }}
  >
    <span
      className="inline-block w-[12px] h-[12px] rounded-full transition-transform duration-150"
      style={{
        background: checked ? '#ffffff' : 'var(--text-secondary)',
        transform: checked ? 'translateX(22px)' : 'translateX(3px)',
      }}
    />
  </button>
);

export const SettingsCard: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ icon, title, description, right, onClick, className = '' }) => (
  <div
    onClick={onClick}
    className={`fluent-card px-4 py-3.5 flex items-center justify-between gap-4 ${
      onClick ? 'fluent-card-interactive cursor-pointer' : ''
    } ${className}`}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      {icon && (
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-[var(--card-subtle)] text-[var(--text-secondary)]">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
          {title}
        </div>
        {description && (
          <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </div>
    {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
  </div>
);

export const SettingsExpander: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  badges?: React.ReactNode;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, description, badges, right, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="fluent-card overflow-hidden">
      <div
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer fluent-card-interactive"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-[var(--card-subtle)] text-[var(--accent)]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13.5px] font-medium text-[var(--text-primary)]">{title}</span>
              {badges}
            </div>
            {description && (
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {right}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-md hover:bg-[var(--card-subtle)] text-[var(--text-secondary)] cursor-pointer"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
      {open && (
        <div
          className="px-4 py-3.5 border-t border-[var(--divider)] space-y-3"
          style={{ background: 'var(--card-subtle)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}> = ({ children, tone = 'neutral', className = '' }) => {
  const styles: Record<BadgeTone, React.CSSProperties> = {
    neutral: {
      background: 'var(--card-subtle)',
      color: 'var(--text-secondary)',
      borderColor: 'var(--card-border)',
    },
    accent: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      borderColor: 'var(--accent-border)',
    },
    success: {
      background: 'var(--success-soft)',
      color: 'var(--success)',
      borderColor: 'transparent',
    },
    warning: {
      background: 'var(--warning-soft)',
      color: 'var(--warning)',
      borderColor: 'transparent',
    },
    danger: {
      background: 'var(--danger-soft)',
      color: 'var(--danger)',
      borderColor: 'transparent',
    },
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${className}`}
      style={styles[tone]}
    >
      {children}
    </span>
  );
};

export const SegmentedControl: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div
    className="inline-flex items-center p-0.5 rounded-md border border-[var(--card-border)]"
    style={{ background: 'var(--card-subtle)' }}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 rounded-[5px] text-[12.5px] font-medium transition-all cursor-pointer"
          style={
            active
              ? {
                  background: 'var(--card-hover)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                }
          }
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ open, title, onClose, widthClass = 'max-w-lg', children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.42)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} rounded-xl border border-[var(--card-border)] shadow-2xl overflow-hidden`}
        style={{ background: 'var(--drawer-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[var(--divider)] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--card-subtle)] text-[var(--text-secondary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto fluent-scroll">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="fluent-card p-10 flex flex-col items-center justify-center text-center gap-3">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
      {icon}
    </div>
    <div className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</div>
    <p className="text-[12.5px] text-[var(--text-secondary)] max-w-md">{description}</p>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
