// Dashboard component
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  Plus, 
  UserPlus, 
  ArrowLeftRight,
  TrendingUp
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
import { dashboardStats, borrowingTrends, activities } from '@/data/mockData';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const stats = [
    { 
      title: 'Total Books', 
      value: dashboardStats.totalBooks.toLocaleString(), 
      icon: BookOpen, 
      color: 'navy' as const,
      trend: { value: 5.2, isPositive: true }
    },
    { 
      title: 'Borrowed', 
      value: dashboardStats.borrowedBooks.toLocaleString(), 
      icon: Clock, 
      color: 'amber' as const,
      trend: { value: 3.1, isPositive: false }
    },
    { 
      title: 'Overdue', 
      value: dashboardStats.overdueBooks.toLocaleString(), 
      icon: TrendingUp, 
      color: 'red' as const 
    },
    { 
      title: 'Registered Students', 
      value: dashboardStats.registeredStudents.toLocaleString(), 
      icon: GraduationCap, 
      color: 'green' as const,
      trend: { value: 8.4, isPositive: true }
    }
  ];

  const quickActions = [
    { 
      title: 'Add Book', 
      icon: Plus, 
      color: 'navy' as const,
      onClick: () => onNavigate('books')
    },
    { 
      title: 'Register Student', 
      icon: UserPlus, 
      color: 'green' as const,
      onClick: () => onNavigate('students')
    },
    { 
      title: 'Return Book', 
      icon: ArrowLeftRight, 
      color: 'amber' as const,
      onClick: () => onNavigate('borrow-return')
    }
  ];

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
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your library at a glance.
          </p>
        </div>
        <Button 
          onClick={() => onNavigate('borrow-return')}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11 px-5"
        >
          <Plus className="h-4 w-4 mr-2" />
          Issue Book
        </Button>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
            delay={0.1 + index * 0.08}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {quickActions.map((action, index) => (
            <QuickActionCard
              key={action.title}
              title={action.title}
              icon={action.icon}
              color={action.color}
              onClick={action.onClick}
              delay={0.5 + index * 0.08}
            />
          ))}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="lg:col-span-2 rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Borrowing Trends</h3>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={borrowingTrends}>
                <defs>
                  <linearGradient id="colorBorrows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 12, 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="borrows" 
                  stroke="#1E3A8A" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBorrows)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="space-y-1">
            {activities.slice(0, 5).map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                index={index}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
