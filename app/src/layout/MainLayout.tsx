import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onCollapse={() => setIsSidebarCollapsed(true)}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Top Bar */}
      <TopBar
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onExpandSidebar={() => setIsSidebarCollapsed(false)}
      />

      {/* Main Content */}
      <main className={cn(
        "pt-[72px] min-h-screen transition-all duration-300",
        isMobile ? "ml-0" : (isSidebarCollapsed ? "ml-[80px]" : "ml-[260px]")
      )}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
