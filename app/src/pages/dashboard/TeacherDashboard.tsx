import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  FileText, 
  Award,
  Loader2,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { StatsCard } from '@/components/ui-custom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

interface TeacherStats {
  my_classes: number;
  my_students: number;
  activities_count: number;
  avg_score: number;
  pass_rate: number;
  recent_activities: {
    id: string;
    name: string;
    date: string;
    total_marks: number;
    class_name: string;
    marks_entered: number;
  }[];
  recent_results: {
    activity_name: string;
    class_name: string;
    date: string;
    total_marks: number;
    avg_marks: number;
    student_count: number;
  }[];
}

export function TeacherDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/dashboard/teacher-stats');
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching teacher dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = stats ? [
    { title: t('dashboard.myClasses', 'My Classes'), value: String(stats.my_classes), icon: GraduationCap, color: 'navy' as const },
    { title: t('dashboard.myStudents', 'My Students'), value: String(stats.my_students), icon: Users, color: 'green' as const },
    { title: t('dashboard.activitiesCreated', 'Activities'), value: String(stats.activities_count), icon: FileText, color: 'amber' as const },
    { title: t('dashboard.avgScore', 'Avg Score'), value: `${stats.avg_score}%`, icon: Award, color: 'navy' as const },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.teacherDashboard', 'Teacher Dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.teacherSubtitle', 'Overview of your classes and student performance')}</p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, index) => (
              <StatsCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} delay={0.1 + index * 0.08} />
            ))}
          </div>

          {/* Performance Summary */}
          {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Results Chart */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2 rounded-[20px] bg-card p-5 shadow-card"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.recentResults', 'Recent Results')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.avgScoreByActivity', 'Average score by activity')}</p>
              </div>
              <div className="h-[300px]">
                {stats.recent_results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.recent_results.slice(0, 8).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="activity_name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="avg_marks" fill="#1E3A8A" radius={[6, 6, 0, 0]} name="Avg Marks" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No results data available yet
                  </div>
                )}
              </div>
            </motion.div>

            {/* Pass Rate & Stats */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-[20px] bg-card p-5 shadow-card"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.performanceOverview', 'Performance')}</h3>
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-navy">{stats.pass_rate}%</div>
                  <p className="text-sm text-muted-foreground mt-1">{t('dashboard.passRate', 'Pass Rate')}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.totalActivities', 'Total Activities')}</span>
                    <span className="font-medium">{stats.activities_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.avgScore', 'Avg Score')}</span>
                    <span className="font-medium">{stats.avg_score}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.totalStudentsLabel', 'Students')}</span>
                    <span className="font-medium">{stats.my_students}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          )}

          {/* Recent Activities Table */}
          {stats && stats.recent_activities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-[20px] bg-card p-5 shadow-card"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.recentActivities', 'Recent Activities')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('classActivities.activityName', 'Activity')}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('classActivities.class', 'Class')}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('classActivities.date', 'Date')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('classActivities.totalMarks', 'Total')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('dashboard.marksEntered', 'Entered')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_activities.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2.5 px-3 font-medium">{a.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{a.class_name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(a.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">{a.total_marks}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 ${Number(a.marks_entered) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <TrendingUp className="h-3.5 w-3.5" />
                          {a.marks_entered}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
          )}
        </>
      )}
    </div>
  );
}
