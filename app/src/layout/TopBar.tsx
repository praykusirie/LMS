import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronDown, Check, Menu, PanelLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { notifications as mockNotifications } from '@/data/mockData';
import type { Notification } from '@/types';
import { useSession } from '@/lib/auth-client';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { navItems } from './Sidebar';

interface TopBarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onMobileMenuOpen: () => void;
  onExpandSidebar: () => void;
}

export function TopBar({ isCollapsed, isMobile, onMobileMenuOpen, onExpandSidebar }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const { data: session } = useSession();
  const { t } = useTranslation();
  const location = useLocation();

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
            return { parent: { label: t(item.label), path: item.path }, current: t(sub.label) };
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
              return { parent: { label: t(item.label), path: item.path }, current: t(sub.label) };
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600';
      case 'system':
        return 'bg-navy-light text-navy';
      case 'reminder':
        return 'bg-green-light text-green';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
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

          {breadcrumb && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumb.parent && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={breadcrumb.parent.path} className="text-muted-foreground hover:text-foreground">
                          {breadcrumb.parent.label}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumb.current}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-navy" />
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-card shadow-lg border border-border/60 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border/60">
                    <h3 className="font-semibold text-sm">{t('topbar.notifications')}</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-navy hover:underline"
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
                            !notification.isRead && 'bg-navy-light/30'
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary transition-colors"
            >
              <IdentityAvatar name={displayName} className="h-8 w-8" fallbackClassName="bg-navy text-white text-xs" />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-card shadow-lg border border-border/60 overflow-hidden"
                >
                  <div className="p-4 border-b border-border/60">
                    <p className="font-medium text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                      {t('topbar.profileSettings')}
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                      {t('topbar.preferences')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
