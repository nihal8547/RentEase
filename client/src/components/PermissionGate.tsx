import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

export interface PermissionGateProps {
  module: string;
  action: string;
  fallback?: 'hide' | 'disable';
  children: React.ReactNode;
  className?: string;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  fallback = 'hide',
  children,
  className = '',
}) => {
  const hasPermission = useAuthStore((state) => state.hasPermission(module, action));

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback === 'hide') {
    return null;
  }

  return (
    <div
      className={`opacity-40 cursor-not-allowed pointer-events-none select-none ${className}`}
      title={`Access restricted: Requires ${module}:${action} permission`}
    >
      {children}
    </div>
  );
};

export default PermissionGate;
