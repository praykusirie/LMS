import { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  ArrowLeftRight, 
  AlertCircle, 
  FileText, 
  Settings, 
  LogOut,
  Library,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  GraduationCap,
  FolderTree,
  BookMarked,
  MapPin
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    id: 'master', 
    label: 'Master Management', 
    icon: Database,
    subItems: [
      { id: 'students', label: 'Students', icon: Users },
      { id: 'books', label: 'Books', icon: BookOpen },
      { id: 'classes', label: 'Classes', icon: GraduationCap },
      { id: 'categories', label: 'Book Categories', icon: FolderTree },
      { id: 'subjects', label: 'Subjects', icon: BookMarked },
      { id: 'shelf-locations', label: 'Shelf Locations', icon: MapPin },
    ]
  },
  { id: 'borrow-return', label: 'Borrow/Return', icon: ArrowLeftRight },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const masterSubPages = ['students', 'books', 'classes', 'categories', 'subjects', 'shelf-locations', 'add-student', 'add-book'];

export function Sidebar({ activePage, onNavigate, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    masterSubPages.includes(activePage) ? 'master' : null
  );

  const handleNavigate = (page: string, hasSubItems?: boolean) => {
    if (hasSubItems) {
      setExpandedMenu(expandedMenu === page ? null : page);
    } else {
      onNavigate(page);
    }
  };

  const handleSubNavigate = (page: string) => {
    onNavigate(page);
  };

  const isParentActive = (item: NavItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => activePage === sub.id) || 
             (activePage === 'add-student') || 
             (activePage === 'add-book');
    }
    return activePage === item.id;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-full bg-white shadow-[2px_0_12px_rgba(0,0,0,0.04)]",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-[72px] items-center border-b border-border/60",
        isCollapsed ? "justify-center px-2" : "gap-3 px-6"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy flex-shrink-0">
          <Library className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && <span className="text-lg font-bold text-foreground">LMS</span>}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-secondary"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Navigation */}
      <nav className={cn("flex flex-col gap-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")} style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isParentActive(item);
          const isExpanded = expandedMenu === item.id;
          const hasSubItems = !!item.subItems;
          
          return (
            <div key={item.id}>
              <button
                onClick={() => handleNavigate(item.id, hasSubItems)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex w-full items-center rounded-xl text-sm font-medium transition-colors duration-150',
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3',
                  isActive && !hasSubItems
                    ? 'bg-navy text-white'
                    : isActive && hasSubItems
                    ? 'bg-navy-light text-navy'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <div className={cn("flex items-center", !isCollapsed && "gap-3")}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && item.label}
                </div>
                {!isCollapsed && hasSubItems && (
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} />
                )}
              </button>
              
              {/* Submenu */}
              {hasSubItems && isExpanded && !isCollapsed && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border/60 pl-3">
                  {item.subItems?.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = activePage === subItem.id;
                    
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubNavigate(subItem.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                          isSubActive
                            ? 'bg-navy text-white'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <SubIcon className="h-4 w-4 flex-shrink-0" />
                        {subItem.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={cn("absolute bottom-0 left-0 right-0", isCollapsed ? "p-2" : "p-4")}>
        <button
          onClick={() => onNavigate('login')}
          title={isCollapsed ? 'Logout' : undefined}
          className={cn(
            "flex w-full items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-red-50 hover:text-red-600",
            isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}
