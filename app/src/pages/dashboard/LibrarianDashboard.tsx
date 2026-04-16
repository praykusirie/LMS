import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  Plus, 
  UserPlus, 
  ArrowLeftRight,
  TrendingUp,
  School,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard, QuickActionCard, ActivityItem } from '@/components/ui-custom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Activity, ChartDataPoint } from '@/types';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

interface DashboardStatsData {
  total_books: number;
  total_copies: number;
  borrowed_books: number;
  overdue_books: number;
  registered_students: number;
  total_teachers: number;
}

export function LibrarianDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [trends, setTrends] = useState<ChartDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [statsRes, trendsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/borrowing-trends'),
          api.get('/dashboard/recent-activity'),
        ]);

        setStats(statsRes.data);
        setTrends(trendsRes.data);
        setRecentActivity(activityRes.data.map((item: { id: string; type: string; description: string; user_name: string; user_gender: string; timestamp: string }) => ({
          id: item.id,
          type: item.type as Activity['type'],
          description: item.description,
          userName: item.user_name,
          timestamp: item.timestamp,
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { title: t('dashboard.totalBooks'), value: stats ? Number(stats.total_copies).toLocaleString() : '—', icon: BookOpen, color: 'navy' as const },
    { title: t('dashboard.borrowed'), value: stats ? Number(stats.borrowed_books).toLocaleString() : '—', icon: Clock, color: 'amber' as const },
    { title: t('dashboard.overdueBooks'), value: stats ? Number(stats.overdue_books).toLocaleString() : '—', icon: TrendingUp, color: 'red' as const },
    { title: t('dashboard.totalStudents'), value: stats ? Number(stats.registered_students).toLocaleString() : '—', icon: GraduationCap, color: 'green' as const },
  ];

  const quickActions = [
    { title: t('dashboard.addBook'), icon: Plus, color: 'navy' as const, onClick: () => navigate('/books'), permission: 'books:create' },
    { title: t('dashboard.addStudent'), icon: UserPlus, color: 'green' as const, onClick: () => navigate('/students'), permission: 'students:create' },
    { title: t('dashboard.borrowReturn'), icon: ArrowLeftRight, color: 'amber' as const, onClick: () => navigate('/books-items-management/issue-book'), permission: 'borrow:manage' },
    { title: t('dashboard.addTeacher'), icon: School, color: 'navy' as const, onClick: () => navigate('/add-teacher'), permission: 'teachers:create' },
  ];

  const visibleActions = quickActions.filter(a => hasPermission(a.permission));

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>
        {hasPermission('borrow:manage') && (
        <Button 
          onClick={() => navigate('/books-items-management/issue-book')}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11 px-5"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('dashboard.issueBook')}
        </Button>
        )}
      </motion.div>

      {/* Stats Row */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat, index) => (
            <StatsCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} delay={0.1 + index * 0.08} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {visibleActions.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          {visibleActions.map((action, index) => (
            <QuickActionCard key={action.title} title={action.title} icon={action.icon} color={action.color} onClick={action.onClick} delay={0.5 + index * 0.08} />
          ))}
        </div>
      </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="lg:col-span-2 rounded-[20px] bg-card p-5 shadow-card"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">{t('dashboard.borrowingTrends')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.last6Months')}</p>
          </div>
          <div className="h-[300px]">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorBorrows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="borrows" stroke="#1E3A8A" strokeWidth={2} fillOpacity={1} fill="url(#colorBorrows)" name="Borrows" />
                  <Area type="monotone" dataKey="returns" stroke="#16A34A" strokeWidth={2} fillOpacity={1} fill="url(#colorReturns)" name="Returns" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No borrowing data available yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="rounded-[20px] bg-card p-5 shadow-card"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">{t('dashboard.recentActivity')}</h3>
          </div>
          <div className="space-y-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noActivity')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
