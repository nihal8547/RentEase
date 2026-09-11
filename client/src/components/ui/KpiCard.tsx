import React from 'react';

export interface KpiCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  edgeColor?: 'gold' | 'green' | 'amber' | 'maroon';
  variant?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

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
  const displayTitle = title || label || '';
  const displaySubtitle = subtitle || subtext;

  let resolvedColor: 'gold' | 'green' | 'amber' | 'maroon' = edgeColor || 'gold';
  if (variant === 'positive') resolvedColor = 'green';
  if (variant === 'negative') resolvedColor = 'maroon';

  const edgeClasses = {
    gold: 'accent-edge-gold',
    green: 'accent-edge-green',
    amber: 'accent-edge-amber',
    maroon: 'accent-edge-maroon',
  }[resolvedColor];

  return (
    <div
      className={`bg-white border border-line rounded p-5 shadow-sm hover:shadow transition-shadow duration-150 ${edgeClasses} ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          {displayTitle}
        </span>
        {icon && <div className="text-ink-400">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl font-bold tracking-tight text-ink-900">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trendPositive ? 'text-emerald-700' : 'text-ruby-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {displaySubtitle && (
        <p className="text-xs text-ink-600 mt-2 font-normal leading-snug">
          {displaySubtitle}
        </p>
      )}
    </div>
  );
};

export default KpiCard;
