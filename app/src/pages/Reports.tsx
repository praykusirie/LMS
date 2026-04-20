import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Download, BarChart3, Users, BookOpen, Clock, Calendar, Filter, Search,
  Printer, ArrowUpDown, AlertCircle, CheckCircle2, GraduationCap, Loader2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/lib/permissions';
import api from '@/lib/api';
import { toast } from 'sonner';

const COLORS = ['#1E3A8A', '#22C55E', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6', '#EC4899', '#14B8A6'];

type ReportTab = 'overview' | 'borrowing' | 'inventory' | 'students' | 'overdue' | 'finance';

const ROLE_TABS: Record<string, ReportTab[]> = {
  admin: ['overview', 'borrowing', 'inventory', 'students', 'overdue', 'finance'],
  librarian: ['overview', 'borrowing', 'inventory', 'overdue'],
  teacher: ['overview', 'students'],
  accountant: ['overview', 'finance', 'students'],
};

export function Reports() {
  const { t } = useTranslation();
  const { role } = usePermissions();
  const allowedTabs = useMemo(() => ROLE_TABS[role || ''] || ROLE_TABS.librarian, [role]);

  const [activeTab, setActiveTab] = useState<ReportTab>(allowedTabs[0]);
  const [dateRange, setDateRange] = useState('this-month');
  const [classFilter, setClassFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [academicYear, setAcademicYear] = useState('');

  const [overviewData, setOverviewData] = useState<any>(null);
  const [borrowingData, setBorrowingData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<any>(null);
  const [overdueData, setOverdueData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) setActiveTab(allowedTabs[0]);
  }, [allowedTabs, activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview': {
          if (role === 'teacher') {
            const { data } = await api.get('/reports/teacher-overview', { params: { range: dateRange } });
            setTeacherData(data);
          } else {
            const { data } = await api.get('/reports/overview', { params: { range: dateRange } });
            setOverviewData(data);
          }
          break;
        }
        case 'borrowing': {
          const { data } = await api.get('/reports/borrowing', { params: { range: dateRange, search: searchQuery, sortBy } });
          setBorrowingData(data);
          break;
        }
        case 'inventory': {
          const { data } = await api.get('/reports/inventory', { params: { search: searchQuery, category: categoryFilter } });
          setInventoryData(data);
          break;
        }
        case 'students': {
          const { data } = await api.get('/reports/students', { params: { search: searchQuery, classId: classFilter } });
          setStudentsData(data);
          break;
        }
        case 'overdue': {
          const { data } = await api.get('/reports/overdue', { params: { range: dateRange } });
          setOverdueData(data);
          break;
        }
        case 'finance': {
          const { data } = await api.get('/reports/finance', { params: { range: dateRange, academicYear } });
          setFinanceData(data);
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange, searchQuery, sortBy, categoryFilter, classFilter, academicYear, role, t]);

  useEffect(() => { fetchData(); }, [activeTab, dateRange, sortBy, categoryFilter, classFilter, academicYear, role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (['borrowing', 'inventory', 'students'].includes(activeTab)) fetchData();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const response = await api.get(`/reports/export/${activeTab}`, {
        params: { format: format === 'excel' ? 'xlsx' : format, range: dateRange },
        responseType: 'blob',
      });
      const ext = format === 'excel' ? 'xlsx' : format;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${activeTab}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('common.success'));
    } catch {
      toast.error('Export failed');
    }
  };

  const LoadingOverlay = () => loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-navy" />
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports.reportsAndAnalytics')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('reports.comprehensiveStats')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-xl h-10" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />{t('common.print')}
          </Button>
          <Select defaultValue="pdf" onValueChange={(v) => handleExport(v as 'pdf' | 'csv' | 'excel')}>
            <SelectTrigger className="rounded-xl h-10 w-[140px]">
              <Download className="h-4 w-4 mr-2" /><SelectValue placeholder={t('common.export')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">{t('reports.exportPdf')}</SelectItem>
              <SelectItem value="csv">{t('reports.exportCsv')}</SelectItem>
              <SelectItem value="excel">{t('reports.exportExcel')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Overview Summary Cards */}
      {activeTab === 'overview' && role !== 'teacher' && overviewData && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: t('reports.totalBooks'), value: overviewData.stats.total_books, icon: BookOpen, bg: 'bg-navy-light', iconColor: 'text-navy' },
            { label: t('reports.activeBorrows'), value: overviewData.stats.borrowed_books, icon: Users, bg: 'bg-navy-light', iconColor: 'text-navy' },
            { label: t('reports.overdueBooks'), value: overviewData.stats.overdue_books, icon: Clock, bg: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-600' },
            { label: t('reports.totalStudents'), value: overviewData.stats.registered_students, icon: GraduationCap, bg: 'bg-green-50 dark:bg-green-950/30', iconColor: 'text-green-600' },
          ].map((card) => (
            <Card key={card.label} className="rounded-[20px] shadow-card border-0">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <span className="text-2xl font-bold">{Number(card.value).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Teacher Summary Cards */}
      {activeTab === 'overview' && role === 'teacher' && teacherData && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: t('dashboard.myClasses'), value: teacherData.summary.total_classes, icon: BookOpen, bg: 'bg-navy-light', iconColor: 'text-navy' },
            { label: t('dashboard.myStudents'), value: teacherData.summary.total_students, icon: Users, bg: 'bg-green-50 dark:bg-green-950/30', iconColor: 'text-green-600' },
            { label: t('dashboard.avgScore'), value: teacherData.summary.avgScore, icon: BarChart3, bg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
            { label: t('dashboard.passRate'), value: `${teacherData.summary.passRate}%`, icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-950/30', iconColor: 'text-green-600' },
          ].map((card) => (
            <Card key={card.label} className="rounded-[20px] shadow-card border-0">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <span className="text-2xl font-bold">{card.value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Main Tabs */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-[20px] bg-card p-6 shadow-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <TabsList className="rounded-xl h-auto sm:h-11 w-full lg:w-auto overflow-x-auto"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${allowedTabs.length}, 1fr)` }}>
              {allowedTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                  {t(`reports.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="rounded-xl h-10 w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('reports.today')}</SelectItem>
                  <SelectItem value="this-week">{t('reports.thisWeek')}</SelectItem>
                  <SelectItem value="this-month">{t('reports.thisMonth')}</SelectItem>
                  <SelectItem value="this-year">{t('reports.thisYear')}</SelectItem>
                  <SelectItem value="all-time">{t('reports.allTime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {loading ? <LoadingOverlay /> : role === 'teacher' && teacherData ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="text-base font-semibold mb-4">{t('reports.classPerformance') || 'Class Performance'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border/60">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.class')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Activities</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('dashboard.avgScore')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('dashboard.passRate')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Students</th>
                      </tr></thead>
                      <tbody>
                        {teacherData.classPerformance.map((cp: any, i: number) => (
                          <tr key={i} className="border-b border-border/40 last:border-0">
                            <td className="px-4 py-3 font-medium text-sm">{cp.class_name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{cp.activities_count}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{cp.avg_score}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-secondary rounded-full max-w-[100px]">
                                <div className="h-2 bg-navy rounded-full" style={{ width: `${cp.pass_rate}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{cp.pass_rate}%</span>
                            </div></td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{cp.students_assessed}</td>
                          </tr>
                        ))}
                        {teacherData.classPerformance.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No class performance data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="text-base font-semibold mb-4">{t('reports.activityCompletion') || 'Recent Activity Completion'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border/60">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Activity</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.class')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Marks Entered</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Avg Marks</th>
                      </tr></thead>
                      <tbody>
                        {teacherData.activityCompletion.map((ac: any, i: number) => (
                          <tr key={i} className="border-b border-border/40 last:border-0">
                            <td className="px-4 py-3 font-medium text-sm">{ac.activity_name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{ac.class_name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(ac.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm"><span className="text-navy font-medium">{ac.marks_entered}/{ac.total_students}</span></td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{ac.avg_marks}/{ac.total_marks}</td>
                          </tr>
                        ))}
                        {teacherData.activityCompletion.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No activities yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : overviewData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-border/60 p-5">
                    <h3 className="text-base font-semibold mb-4">{t('reports.monthlyBorrowingActivity')}</h3>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overviewData.monthlyActivity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                          <Legend />
                          <Bar dataKey="issues" name="Issues" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="returns" name="Returns" fill="#22C55E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-5">
                    <h3 className="text-base font-semibold mb-4">{t('reports.bookCategoriesDistribution')}</h3>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overviewData.categoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value">
                            {overviewData.categoryDistribution.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, _: any, props: any) => [`${value}%`, props.payload.name]}
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {overviewData.categoryDistribution.map((entry: any, index: number) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-xs text-muted-foreground">{entry.name} ({entry.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Class-wise Borrowing */}
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="text-base font-semibold mb-4">{t('reports.classWiseBorrowing')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border/60">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.class')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.borrowed')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.returned')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.overdue')}</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.returnRate')}</th>
                      </tr></thead>
                      <tbody>
                        {overviewData.classWiseBorrowing.map((item: any) => (
                          <tr key={item.class} className="border-b border-border/40 last:border-0">
                            <td className="px-4 py-3 font-medium text-sm">{item.class}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.borrowed}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.returned}</td>
                            <td className="px-4 py-3"><span className="text-sm text-red-600 font-medium">{item.overdue}</span></td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-secondary rounded-full max-w-[100px]">
                                <div className="h-2 bg-navy rounded-full" style={{ width: `${item.borrowed > 0 ? Math.round((item.returned / item.borrowed) * 100) : 0}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{item.borrowed > 0 ? Math.round((item.returned / item.borrowed) * 100) : 0}%</span>
                            </div></td>
                          </tr>
                        ))}
                        {overviewData.classWiseBorrowing.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No borrowing data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-border/60 p-5">
                    <h3 className="text-base font-semibold mb-4">{t('reports.mostBorrowedBooks')}</h3>
                    <div className="space-y-3">
                      {overviewData.topBorrowedBooks.map((book: any, index: number) => (
                        <div key={book.title} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                          <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-bold">{index + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground">{book.author}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-navy">{book.borrow_count}</p>
                            <p className="text-xs text-muted-foreground">{t('reports.borrows')}</p>
                          </div>
                        </div>
                      ))}
                      {overviewData.topBorrowedBooks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No borrow data yet</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-5">
                    <h3 className="text-base font-semibold mb-4">{t('reports.topBorrowers')}</h3>
                    <div className="space-y-3">
                      {overviewData.topBorrowers.map((student: any, index: number) => (
                        <div key={student.name} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                          <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-bold">{index + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.class}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-navy">{student.borrow_count}</p>
                            <p className="text-xs text-muted-foreground">{student.return_rate}% {t('reports.returnPct')}</p>
                          </div>
                        </div>
                      ))}
                      {overviewData.topBorrowers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No borrower data yet</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : <LoadingOverlay />}
          </TabsContent>

          {/* Borrowing Tab */}
          <TabsContent value="borrowing" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={t('reports.searchByBookOrStudent')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl h-10 pl-10" />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{t('reports.sortByDate')}</SelectItem>
                  <SelectItem value="student">{t('reports.sortByStudent')}</SelectItem>
                  <SelectItem value="book">{t('reports.sortByBook')}</SelectItem>
                  <SelectItem value="status">{t('reports.sortByStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? <LoadingOverlay /> : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.book')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.student')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.borrowDate')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.dueDate')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.returnDate')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.status')}</th>
                  </tr></thead>
                  <tbody>
                    {borrowingData.map((record: any) => (
                      <tr key={record.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3"><p className="text-sm font-medium">{record.book_title}</p></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.student_name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(record.borrow_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(record.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.return_date ? new Date(record.return_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'returned' ? 'bg-green-100 dark:bg-green-900/30 text-green-700'
                              : record.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-700' : 'bg-navy-light text-navy'
                          }`}>
                            {record.status === 'returned' && <CheckCircle2 className="h-3 w-3" />}
                            {record.status === 'overdue' && <AlertCircle className="h-3 w-3" />}
                            {record.status === 'borrowed' && <BookOpen className="h-3 w-3" />}
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {borrowingData.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No borrowing records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={t('reports.searchBooks')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl h-10 pl-10" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allCategories')}</SelectItem>
                  {inventoryData?.categories?.map((cat: string) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {loading ? <LoadingOverlay /> : inventoryData ? (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-secondary/30"><p className="text-xs text-muted-foreground">{t('reports.totalTitles')}</p><p className="text-xl font-bold mt-1">{inventoryData.stats.total_titles}</p></div>
                <div className="p-4 rounded-xl bg-secondary/30"><p className="text-xs text-muted-foreground">{t('reports.totalCopies')}</p><p className="text-xl font-bold mt-1">{inventoryData.stats.total_copies}</p></div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30"><p className="text-xs text-green-700">{t('reports.available')}</p><p className="text-xl font-bold mt-1 text-green-700">{inventoryData.stats.available}</p></div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30"><p className="text-xs text-red-700">{t('reports.borrowedOut')}</p><p className="text-xl font-bold mt-1 text-red-700">{inventoryData.stats.borrowed_out}</p></div>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.book')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.category')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.subject')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.total')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.available')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.status')}</th>
                  </tr></thead>
                  <tbody>
                    {inventoryData.books.map((book: any) => (
                      <tr key={book.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3"><p className="text-sm font-medium">{book.title}</p><p className="text-xs text-muted-foreground">{book.author}</p></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{book.category}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{book.subject}</td>
                        <td className="px-4 py-3 text-sm font-medium">{book.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium">{book.available}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${book.available > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-red-100 dark:bg-red-900/30 text-red-700'}`}>
                            {book.available > 0 ? t('reports.inStock') : t('reports.outOfStock')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {inventoryData.books.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No books found</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>) : null}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={t('reports.searchStudents')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl h-10 pl-10" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allClasses')}</SelectItem>
                  {studentsData?.classes?.map((cls: any) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {loading ? <LoadingOverlay /> : studentsData ? (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-secondary/30"><p className="text-xs text-muted-foreground">{t('reports.totalStudents')}</p><p className="text-xl font-bold mt-1">{studentsData.stats.total_students}</p></div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30"><p className="text-xs text-green-700">{t('reports.active')}</p><p className="text-xl font-bold mt-1 text-green-700">{studentsData.stats.active}</p></div>
                <div className="p-4 rounded-xl bg-navy-light"><p className="text-xs text-navy">{t('reports.withBorrows')}</p><p className="text-xl font-bold mt-1 text-navy">{studentsData.stats.with_borrows}</p></div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30"><p className="text-xs text-red-700">{t('reports.withOverdue')}</p><p className="text-xl font-bold mt-1 text-red-700">{studentsData.stats.with_overdue}</p></div>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.student')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.admissionNo')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.class')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.status')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.overdue')}</th>
                  </tr></thead>
                  <tbody>
                    {studentsData.students.map((student: any) => (
                      <tr key={student.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3"><div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={student.avatar} /><AvatarFallback className="text-xs">{student.name?.[0]}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.email}</p></div>
                        </div></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{student.admission_number}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{student.class_name}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${student.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700'}`}>{student.is_active ? t('reports.active') : t('reports.inactive')}</span></td>
                        <td className="px-4 py-3">{student.overdue_count > 0 ? (<span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium"><AlertCircle className="h-4 w-4" />{student.overdue_count}</span>) : <span className="text-sm text-muted-foreground">-</span>}</td>
                      </tr>
                    ))}
                    {studentsData.students.length === 0 && (<tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No students found</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>) : null}
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-0 space-y-4">
            {loading ? <LoadingOverlay /> : overdueData ? (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30"><p className="text-xs text-red-700">{t('reports.totalOverdue')}</p><p className="text-xl font-bold mt-1 text-red-700">{overdueData.stats.total_overdue}</p></div>
                <div className="p-4 rounded-xl bg-secondary/30"><p className="text-xs text-muted-foreground">{t('reports.avgDaysOverdue')}</p><p className="text-xl font-bold mt-1">{overdueData.stats.avg_days_overdue} {t('reports.days')}</p></div>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.book')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.student')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.dueDate')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.daysOverdue')}</th>
                  </tr></thead>
                  <tbody>
                    {overdueData.records.map((record: any) => (
                      <tr key={record.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3"><p className="text-sm font-medium">{record.book_title}</p></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.student_name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(record.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700">{record.days_overdue} {t('reports.days')}</span></td>
                      </tr>
                    ))}
                    {overdueData.records.length === 0 && (<tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{t('reports.noOverdueBooks')}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>) : null}
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="mt-0 space-y-6">
            {loading ? <LoadingOverlay /> : financeData ? (<>
              {financeData.academicYears?.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={academicYear || 'all'} onValueChange={(v) => setAcademicYear(v === 'all' ? '' : v)}>
                    <SelectTrigger className="rounded-xl h-10 w-[180px]"><FileText className="h-4 w-4 mr-2" /><SelectValue placeholder="Academic Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {financeData.academicYears.map((yr: string) => (<SelectItem key={yr} value={yr}>{yr}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30"><p className="text-xs text-muted-foreground">{t('reports.totalInvoiced') || 'Total Invoiced'}</p><p className="text-xl font-bold mt-1">TZS {Number(financeData.summary.total_invoiced).toLocaleString()}</p></div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30"><p className="text-xs text-green-700">{t('reports.totalCollected') || 'Total Collected'}</p><p className="text-xl font-bold mt-1 text-green-700">TZS {Number(financeData.summary.total_paid).toLocaleString()}</p></div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30"><p className="text-xs text-red-700">{t('reports.totalOutstanding') || 'Outstanding'}</p><p className="text-xl font-bold mt-1 text-red-700">TZS {Number(financeData.summary.total_outstanding).toLocaleString()}</p></div>
                <div className="p-4 rounded-xl bg-secondary/30">
                  <p className="text-xs text-muted-foreground">{t('reports.totalInvoices') || 'Total Invoices'}</p>
                  <p className="text-xl font-bold mt-1">{financeData.summary.total_invoices}</p>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-green-600">{financeData.summary.paid_count} paid</span>
                    <span className="text-amber-600">{financeData.summary.partial_count} partial</span>
                    <span className="text-red-600">{financeData.summary.unpaid_count} unpaid</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="text-base font-semibold mb-4">{t('reports.paymentMethodBreakdown') || 'Payment Methods'}</h3>
                  {financeData.paymentMethods.length > 0 ? (<>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={financeData.paymentMethods.map((pm: any) => ({ name: pm.payment_method, value: Number(pm.total) }))}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value">
                            {financeData.paymentMethods.map((_: any, index: number) => (<Cell key={`pm-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`TZS ${Number(value).toLocaleString()}`, '']}
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {financeData.paymentMethods.map((pm: any, index: number) => (
                        <div key={pm.payment_method} className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-xs text-muted-foreground">{pm.payment_method} ({pm.count})</span>
                        </div>
                      ))}
                    </div>
                  </>) : <p className="text-sm text-muted-foreground text-center py-8">No payment data yet</p>}
                </div>
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="text-base font-semibold mb-4">{t('reports.collectionByClass') || 'Collection by Year Group'}</h3>
                  {financeData.collectionByClass.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeData.collectionByClass}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="year_group" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                          <Tooltip formatter={(value: any) => [`TZS ${Number(value).toLocaleString()}`, '']}
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                          <Legend />
                          <Bar dataKey="collected" name="Collected" fill="#22C55E" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="outstanding" name="Outstanding" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-8">No collection data yet</p>}
                </div>
              </div>

              {/* Outstanding Balances Table */}
              <div className="rounded-xl border border-border/60 p-5">
                <h3 className="text-base font-semibold mb-4">{t('reports.outstandingBalances') || 'Outstanding Balances'}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border/60">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.student')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Invoice</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Year Group</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.total')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Paid</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Balance</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{t('reports.status')}</th>
                    </tr></thead>
                    <tbody>
                      {financeData.outstandingBalances.map((inv: any, i: number) => (
                        <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                          <td className="px-4 py-3 text-sm font-medium">{inv.student_name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{inv.invoice_number}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{inv.year_group}</td>
                          <td className="px-4 py-3 text-sm">TZS {Number(inv.total_amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-green-600">TZS {Number(inv.total_paid).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-medium text-red-600">TZS {Number(inv.balance).toLocaleString()}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${inv.status === 'partial' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-red-100 dark:bg-red-900/30 text-red-700'}`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
                        </tr>
                      ))}
                      {financeData.outstandingBalances.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No outstanding balances</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </>) : null}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
