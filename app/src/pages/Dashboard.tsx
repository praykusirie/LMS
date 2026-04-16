// Dashboard role router
import { usePermissions } from '@/lib/permissions';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { TeacherDashboard } from './dashboard/TeacherDashboard';
import { AccountantDashboard } from './dashboard/AccountantDashboard';
import { LibrarianDashboard } from './dashboard/LibrarianDashboard';

export function Dashboard() {
  const { role } = usePermissions();

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'accountant':
      return <AccountantDashboard />;
    default:
      return <LibrarianDashboard />;
  }
}
