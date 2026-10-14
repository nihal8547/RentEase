import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  /** "sm" for compact header, "md" for default */
  headerSize?: 'sm' | 'md';
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
  headerSize = 'md',
}) => {
  const headerPad = headerSize === 'sm' ? 'px-4 py-3' : 'px-5 py-4';

  return (
    <div className={`bg-white border border-line rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between ${headerPad} border-b border-line bg-white`}>
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-ink-900 leading-tight truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-ink-400 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex items-center gap-2 ml-4 shrink-0">{action}</div>
          )}
        </div>
      )}
      <div className={noPadding ? bodyClassName : `p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Panel;
