import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import api from '@/lib/api';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  assigned?: boolean;
}

const routePermissionMap: Array<{ path: string; permission: string }> = [
  { path: '/dashboard', permission: 'dashboard:view' },
  { path: '/students', permission: 'students:view' },
  { path: '/add-student', permission: 'students:create' },
  { path: '/books', permission: 'books:view' },
  { path: '/add-book', permission: 'books:create' },
  { path: '/classes', permission: 'master:view' },
  { path: '/categories', permission: 'master:view' },
  { path: '/subjects', permission: 'master:view' },
  { path: '/shelf-locations', permission: 'master:view' },
  { path: '/items', permission: 'items:view' },
  { path: '/teachers', permission: 'teachers:view' },
  { path: '/add-teacher', permission: 'teachers:create' },
  { path: '/teachers/:teacherId/view', permission: 'teachers:view' },
  { path: '/class-activities', permission: 'class_activities:view' },
  { path: '/results', permission: 'results:view' },
  { path: '/attendance', permission: 'attendance:view' },
  { path: '/books-items-management/issue-book', permission: 'borrow:view' },
  { path: '/books-items-management/return-book', permission: 'borrow:view' },
  { path: '/books-items-management/items-distribution', permission: 'distribution:view' },
  { path: '/books-items-management/items-distribution/new', permission: 'distribution:create' },
  { path: '/overdue', permission: 'overdue:view' },
  { path: '/reports', permission: 'reports:view' },
  { path: '/settings', permission: 'settings:view' },
  { path: '/user-management/user-master', permission: 'users:view' },
  { path: '/user-management/role-master', permission: 'roles:view' },
  { path: '/user-management/permissions', permission: 'permissions:manage' },
  { path: '/library-inventory/stock-details', permission: 'stock:view' },
  { path: '/library-inventory/add-stock', permission: 'stock:view' },
  { path: '/finance/create-invoice', permission: 'finance:create' },
  { path: '/finance/report', permission: 'finance:view' },
  { path: '/finance/fee-structure', permission: 'finance:manage_fees' },
];

export function getRequiredPermission(pathname: string) {
  const match = routePermissionMap
    .sort((a, b) => b.path.length - a.path.length)
    .find((entry) => pathname.startsWith(entry.path));

  return match?.permission ?? null;
}

export function usePermissions() {
  const { data: session, isPending: isSessionPending } = useSession();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    if (!session?.user?.role) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        const { data: roles } = await api.get('/roles');
        const currentRole = roles.find((role: { id: string; name: string }) => role.name === session.user.role);

        if (!currentRole) {
          setPermissions([]);
          return;
        }

        const { data } = await api.get(`/permissions/role/${currentRole.id}`);
        setPermissions(data.filter((permission: UserPermission) => permission.assigned));
      } catch (error) {
        console.error('Error fetching current user permissions:', error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [session?.user?.role, isSessionPending]);

  const permissionKeys = useMemo(
    () => new Set(permissions.map((permission) => `${permission.module}:${permission.action}`)),
    [permissions]
  );

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    if (session?.user?.role === 'admin') return true;
    return permissionKeys.has(permission);
  };

  return {
    permissions,
    permissionKeys,
    hasPermission,
    isLoading: isLoading || isSessionPending,
    role: session?.user?.role ?? null,
    user: session?.user ?? null,
  };
}
