import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export function MainLayout({ children, activePage, onNavigate }: MainLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      // Dropdowns are handled internally
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNavigate = (page: string) => {
    setIsSidebarCollapsed(true);
    onNavigate(page);
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Sidebar */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Top Bar */}
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} isCollapsed={isSidebarCollapsed} />

      {/* Main Content */}
      <main className={cn(
        "pt-[72px] min-h-screen transition-all duration-300",
        isSidebarCollapsed ? "ml-[80px]" : "ml-[260px]"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
