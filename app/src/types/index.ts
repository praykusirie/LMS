// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'librarian';
  avatar?: string;
}

// Student Types
export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  gender: 'male' | 'female' | 'other';
  avatar: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  borrowHistory: BorrowRecord[];
  currentBorrows: BorrowRecord[];
  overdueCount: number;
}

// Book Types
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  subject: string;
  class: string;
  quantity: number;
  available: number;
  shelfLocation: string;
  description?: string;
  publishedYear?: number;
  publisher?: string;
  isActive: boolean;
  createdAt: string;
}

// Borrow Record Types
export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  lateDays?: number;
  penalty?: number;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'borrow' | 'return' | 'register' | 'reminder' | 'add_book';
  description: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'overdue' | 'system' | 'reminder';
  isRead: boolean;
  createdAt: string;
}

// Stats Types
export interface DashboardStats {
  totalBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  registeredStudents: number;
}

// Chart Data Types
export interface ChartDataPoint {
  month: string;
  borrows: number;
  returns: number;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// Filter Types
export interface BookFilters {
  search?: string;
  category?: string;
  subject?: string;
  class?: string;
  availability?: 'all' | 'available' | 'unavailable';
}

export interface StudentFilters {
  search?: string;
  class?: string;
  status?: 'all' | 'active' | 'inactive';
}
