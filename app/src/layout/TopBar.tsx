import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { notifications as mockNotifications } from '@/data/mockData';
import type { Notification } from '@/types';
import { useSession } from '@/lib/auth-client';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isCollapsed: boolean;
}

export function TopBar({ searchQuery, onSearchChange, isCollapsed }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const { data: session } = useSession();

  const displayName = session?.user?.name || 'User';
  const displayEmail = session?.user?.email || 'No email';
  const displayRole = session?.user?.role || 'user';

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
        return 'bg-red-100 text-red-600';
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
        "fixed right-0 top-0 z-30 h-[72px] bg-white border-b border-border/60 transition-all duration-300",
        isCollapsed ? "left-[80px]" : "left-[260px]"
      )}
    >
      <div className="flex h-full items-center justify-between px-8">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search books, students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-10 rounded-xl bg-secondary border-0 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-navy/20"
          />
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
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-lg border border-border/60 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border/60">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-navy hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
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
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-lg border border-border/60 overflow-hidden"
                >
                  <div className="p-4 border-b border-border/60">
                    <p className="font-medium text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                      Profile Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                      Preferences
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
