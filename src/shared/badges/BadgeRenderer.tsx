import React from 'react';

type BadgeStylePreset = 'standard' | 'gold' | 'silver' | 'bronze' | 'founding' | 'platinum' | 'dark';

interface BadgeRendererProps {
  companyName: string;
  membershipTier: string;
  tagline?: string;
  stylePreset?: BadgeStylePreset | string;
  ratingLabel?: string | number | null;
  backgroundImageUrl?: string | null;
  className?: string;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const STYLE_PRESETS: Record<string, { gradient: string; border: string; text: string; pill: string; overlay?: string }> = {
  standard: {
    gradient: 'from-yellow-100 via-white to-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    overlay: 'bg-gradient-to-r from-amber-50/70 via-white/70 to-amber-100/60',
  },
  bronze: {
    gradient: 'from-amber-100 via-white to-orange-100',
    border: 'border-amber-300',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  gold: {
    gradient: 'from-amber-50 via-white to-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  silver: {
    gradient: 'from-slate-50 via-white to-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-800',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  founding: {
    gradient: 'from-slate-100 via-white to-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-900',
    pill: 'bg-slate-200 text-slate-900 border-slate-300',
  },
  platinum: {
    gradient: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-slate-700',
    text: 'text-white',
    pill: 'bg-white/10 text-white border-white/20',
    overlay: 'bg-gradient-to-br from-white/5 via-transparent to-white/10',
  },
  dark: {
    gradient: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-slate-700',
    text: 'text-white',
    pill: 'bg-white/10 text-white border-white/20',
    overlay: 'bg-gradient-to-br from-white/5 via-transparent to-white/10',
  },
};

const getPresetKey = (stylePreset?: BadgeRendererProps['stylePreset']): string => {
  if (!stylePreset) return 'standard';
  const normalized = stylePreset.toString().toLowerCase();
  if (normalized.includes('gold')) return 'gold';
  if (normalized.includes('bronze')) return 'bronze';
  if (normalized.includes('silver')) return 'silver';
  if (normalized.includes('founding')) return 'founding';
  if (normalized.includes('plat')) return 'platinum';
  if (normalized.includes('dark')) return 'dark';
  return STYLE_PRESETS[normalized] ? normalized : 'standard';
};

export const BadgeRenderer: React.FC<BadgeRendererProps> = ({
  companyName,
  membershipTier,
  tagline,
  stylePreset = 'standard',
  ratingLabel,
  backgroundImageUrl,
  className,
}) => {
  const presetKey = getPresetKey(stylePreset);
  const preset = STYLE_PRESETS[presetKey];

  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-2xl border shadow-[0_10px_50px_rgba(0,0,0,0.12)]',
        'w-full max-w-[560px] bg-gradient-to-br',
        preset.gradient,
        preset.border,
        className,
      )}
    >
      {backgroundImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      )}
      {preset.overlay && <div className={cx('absolute inset-0 pointer-events-none', preset.overlay)} />}

      <div className="relative grid grid-cols-[140px_1fr] gap-4 p-5 sm:p-6">
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 px-3 py-4 shadow-inner backdrop-blur">
          <div
            className={cx(
              'flex h-16 w-16 items-center justify-center rounded-full border-2 text-lg font-black uppercase',
              preset.pill,
            )}
          >
            {membershipTier.slice(0, 2)}
          </div>
          {ratingLabel && (
            <div className={cx('rounded-full px-3 py-1 text-xs font-semibold', preset.pill)}>
              Rating: {ratingLabel}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-2">
          <p className={cx('text-xs font-semibold uppercase tracking-[0.2em]', preset.text)}>Verified Member</p>
          <h3 className={cx('text-2xl font-black leading-tight', preset.text)}>{companyName}</h3>
          <div className={cx('text-sm font-semibold', preset.text)}>{membershipTier}</div>
          {tagline && <p className="text-sm text-[var(--text-muted)]">{tagline}</p>}
        </div>
      </div>
    </div>
  );
};

export default BadgeRenderer;
