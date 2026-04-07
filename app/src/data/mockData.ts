import type { 
  User, 
  Student, 
  Book, 
  BorrowRecord, 
  Activity, 
  Notification,
  DashboardStats,
  ChartDataPoint 
} from '@/types';

// Current User
export const currentUser: User = {
  id: '1',
  name: 'Sarah Anderson',
  email: 'sarah.anderson@school.edu',
  role: 'librarian',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&gender=female'
};

// Dashboard Stats
export const dashboardStats: DashboardStats = {
  totalBooks: 12430,
  borrowedBooks: 1204,
  overdueBooks: 86,
  registeredStudents: 3420
};

// Chart Data
export const borrowingTrends: ChartDataPoint[] = [
  { month: 'Jan', borrows: 420, returns: 380 },
  { month: 'Feb', borrows: 380, returns: 360 },
  { month: 'Mar', borrows: 520, returns: 480 },
  { month: 'Apr', borrows: 480, returns: 450 },
  { month: 'May', borrows: 600, returns: 550 },
  { month: 'Jun', borrows: 580, returns: 560 }
];

// Students
export const students: Student[] = [
  {
    id: 's1',
    name: 'Emma Wilson',
    admissionNumber: 'ADM2024001',
    class: 'Grade 10',
    gender: 'female',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&gender=female',
    email: 'emma.wilson@student.edu',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 0
  },
  {
    id: 's2',
    name: 'James Miller',
    admissionNumber: 'ADM2024002',
    class: 'Grade 11',
    gender: 'male',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James&gender=male',
    email: 'james.miller@student.edu',
    isActive: true,
    createdAt: '2024-01-16T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 1
  },
  {
    id: 's3',
    name: 'Olivia Martinez',
    admissionNumber: 'ADM2024003',
    class: 'Grade 10',
    gender: 'female',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia&gender=female',
    email: 'olivia.martinez@student.edu',
    isActive: true,
    createdAt: '2024-01-17T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 0
  },
  {
    id: 's4',
    name: 'Liam Johnson',
    admissionNumber: 'ADM2024004',
    class: 'Grade 12',
    gender: 'male',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&gender=male',
    email: 'liam.johnson@student.edu',
    isActive: true,
    createdAt: '2024-01-18T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 2
  },
  {
    id: 's5',
    name: 'Sophia Chen',
    admissionNumber: 'ADM2024005',
    class: 'Grade 9',
    gender: 'female',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&gender=female',
    email: 'sophia.chen@student.edu',
    isActive: true,
    createdAt: '2024-01-19T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 0
  },
  {
    id: 's6',
    name: 'Noah Brown',
    admissionNumber: 'ADM2024006',
    class: 'Grade 11',
    gender: 'male',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&gender=male',
    email: 'noah.brown@student.edu',
    isActive: false,
    createdAt: '2024-01-20T10:00:00Z',
    borrowHistory: [],
    currentBorrows: [],
    overdueCount: 0
  }
];

// Books
export const books: Book[] = [
  {
    id: 'b1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    category: 'Fiction',
    subject: 'English',
    class: 'Grade 10',
    quantity: 15,
    available: 8,
    shelfLocation: 'A-12-3',
    description: 'A classic American novel set in the Jazz Age.',
    publishedYear: 1925,
    publisher: 'Scribner',
    isActive: true,
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'b2',
    title: 'Biology: The Unity and Diversity of Life',
    author: 'Cecie Starr',
    isbn: '978-1337408332',
    category: 'Textbook',
    subject: 'Science',
    class: 'Grade 11',
    quantity: 20,
    available: 0,
    shelfLocation: 'B-05-2',
    description: 'Comprehensive biology textbook for high school students.',
    publishedYear: 2019,
    publisher: 'Cengage Learning',
    isActive: true,
    createdAt: '2024-01-11T10:00:00Z'
  },
  {
    id: 'b3',
    title: 'Chemistry: The Central Science',
    author: 'Theodore Brown',
    isbn: '978-0134292816',
    category: 'Textbook',
    subject: 'Science',
    class: 'Grade 12',
    quantity: 18,
    available: 12,
    shelfLocation: 'B-06-1',
    description: 'Leading chemistry textbook for advanced students.',
    publishedYear: 2017,
    publisher: 'Pearson',
    isActive: true,
    createdAt: '2024-01-12T10:00:00Z'
  },
  {
    id: 'b4',
    title: 'Mathematics for the International Student',
    author: 'James Stewart',
    isbn: '978-1921972058',
    category: 'Textbook',
    subject: 'Mathematics',
    class: 'Grade 10',
    quantity: 25,
    available: 20,
    shelfLocation: 'C-03-4',
    description: 'Mathematics textbook for IB and international curricula.',
    publishedYear: 2020,
    publisher: 'Haese Mathematics',
    isActive: true,
    createdAt: '2024-01-13T10:00:00Z'
  },
  {
    id: 'b5',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0061120084',
    category: 'Fiction',
    subject: 'English',
    class: 'Grade 9',
    quantity: 12,
    available: 5,
    shelfLocation: 'A-10-2',
    description: 'A novel about racial injustice in the American South.',
    publishedYear: 1960,
    publisher: 'J.B. Lippincott & Co.',
    isActive: true,
    createdAt: '2024-01-14T10:00:00Z'
  },
  {
    id: 'b6',
    title: 'Physics for Scientists and Engineers',
    author: 'Raymond Serway',
    isbn: '978-1133947271',
    category: 'Textbook',
    subject: 'Science',
    class: 'Grade 12',
    quantity: 15,
    available: 10,
    shelfLocation: 'B-07-3',
    description: 'Comprehensive physics textbook for advanced students.',
    publishedYear: 2018,
    publisher: 'Cengage Learning',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z'
  }
];

// Borrow Records
export const borrowRecords: BorrowRecord[] = [
  {
    id: 'br1',
    bookId: 'b1',
    bookTitle: 'The Great Gatsby',
    studentId: 's1',
    studentName: 'Emma Wilson',
    borrowDate: '2024-06-01T10:00:00Z',
    dueDate: '2024-06-15T10:00:00Z',
    status: 'borrowed'
  },
  {
    id: 'br2',
    bookId: 'b2',
    bookTitle: 'Biology: The Unity and Diversity of Life',
    studentId: 's2',
    studentName: 'James Miller',
    borrowDate: '2024-05-20T10:00:00Z',
    dueDate: '2024-06-03T10:00:00Z',
    returnDate: '2024-06-05T10:00:00Z',
    status: 'returned',
    lateDays: 2,
    penalty: 2.00
  },
  {
    id: 'br3',
    bookId: 'b1',
    bookTitle: 'The Great Gatsby',
    studentId: 's4',
    studentName: 'Liam Johnson',
    borrowDate: '2024-05-10T10:00:00Z',
    dueDate: '2024-05-24T10:00:00Z',
    status: 'overdue',
    lateDays: 14
  },
  {
    id: 'br4',
    bookId: 'b5',
    bookTitle: 'To Kill a Mockingbird',
    studentId: 's3',
    studentName: 'Olivia Martinez',
    borrowDate: '2024-06-05T10:00:00Z',
    dueDate: '2024-06-19T10:00:00Z',
    status: 'borrowed'
  }
];

// Activities
export const activities: Activity[] = [
  {
    id: 'a1',
    type: 'borrow',
    description: 'borrowed "The Great Gatsby"',
    userName: 'Emma Wilson',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&gender=female',
    timestamp: '2024-06-07T14:30:00Z'
  },
  {
    id: 'a2',
    type: 'return',
    description: 'Book returned: "Biology 101" by James Miller',
    userName: 'System',
    timestamp: '2024-06-07T14:15:00Z'
  },
  {
    id: 'a3',
    type: 'register',
    description: 'New student registered: Olivia Martinez',
    userName: 'System',
    timestamp: '2024-06-07T13:00:00Z'
  },
  {
    id: 'a4',
    type: 'reminder',
    description: 'Reminder sent to Liam Johnson',
    userName: 'System',
    timestamp: '2024-06-07T11:30:00Z'
  },
  {
    id: 'a5',
    type: 'add_book',
    description: 'New book added: "Physics for Scientists and Engineers"',
    userName: 'Sarah Anderson',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&gender=female',
    timestamp: '2024-06-07T10:00:00Z'
  }
];

// Notifications
export const notifications: Notification[] = [
  {
    id: 'n1',
    title: 'Overdue Book',
    message: 'Liam Johnson has an overdue book: "The Great Gatsby"',
    type: 'overdue',
    isRead: false,
    createdAt: '2024-06-07T10:00:00Z'
  },
  {
    id: 'n2',
    title: 'System Update',
    message: 'Library system will be under maintenance tonight at 2 AM.',
    type: 'system',
    isRead: false,
    createdAt: '2024-06-06T16:00:00Z'
  },
  {
    id: 'n3',
    title: 'Book Available',
    message: '"Biology: The Unity and Diversity of Life" is now available.',
    type: 'reminder',
    isRead: true,
    createdAt: '2024-06-05T09:00:00Z'
  }
];

// Helper functions
export const getStudentById = (id: string): Student | undefined => {
  return students.find(s => s.id === id);
};

export const getBookById = (id: string): Book | undefined => {
  return books.find(b => b.id === id);
};

export const getOverdueRecords = (): BorrowRecord[] => {
  return borrowRecords.filter(r => r.status === 'overdue');
};

export const getStudentCurrentBorrows = (studentId: string): BorrowRecord[] => {
  return borrowRecords.filter(r => r.studentId === studentId && r.status === 'borrowed');
};

export const getStudentBorrowHistory = (studentId: string): BorrowRecord[] => {
  return borrowRecords.filter(r => r.studentId === studentId);
};
