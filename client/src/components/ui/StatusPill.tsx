import React from 'react';
import { useTranslation } from 'react-i18next';

export type StatusType =
  | 'OCCUPIED'
  | 'VACANT'
  | 'MAINTENANCE'
  | 'PAID'
  | 'PENDING'
  | 'OVERDUE'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'URGENT'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'ACTIVE'
  | 'EXPIRING';

interface StatusPillProps {
  status: StatusType | string;
  customLabel?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  customLabel,
  className = '',
}) => {
  const { t } = useTranslation();

  const getStyles = (st: string) => {
    switch (st.toUpperCase()) {
      case 'OCCUPIED':
      case 'PAID':
      case 'COMPLETED':
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-600 border border-emerald-600/20';
      case 'VACANT':
      case 'PENDING':
      case 'IN_PROGRESS':
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-600 border border-amber-600/20';
      case 'OVERDUE':
      case 'URGENT':
      case 'EXPIRING':
      case 'HIGH':
        return 'bg-ruby-100 text-ruby-600 border border-ruby-600/20';
      case 'MAINTENANCE':
      case 'OPEN':
      case 'LOW':
      default:
        return 'bg-sand-100 text-ink-600 border border-line';
    }
  };

  const getLabel = (st: string) => {
    if (customLabel) return customLabel;
    switch (st.toUpperCase()) {
      case 'OCCUPIED':
        return t('common.occupied');
      case 'VACANT':
        return t('common.vacant');
      case 'PAID':
        return t('common.paid');
      case 'PENDING':
        return t('common.pending');
      case 'OVERDUE':
        return t('common.overdue');
      case 'OPEN':
        return t('common.open');
      case 'IN_PROGRESS':
        return t('common.inProgress');
      case 'COMPLETED':
        return t('common.completed');
      case 'URGENT':
        return t('common.urgent');
      case 'HIGH':
        return t('common.high');
      case 'MEDIUM':
        return t('common.medium');
      case 'LOW':
        return t('common.low');
      default:
        return st;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${getStyles(
        status
      )} ${className}`}
    >
      {getLabel(status)}
    </span>
  );
};

export default StatusPill;
