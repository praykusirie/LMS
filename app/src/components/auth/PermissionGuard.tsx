import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions';
import { Unauthorized } from '@/pages/Unauthorized';

interface PermissionGuardProps {
  permission: string | null;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!permission) {
    return <>{children}</>;
  }

  if (!hasPermission(permission)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}

export function RedirectIfNoPermission({ permission, fallbackTo = '/dashboard' }: { permission: string | null; fallbackTo?: string }) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return null;
}

