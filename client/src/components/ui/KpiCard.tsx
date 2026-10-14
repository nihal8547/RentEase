import React from 'react';

export interface KpiCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  edgeColor?: 'gold' | 'green' | 'amber' | 'maroon' | 'sky';
  variant?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

const edgeMap = {
  gold:   { bar: 'bg-gold-500',    icon: 'bg-gold-500/10  text-gold-500'   },
  green:  { bar: 'bg-emerald-600', icon: 'bg-emerald-100  text-emerald-600' },
  amber:  { bar: 'bg-amber-600',   icon: 'bg-amber-100    text-amber-600'  },
  maroon: { bar: 'bg-maroon-700',  icon: 'bg-maroon-800/10 text-maroon-700' },
  sky:    { bar: 'bg-sky-600',     icon: 'bg-sky-100      text-sky-600'    },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  label,
  value,
  subtitle,
  subtext,
  trend,
  trendPositive = true,
  edgeColor,
  variant,
  icon,
  className = '',
}) => {
  const displayTitle    = title || label || '';
  const displaySubtitle = subtitle || subtext;

  let resolvedColor: keyof typeof edgeMap = edgeColor || 'gold';
  if (variant === 'positive') resolvedColor = 'green';
  if (variant === 'negative') resolvedColor = 'maroon';

  const { bar, icon: iconStyle } = edgeMap[resolvedColor];

  return (
    <div
      className={`bg-white border border-line rounded-xl shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden ${className}`}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] w-full ${bar}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">
            {displayTitle}
          </span>
          {icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink-900">
            {value}
          </span>
          {trend && (
            <span
              className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                trendPositive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-ruby-100 text-ruby-700'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        {displaySubtitle && (
          <p className="text-xs text-ink-400 mt-2 leading-snug">{displaySubtitle}</p>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
