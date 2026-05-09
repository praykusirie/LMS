import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Check, Menu, PanelLeft, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications';
import type { Notification } from '@/types';
import { useSession, signOut } from '@/lib/auth-client';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { useTheme } from '@/lib/theme';
import { navItems } from './Sidebar';

// Actual routes that exist in App.tsx — used to determine if breadcrumb parent is clickable
const VALID_ROUTES = new Set([
  '/dashboard', '/students', '/books', '/classes', '/categories', '/subjects',
  '/shelf-locations', '/items', '/teachers', '/reports', '/settings',
  '/overdue', '/borrow-records',
  '/user-management/user-master', '/user-management/role-master', '/user-management/permissions',
  '/class-activities', '/results', '/attendance',
  '/library-inventory/add-stock', '/library-inventory/stock-details',
  '/books-items-management/issue-book', '/books-items-management/return-book',
  '/books-items-management/items-distribution',
  '/finance/create-invoice', '/finance/report', '/finance/fee-structure',
]);

interface TopBarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onMobileMenuOpen: () => void;
  onExpandSidebar: () => void;
}

export function TopBar({ isCollapsed, isMobile, onMobileMenuOpen, onExpandSidebar }: TopBarProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = session?.user?.name || 'User';
  const displayEmail = session?.user?.email || 'No email';
  const displayRole = session?.user?.role || 'user';

  // Resolve breadcrumb from pathname
  const getBreadcrumb = () => {
    const pathname = location.pathname;
    for (const item of navItems) {
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (pathname.startsWith(sub.path)) {
            const parentPath = VALID_ROUTES.has(item.path) ? item.path : null;
            return { parent: { label: t(item.label), path: parentPath }, current: t(sub.label) };
          }
        }
      }
      if (pathname === item.path) {
        return { parent: null, current: t(item.label) };
      }
    }
    // Fallback for detail pages like /books/:id, /students/:id etc.
    const seg = pathname.split('/').filter(Boolean);
    if (seg.length >= 1) {
      for (const item of navItems) {
        if (item.subItems) {
          for (const sub of item.subItems) {
            if (pathname.startsWith(sub.path.split('/').slice(0, 2).join('/'))) {
              const parentPath = VALID_ROUTES.has(item.path) ? item.path : null;
              return { parent: { label: t(item.label), path: parentPath }, current: t(sub.label) };
            }
          }
        }
        if (pathname.startsWith(item.path)) {
          return { parent: null, current: t(item.label) };
        }
      }
    }
    return null;
  };

  const breadcrumb = getBreadcrumb();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600';
      case 'system':
        return 'bg-primary/10 text-primary';
      case 'reminder':
        return 'bg-green-light text-green';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 h-[72px] bg-card border-b border-border/60 transition-all duration-300",
        isMobile ? "left-0" : (isCollapsed ? "left-[80px]" : "left-[260px]")
      )}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: hamburger/expand + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl shrink-0"
              onClick={onMobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </Button>
          ) : isCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl shrink-0"
              onClick={onExpandSidebar}
            >
              <PanelLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
          ) : null}

          {/* Mobile: page title only */}
          {breadcrumb && (
            <span className="sm:hidden text-sm font-semibold truncate max-w-[180px] text-foreground">
              {breadcrumb.current}
            </span>
          )}

          {/* Desktop: full breadcrumb */}
          {breadcrumb && (
            <span className="hidden sm:flex">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumb.parent && (
                    <>
                      <BreadcrumbItem>
                        {breadcrumb.parent.path ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.parent.path} className="text-muted-foreground hover:text-foreground">
                              {breadcrumb.parent.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <span className="text-sm text-muted-foreground">{breadcrumb.parent.label}</span>
                        )}
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  )}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumb.current}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </span>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-xl">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 rounded-xl border-border/60">
              <div className="flex items-center justify-between p-4 border-b border-border/60">
                <h3 className="font-semibold text-sm">{t('topbar.notifications')}</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('topbar.markAllRead')}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('topbar.noNotifications')}
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-3 p-4 border-b border-border/40 hover:bg-secondary/50 transition-colors',
                        !notification.isRead && 'bg-primary/10'
                      )}
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                          getNotificationIcon(notification.type)
                        )}
                      >
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="shrink-0 p-1 hover:bg-secondary rounded"
                        >
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary transition-colors outline-none">
                <IdentityAvatar name={displayName} className="h-8 w-8" fallbackClassName="bg-primary text-primary-foreground text-xs" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <p className="font-medium text-sm">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t('topbar.profileSettings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('topbar.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
