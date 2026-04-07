import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Settings 
} from '@/pages';
import './App.css';
import type { Student, Book } from '@/types';
import { students as mockStudents, books as mockBooks } from '@/data/mockData';

type Page = 
  | 'login' 
  | 'dashboard' 
  | 'books' 
  | 'students' 
  | 'add-student'
  | 'add-book'
  | 'classes'
  | 'categories'
  | 'subjects'
  | 'shelf-locations'
  | 'borrow-return' 
  | 'overdue' 
  | 'reports' 
  | 'settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [books, setBooks] = useState<Book[]>(mockBooks);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleNavigate = (page: string) => {
    if (page === 'login') {
      setIsAuthenticated(false);
    } else {
      setCurrentPage(page as Page);
    }
  };

  const handleAddStudent = (student: Student) => {
    setStudents([student, ...students]);
  };

  const handleAddMultipleStudents = (newStudents: Student[]) => {
    setStudents([...newStudents, ...students]);
  };

  const handleAddBook = (book: Book) => {
    setBooks([book, ...books]);
  };

  const handleAddMultipleBooks = (newBooks: Book[]) => {
    setBooks([...newBooks, ...books]);
  };

  // Render the current page content
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'books':
        return <Books onNavigate={handleNavigate} />;
      case 'students':
        return <Students onNavigate={handleNavigate} />;
      case 'add-student':
        return (
          <AddStudent 
            onBack={() => handleNavigate('students')} 
            onAddStudent={handleAddStudent}
            onAddMultipleStudents={handleAddMultipleStudents}
          />
        );
      case 'add-book':
        return (
          <AddBook 
            onBack={() => handleNavigate('books')} 
            onAddBook={handleAddBook}
            onAddMultipleBooks={handleAddMultipleBooks}
          />
        );
      case 'classes':
        return <Classes />;
      case 'categories':
        return <Categories />;
      case 'subjects':
        return <Subjects />;
      case 'shelf-locations':
        return <ShelfLocations />;
      case 'borrow-return':
        return <BorrowReturn />;
      case 'overdue':
        return <Overdue />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <MainLayout activePage={currentPage} onNavigate={handleNavigate}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

export default App;
