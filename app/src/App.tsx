import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from '@/layout/MainLayout';
import { 
  Login, 
  Dashboard, 
  Books, 
  AddBook,
  BookDetail, 
  Students, 
  AddStudent,
  EditStudent, 
  StudentDetail,
  Classes,
  Categories,
  Subjects,
  ShelfLocations,
  IssueBook,
  ReturnBook,
  ItemsDistribution,
  ItemsDistributionCreate,
  BorrowRecords,
  Overdue, 
  Reports, 
  Settings,
  UserMaster,
  RoleMaster,
  PermissionsPage,
  ItemsMaster,
  StockList,
  StockDetails,
  StockView,
  Teachers,
  AddTeacher,
  TeacherDetail,
  ClassActivities,
  Results,
  CreateInvoice,
  FinanceReport,
  FeeStructureEditor,
  Attendance,
  ResetPassword
} from '@/pages';
import { NotFound } from '@/pages/NotFound';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import './App.css';
import { useSession } from '@/lib/auth-client';
import { Toaster } from '@/components/ui/sonner';

function G({ p, children }: { p: string | null; children: React.ReactNode }) {
  return <PermissionGuard permission={p}>{children}</PermissionGuard>;
}

function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

function PublicRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Public password reset (no auth required) */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<G p="dashboard:view"><Dashboard /></G>} />
        
        {/* Master Management */}
        <Route path="/students" element={<G p="students:view"><Students /></G>} />
        <Route path="/add-student" element={<G p="students:create"><AddStudent /></G>} />
        <Route path="/students/:studentId" element={<G p="students:view"><StudentDetail /></G>} />
        <Route path="/students/:studentId/edit" element={<G p="students:edit"><EditStudent /></G>} />
        <Route path="/books" element={<G p="books:view"><Books /></G>} />
        <Route path="/add-book" element={<G p="books:create"><AddBook /></G>} />
        <Route path="/books/:bookId" element={<G p="books:view"><BookDetail /></G>} />
        <Route path="/classes" element={<G p="master:view"><Classes /></G>} />
        <Route path="/categories" element={<G p="master:view"><Categories /></G>} />
        <Route path="/subjects" element={<G p="master:view"><Subjects /></G>} />
        <Route path="/shelf-locations" element={<G p="master:view"><ShelfLocations /></G>} />
        <Route path="/items" element={<G p="items:view"><ItemsMaster /></G>} />
        <Route path="/teachers" element={<G p="teachers:view"><Teachers /></G>} />
        <Route path="/add-teacher" element={<G p="teachers:create"><AddTeacher /></G>} />
        <Route path="/teachers/:teacherId/view" element={<G p="teachers:view"><TeacherDetail /></G>} />
        <Route path="/teachers/:teacherId" element={<G p="teachers:edit"><AddTeacher /></G>} />

        {/* User Management */}
        <Route path="/user-management/user-master" element={<G p="users:view"><UserMaster /></G>} />
        <Route path="/user-management/role-master" element={<G p="roles:view"><RoleMaster /></G>} />
        <Route path="/user-management/permissions" element={<G p="permissions:manage"><PermissionsPage /></G>} />

        {/* Class Management */}
        <Route path="/class-activities" element={<G p="class_activities:view"><ClassActivities /></G>} />
        <Route path="/results" element={<G p="results:view"><Results /></G>} />
        <Route path="/attendance" element={<G p="attendance:view"><Attendance /></G>} />

        {/* Library Inventory */}
        <Route path="/library-inventory/add-stock" element={<G p="stock:view"><StockList /></G>} />
        <Route path="/library-inventory/add-stock/new" element={<G p="stock:create"><StockView /></G>} />
        <Route path="/library-inventory/add-stock/:stockId" element={<G p="stock:edit"><StockView /></G>} />
        <Route path="/library-inventory/stock-details" element={<G p="stock:view"><StockDetails /></G>} />

        {/* Other */}
        <Route path="/books-items-management/issue-book" element={<G p="borrow:view"><IssueBook /></G>} />
        <Route path="/books-items-management/return-book" element={<G p="borrow:view"><ReturnBook /></G>} />
        <Route path="/books-items-management/items-distribution" element={<G p="distribution:view"><ItemsDistribution /></G>} />
        <Route path="/books-items-management/items-distribution/new" element={<G p="distribution:create"><ItemsDistributionCreate /></G>} />
        <Route path="/overdue" element={<G p="overdue:view"><Overdue /></G>} />
        <Route path="/borrow-records" element={<G p="library:view"><BorrowRecords /></G>} />
        <Route path="/reports" element={<G p="reports:view"><Reports /></G>} />

        {/* Finance */}
        <Route path="/finance/create-invoice" element={<G p="finance:create"><CreateInvoice /></G>} />
        <Route path="/finance/report" element={<G p="finance:view"><FinanceReport /></G>} />
        <Route path="/finance/fee-structure" element={<G p="finance:manage_fees"><FeeStructureEditor /></G>} />

        <Route path="/settings" element={<G p="settings:view"><Settings /></G>} />
      </Route>

      {/* 404 page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Toaster position="top-right" richColors closeButton />
    </ErrorBoundary>
  );
}

export default App;

