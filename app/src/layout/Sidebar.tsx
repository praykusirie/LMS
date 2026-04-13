import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
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
  MapPin,
  UserCog,
  UserPlus,
  Shield,
  Key,
  Warehouse,
  ClipboardList,
  PackagePlus,
  Package,
  School,
  CalendarDays,
  Trophy,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { usePermissions } from '@/lib/permissions';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface SubMenuItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
  permission?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { 
    id: 'master', 
    path: '/master',
    label: 'Master Management', 
    icon: Database,
    subItems: [
      { id: 'students', path: '/students', label: 'Students', icon: Users, permission: 'students:view' },
      { id: 'books', path: '/books', label: 'Books', icon: BookOpen, permission: 'books:view' },
      { id: 'teachers', path: '/teachers', label: 'Teachers', icon: School, permission: 'teachers:view' },
      { id: 'classes', path: '/classes', label: 'Classes', icon: GraduationCap, permission: 'master:view' },
      { id: 'categories', path: '/categories', label: 'Book Categories', icon: FolderTree, permission: 'master:view' },
      { id: 'subjects', path: '/subjects', label: 'Subjects', icon: BookMarked, permission: 'master:view' },
      { id: 'shelf-locations', path: '/shelf-locations', label: 'Shelf Locations', icon: MapPin, permission: 'master:view' },
      { id: 'items', path: '/items', label: 'Items Master', icon: Package, permission: 'items:view' },
    ]
  },
  {
    id: 'class-management',
    path: '/class-management',
    label: 'Class Management',
    icon: GraduationCap,
    subItems: [
      { id: 'class-activities', path: '/class-activities', label: 'Class Activities', icon: CalendarDays, permission: 'class_activities:view' },
      { id: 'results', path: '/results', label: 'Results', icon: Trophy, permission: 'results:view' },
    ]
  },
  {
    id: 'library-inventory',
    path: '/library-inventory',
    label: 'Library Inventory',
    icon: Warehouse,
    subItems: [
      { id: 'stock-details', path: '/library-inventory/stock-details', label: 'Stock Details', icon: ClipboardList, permission: 'stock:view' },
      { id: 'add-stock', path: '/library-inventory/add-stock', label: 'Add Stock', icon: PackagePlus, permission: 'stock:view' },
    ]
  },
  {
    id: 'books-items-management',
    path: '/books-items-management',
    label: 'Distribution',
    icon: ArrowRightLeft,
    subItems: [
      { id: 'issue-book', path: '/books-items-management/issue-book', label: 'Issue Book', icon: ArrowRightLeft, permission: 'borrow:view' },
      { id: 'return-book', path: '/books-items-management/return-book', label: 'Return Book', icon: RotateCcw, permission: 'borrow:view' },
      { id: 'items-distribution', path: '/books-items-management/items-distribution', label: 'Items Distribution', icon: PackagePlus, permission: 'items:view' },
    ]
  },
  {
    id: 'user-management',
    path: '/user-management',
    label: 'User Management',
    icon: UserCog,
    subItems: [
      { id: 'user-master', path: '/user-management/user-master', label: 'User Master', icon: UserPlus, permission: 'users:view' },
      { id: 'role-master', path: '/user-management/role-master', label: 'Role Master', icon: Shield, permission: 'roles:view' },
      { id: 'permissions', path: '/user-management/permissions', label: 'Permissions', icon: Key, permission: 'permissions:manage' },
    ]
  },
  { id: 'overdue', path: '/overdue', label: 'Overdue', icon: AlertCircle, permission: 'overdue:view' },
  { id: 'reports', path: '/reports', label: 'Reports', icon: FileText, permission: 'reports:view' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, permission: 'settings:view' }
];

const parentPaths: Record<string, string[]> = {
  'master': ['/students', '/books', '/teachers', '/classes', '/categories', '/subjects', '/shelf-locations', '/items', '/add-student', '/add-book', '/add-teacher'],
  'books-items-management': ['/books-items-management'],
  'library-inventory': ['/library-inventory'],
  'user-management': ['/user-management'],
};

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, isLoading } = usePermissions();
  const pathname = location.pathname;

  const getInitialExpanded = () => {
    for (const [parentId, paths] of Object.entries(parentPaths)) {
      if (paths.some(p => pathname.startsWith(p))) {
        return parentId;
      }
    }
    return null;
  };

  const [expandedMenu, setExpandedMenu] = useState<string | null>(getInitialExpanded());

  const handleNavigate = (item: NavItem) => {
    if (item.subItems) {
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
    } else {
      navigate(item.path);
    }
  };

  const handleSubNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isParentActive = (item: NavItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => pathname.startsWith(sub.path));
    }
    return pathname === item.path;
  };

  const isSubActive = (subItem: SubMenuItem) => {
    return pathname.startsWith(subItem.path);
  };

  const visibleNavItems = navItems
    .map((item) => ({
      ...item,
      subItems: item.subItems?.filter((subItem) => hasPermission(subItem.permission ?? null)),
    }))
    .filter((item) => {
      if (item.subItems) {
        return item.subItems.length > 0;
      }
      return hasPermission(item.permission ?? null);
    });

  if (isLoading) {
    return null;
  }

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
        {!isCollapsed && <span className="text-lg font-bold text-foreground">ShulePro..</span>}
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
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isParentActive(item);
          const isExpanded = expandedMenu === item.id;
          const hasSubItems = !!item.subItems;
          
          return (
            <div key={item.id}>
              <button
                onClick={() => handleNavigate(item)}
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
                    const subActive = isSubActive(subItem);
                    
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubNavigate(subItem.path)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                          subActive
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
          onClick={handleLogout}
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
