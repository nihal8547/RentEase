import React from 'react';
import { useTranslation } from 'react-i18next';

export type StatusType =
  | 'OCCUPIED' | 'VACANT' | 'MAINTENANCE'
  | 'PAID' | 'PENDING' | 'OVERDUE'
  | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  | 'ACTIVE' | 'EXPIRING' | 'CANCELLED' | 'DRAFT';

interface StatusPillProps {
  status: StatusType | string;
  customLabel?: string;
  className?: string;
  dot?: boolean;
}

type StyleConfig = { bg: string; text: string; border: string; dot: string };

const statusStyles: Record<string, StyleConfig> = {
  OCCUPIED:    { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-600/20', dot: 'bg-emerald-600' },
  PAID:        { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-600/20', dot: 'bg-emerald-600' },
  COMPLETED:   { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-600/20', dot: 'bg-emerald-600' },
  ACTIVE:      { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-600/20', dot: 'bg-emerald-600' },

  VACANT:      { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-600/20',   dot: 'bg-amber-600'   },
  PENDING:     { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-600/20',   dot: 'bg-amber-600'   },
  IN_PROGRESS: { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-600/20',   dot: 'bg-amber-600'   },
  MEDIUM:      { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-600/20',   dot: 'bg-amber-600'   },

  OVERDUE:     { bg: 'bg-ruby-100',    text: 'text-ruby-700',    border: 'border-ruby-600/20',    dot: 'bg-ruby-600'    },
  URGENT:      { bg: 'bg-ruby-100',    text: 'text-ruby-700',    border: 'border-ruby-600/20',    dot: 'bg-ruby-600'    },
  EXPIRING:    { bg: 'bg-ruby-100',    text: 'text-ruby-700',    border: 'border-ruby-600/20',    dot: 'bg-ruby-600'    },
  HIGH:        { bg: 'bg-ruby-100',    text: 'text-ruby-700',    border: 'border-ruby-600/20',    dot: 'bg-ruby-600'    },
  CANCELLED:   { bg: 'bg-ruby-100',    text: 'text-ruby-700',    border: 'border-ruby-600/20',    dot: 'bg-ruby-600'    },

  MAINTENANCE: { bg: 'bg-sky-100',     text: 'text-sky-600',     border: 'border-sky-600/20',     dot: 'bg-sky-600'     },
  OPEN:        { bg: 'bg-sand-100',    text: 'text-ink-600',     border: 'border-line',           dot: 'bg-ink-400'     },
  LOW:         { bg: 'bg-sand-100',    text: 'text-ink-600',     border: 'border-line',           dot: 'bg-ink-400'     },
  DRAFT:       { bg: 'bg-sand-100',    text: 'text-ink-600',     border: 'border-line',           dot: 'bg-ink-400'     },
};

const defaultStyle: StyleConfig = { bg: 'bg-sand-100', text: 'text-ink-600', border: 'border-line', dot: 'bg-ink-400' };

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  customLabel,
  className = '',
  dot = true,
}) => {
  const { t } = useTranslation();
  const key = status?.toUpperCase() || '';
  const style = statusStyles[key] || defaultStyle;

  const getLabel = (st: string): string => {
    if (customLabel) return customLabel;
    const labels: Record<string, string> = {
      OCCUPIED: t('common.occupied'),
      VACANT: t('common.vacant'),
      PAID: t('common.paid'),
      PENDING: t('common.pending'),
      OVERDUE: t('common.overdue'),
      OPEN: t('common.open'),
      IN_PROGRESS: t('common.inProgress'),
      COMPLETED: t('common.completed'),
      URGENT: t('common.urgent'),
      HIGH: t('common.high'),
      MEDIUM: t('common.medium'),
      LOW: t('common.low'),
    };
    return labels[st] || st.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />}
      {getLabel(key)}
    </span>
  );
};

export default StatusPill;
