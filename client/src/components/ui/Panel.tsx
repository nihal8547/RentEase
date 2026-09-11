import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-white border border-line rounded shadow-sm overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-sand-050/50">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-serif text-base font-semibold text-ink-900">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-ink-600 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? bodyClassName : `p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Panel;
