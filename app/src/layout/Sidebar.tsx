import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  RotateCcw,
  Banknote,
  BarChart3
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { signOut } from '@/lib/auth-client';
import { usePermissions } from '@/lib/permissions';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCollapse: () => void;
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
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
  { id: 'dashboard', path: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { 
    id: 'master', 
    path: '/master',
    label: 'nav.masterManagement', 
    icon: Database,
    subItems: [
      { id: 'students', path: '/students', label: 'nav.students', icon: Users, permission: 'students:view' },
      { id: 'books', path: '/books', label: 'nav.books', icon: BookOpen, permission: 'books:view' },
      { id: 'teachers', path: '/teachers', label: 'nav.teachers', icon: School, permission: 'teachers:view' },
      { id: 'classes', path: '/classes', label: 'nav.classes', icon: GraduationCap, permission: 'master:view' },
      { id: 'categories', path: '/categories', label: 'nav.categories', icon: FolderTree, permission: 'master:view' },
      { id: 'subjects', path: '/subjects', label: 'nav.subjects', icon: BookMarked, permission: 'master:view' },
      { id: 'shelf-locations', path: '/shelf-locations', label: 'nav.shelfLocations', icon: MapPin, permission: 'master:view' },
      { id: 'items', path: '/items', label: 'nav.itemsMaster', icon: Package, permission: 'items:view' },
    ]
  },
  {
    id: 'class-management',
    path: '/class-management',
    label: 'nav.classManagement',
    icon: GraduationCap,
    subItems: [
      { id: 'class-activities', path: '/class-activities', label: 'nav.classActivities', icon: CalendarDays, permission: 'class_activities:view' },
      { id: 'results', path: '/results', label: 'nav.results', icon: Trophy, permission: 'results:view' },
    ]
  },
  {
    id: 'library-inventory',
    path: '/library-inventory',
    label: 'nav.libraryInventory',
    icon: Warehouse,
    subItems: [
      { id: 'stock-details', path: '/library-inventory/stock-details', label: 'nav.stockDetails', icon: ClipboardList, permission: 'stock:view' },
      { id: 'add-stock', path: '/library-inventory/add-stock', label: 'nav.addStock', icon: PackagePlus, permission: 'stock:view' },
    ]
  },
  {
    id: 'books-items-management',
    path: '/books-items-management',
    label: 'nav.distribution',
    icon: ArrowRightLeft,
    subItems: [
      { id: 'issue-book', path: '/books-items-management/issue-book', label: 'nav.issueBook', icon: ArrowRightLeft, permission: 'borrow:view' },
      { id: 'return-book', path: '/books-items-management/return-book', label: 'nav.returnBook', icon: RotateCcw, permission: 'borrow:view' },
      { id: 'items-distribution', path: '/books-items-management/items-distribution', label: 'nav.itemsDistribution', icon: PackagePlus, permission: 'items:view' },
    ]
  },
  {
    id: 'user-management',
    path: '/user-management',
    label: 'nav.userManagement',
    icon: UserCog,
    subItems: [
      { id: 'user-master', path: '/user-management/user-master', label: 'nav.userMaster', icon: UserPlus, permission: 'users:view' },
      { id: 'role-master', path: '/user-management/role-master', label: 'nav.roleMaster', icon: Shield, permission: 'roles:view' },
      { id: 'permissions', path: '/user-management/permissions', label: 'nav.permissions', icon: Key, permission: 'permissions:manage' },
    ]
  },
  {
    id: 'finance',
    path: '/finance',
    label: 'nav.finance',
    icon: Banknote,
    subItems: [
      { id: 'create-invoice', path: '/finance/create-invoice', label: 'nav.createInvoice', icon: FileText, permission: 'finance:create' },
      { id: 'finance-report', path: '/finance/report', label: 'nav.financeReport', icon: BarChart3, permission: 'finance:view' },
      { id: 'fee-structure', path: '/finance/fee-structure', label: 'nav.feeStructure', icon: Settings, permission: 'finance:manage_fees' },
    ]
  },
  { id: 'overdue', path: '/overdue', label: 'nav.overdue', icon: AlertCircle, permission: 'overdue:view' },
  { id: 'reports', path: '/reports', label: 'nav.reports', icon: FileText, permission: 'reports:view' },
  { id: 'settings', path: '/settings', label: 'nav.settings', icon: Settings, permission: 'settings:view' }
];

const parentPaths: Record<string, string[]> = {
  'master': ['/students', '/books', '/teachers', '/classes', '/categories', '/subjects', '/shelf-locations', '/items', '/add-student', '/add-book', '/add-teacher'],
  'books-items-management': ['/books-items-management'],
  'library-inventory': ['/library-inventory'],
  'user-management': ['/user-management'],
  'finance': ['/finance'],
};

export function Sidebar({ isCollapsed, onToggleCollapse, onCollapse, isMobile, isMobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, isLoading } = usePermissions();
  const { t } = useTranslation();
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
      if (isMobile) onMobileMenuClose();
      else onCollapse();
    }
  };

  const handleSubNavigate = (path: string) => {
    navigate(path);
    setExpandedMenu(null);
    if (isMobile) onMobileMenuClose();
    else onCollapse();
  };

  const handleLogout = async () => {
    await signOut();
    if (isMobile) onMobileMenuClose();
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

  // Shared sidebar content (used in both desktop aside and mobile sheet)
  const sidebarContent = (forMobile: boolean) => {
    const expanded = forMobile ? true : !isCollapsed;
    return (
      <>
        {/* Logo */}
        <div className={cn(
          "flex h-[72px] items-center border-b border-border/60",
          expanded ? "gap-3 px-6" : "justify-center px-2"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy flex-shrink-0">
            <Library className="h-5 w-5 text-white" />
          </div>
          {expanded && <span className="text-lg font-bold text-foreground">ShulePro..</span>}
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-col gap-1 overflow-y-auto", expanded ? "p-4" : "p-2")} style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isParentActive(item);
            const isExpanded = expandedMenu === item.id;
            const hasSubItems = !!item.subItems;
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => handleNavigate(item)}
                  title={!expanded ? t(item.label) : undefined}
                  className={cn(
                    'flex w-full items-center rounded-xl text-sm font-medium transition-colors duration-150',
                    expanded ? 'justify-between px-4 py-3' : 'justify-center px-2 py-3',
                    isActive && !hasSubItems
                      ? 'bg-navy text-white'
                      : isActive && hasSubItems
                      ? 'bg-navy-light text-navy'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <div className={cn("flex items-center", expanded && "gap-3")}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {expanded && t(item.label)}
                  </div>
                  {expanded && hasSubItems && (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </button>
                
                {/* Submenu */}
                {hasSubItems && isExpanded && expanded && (
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
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          {t(subItem.label)}
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
        <div className={cn("absolute bottom-0 left-0 right-0", expanded ? "p-4" : "p-2")}>
          <button
            onClick={handleLogout}
            title={!expanded ? t('topbar.logout') : undefined}
            className={cn(
              "flex w-full items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive",
              expanded ? "gap-3 px-4 py-3" : "justify-center px-2 py-3"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {expanded && t('topbar.logout')}
          </button>
        </div>
      </>
    );
  };

  // Mobile: render inside a Sheet
  if (isMobile) {
    return (
      <Sheet open={isMobileMenuOpen} onOpenChange={(open) => { if (!open) onMobileMenuClose(); }}>
        <SheetContent side="left" className="w-[280px] p-0 [&>button]:hidden">
          <div className="relative h-full bg-card">
            {sidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: fixed aside
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-full bg-card shadow-[2px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)] transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {sidebarContent(false)}

      {/* Toggle Button (desktop only) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-card shadow-md hover:bg-secondary"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
