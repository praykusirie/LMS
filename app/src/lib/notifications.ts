import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Notification } from '@/types';

const STORAGE_KEY = 'lms:notifications:read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore quota errors
  }
}

interface StatsPayload {
  overdue_books: number;
  borrowed_books: number;
  registered_students: number;
  total_teachers: number;
  total_books: number;
}

function buildNotifications(stats: StatsPayload, readIds: Set<string>): Notification[] {
  const result: Notification[] = [];

  if (Number(stats.overdue_books) > 0) {
    const id = 'notif:overdue';
    result.push({
      id,
      title: 'Overdue Returns',
      message: `${stats.overdue_books} book${Number(stats.overdue_books) === 1 ? '' : 's'} need follow-up`,
      type: 'overdue',
      isRead: readIds.has(id),
      createdAt: new Date().toISOString(),
    });
  }

  if (Number(stats.borrowed_books) > 0) {
    const id = 'notif:active-borrows';
    result.push({
      id,
      title: 'Active Borrows',
      message: `${stats.borrowed_books} book${Number(stats.borrowed_books) === 1 ? '' : 's'} currently checked out`,
      type: 'system',
      isRead: readIds.has(id),
      createdAt: new Date().toISOString(),
    });
  }

  return result;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get<StatsPayload>('/dashboard/stats');
      const readIds = getReadIds();
      setNotifications(buildNotifications(data, readIds));
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const markAsRead = useCallback((id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const readIds = getReadIds();
      prev.forEach(n => readIds.add(n.id));
      saveReadIds(readIds);
      return prev.map(n => ({ ...n, isRead: true }));
    });
  }, []);

  const clearReadState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearReadState };
}
