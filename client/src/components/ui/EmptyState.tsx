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
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white/60 border border-dashed border-[#EDE8DE] ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#F4F1EA] text-[#6E1731] flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-[#221E1C] font-['Poppins']">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-[#706B65] max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-[#6E1731] hover:bg-[#8C243E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
