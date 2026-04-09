import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from '@/layout/MainLayout';
import { 
  Login, 
  Dashboard, 
  Books, 
  AddBook, 
  Students, 
  AddStudent, 
  Classes,
  Categories,
  Subjects,
  ShelfLocations,
  BorrowReturn, 
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
  AddTeacher
} from '@/pages';
import './App.css';
import { useSession } from '@/lib/auth-client';

function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
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
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Master Management */}
        <Route path="/students" element={<Students />} />
        <Route path="/add-student" element={<AddStudent />} />
        <Route path="/books" element={<Books />} />
        <Route path="/add-book" element={<AddBook />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/shelf-locations" element={<ShelfLocations />} />
        <Route path="/items" element={<ItemsMaster />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/add-teacher" element={<AddTeacher />} />
        <Route path="/teachers/:teacherId" element={<AddTeacher />} />

        {/* User Management */}
        <Route path="/user-management/user-master" element={<UserMaster />} />
        <Route path="/user-management/role-master" element={<RoleMaster />} />
        <Route path="/user-management/permissions" element={<PermissionsPage />} />

        {/* Library Inventory */}
        <Route path="/library-inventory/add-stock" element={<StockList />} />
        <Route path="/library-inventory/add-stock/new" element={<StockView />} />
        <Route path="/library-inventory/add-stock/:stockId" element={<StockView />} />
        <Route path="/library-inventory/stock-details" element={<StockDetails />} />

        {/* Other */}
        <Route path="/borrow-return" element={<BorrowReturn />} />
        <Route path="/overdue" element={<Overdue />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
