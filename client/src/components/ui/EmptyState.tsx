import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-8 text-center rounded-2xl bg-white border border-dashed border-line ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-sand-100 text-maroon-700 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs text-ink-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-maroon-700 hover:bg-maroon-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
