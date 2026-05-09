import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  BookOpen,
  Clock,
  GraduationCap,
  Loader2,
  Plus,
  School,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { LazyBookCover } from '@/components/shared/LazyBookCover';
import { ActivityItem, QuickActionCard } from '@/components/ui-custom';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { Activity, ChartDataPoint } from '@/types';

interface DashboardStatsData {
  total_books: number;
  total_copies: number;
  borrowed_books: number;
  overdue_books: number;
  registered_students: number;
  total_teachers: number;
}

interface CategoryData {
  name: string;
  book_count: number;
}

interface TopBook {
  title: string;
  author: string | null;
  cover_image: string | null;
  borrow_count: number;
}

interface TopAuthor {
  author: string;
  borrow_count: number;
  book_count: number;
}

type TrendFilter = 'week' | 'month' | '6months';
type LibraryFilter = 'week' | 'month' | 'all';

interface FilterOption {
  value: string;
  label: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  pillText: string;
  pillClassName: string;
  icon: LucideIcon;
  iconClassName: string;
}

const categoryPalette = ['#1E3A8A', '#F97316', '#14B8A6', '#FBBF24', '#94A3B8', '#10B981'];

const generateBookCover = (title: string) => {
  const seed = encodeURIComponent(title);
  const colors = ['1e3a5f', '2d5a3d', '5a2d2d', '4a3d5a', '3d4a5a'];
  const colorIndex = title.length % colors.length;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${colors[colorIndex]}`;
};

function FilterSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        className="h-8 rounded-md border-border/60 bg-background/80 px-3 text-xs font-medium text-muted-foreground shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/70">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  pillText,
  pillClassName,
  icon: Icon,
  iconClassName,
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-gradient-to-b from-card to-card/80 p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', pillClassName)}>{pillText}</span>
      </div>

      <div className="mt-5 space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-display font-bold leading-none tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function LibrarianDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [trends, setTrends] = useState<ChartDataPoint[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [topAuthors, setTopAuthors] = useState<TopAuthor[]>([]);
  const [trendsPeriod, setTrendsPeriod] = useState<TrendFilter>('week');
  const [topBooksPeriod, setTopBooksPeriod] = useState<LibraryFilter>('month');
  const [topAuthorsPeriod, setTopAuthorsPeriod] = useState<LibraryFilter>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [isTopBooksLoading, setIsTopBooksLoading] = useState(false);
  const [isTopAuthorsLoading, setIsTopAuthorsLoading] = useState(false);

  const trendFilterOptions: FilterOption[] = [
    { value: 'week', label: t('dashboard.lastWeek', { defaultValue: 'Last Week' }) },
    { value: 'month', label: t('dashboard.last30Days', { defaultValue: 'Last 30 Days' }) },
    { value: '6months', label: t('dashboard.last6Months', { defaultValue: 'Last 6 Months' }) },
  ];

  const libraryFilterOptions: FilterOption[] = [
    { value: 'week', label: t('dashboard.thisWeek', { defaultValue: 'This Week' }) },
    { value: 'month', label: t('dashboard.thisMonth', { defaultValue: 'This Month' }) },
    { value: 'all', label: t('dashboard.allTime', { defaultValue: 'All Time' }) },
  ];

  const mapTrendData = (data: any[]): ChartDataPoint[] =>
    (data ?? []).map((point) => ({
      month: point.month,
      borrows: Number(point.borrows) || 0,
      returns: Number(point.returns) || 0,
    }));

  const mapCategoryData = (data: any[]): CategoryData[] =>
    (data ?? [])
      .map((category) => ({
        name: category.name,
        book_count: Number(category.book_count) || 0,
      }))
      .filter((category: CategoryData) => category.book_count > 0)
      .sort((left: CategoryData, right: CategoryData) => right.book_count - left.book_count);

  const mapTopBooks = (data: any[]): TopBook[] =>
    (data ?? []).map((book) => ({
      title: book.title,
      author: book.author,
      cover_image: book.cover_image,
      borrow_count: Number(book.borrow_count) || 0,
    }));

  const mapTopAuthors = (data: any[]): TopAuthor[] =>
    (data ?? []).map((author) => ({
      author: author.author,
      borrow_count: Number(author.borrow_count) || 0,
      book_count: Number(author.book_count) || 0,
    }));

  const mapRecentActivity = (data: any[]): Activity[] =>
    (data ?? []).map((item) => ({
      id: item.id,
      type: item.type as Activity['type'],
      description: item.description,
      userName: item.user_name,
      timestamp: item.timestamp,
    }));

  const fetchTrends = async (period: TrendFilter, showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setIsTrendsLoading(true);
      }

      const res = await api.get('/dashboard/borrowing-trends', { params: { period } });
      setTrends(mapTrendData(res.data ?? []));
    } catch (error) {
      console.error('Error fetching borrowing trends:', error);
    } finally {
      if (showLoader) {
        setIsTrendsLoading(false);
      }
    }
  };

  const fetchTopBooks = async (period: LibraryFilter, showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setIsTopBooksLoading(true);
      }

      const res = await api.get('/dashboard/library-top-books', { params: { period } });
      setTopBooks(mapTopBooks(res.data ?? []));
    } catch (error) {
      console.error('Error fetching top books:', error);
    } finally {
      if (showLoader) {
        setIsTopBooksLoading(false);
      }
    }
  };

  const fetchTopAuthors = async (period: LibraryFilter, showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setIsTopAuthorsLoading(true);
      }

      const res = await api.get('/dashboard/library-top-authors', { params: { period } });
      setTopAuthors(mapTopAuthors(res.data ?? []));
    } catch (error) {
      console.error('Error fetching top authors:', error);
    } finally {
      if (showLoader) {
        setIsTopAuthorsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const [statsRes, activityRes, trendsRes, categoriesRes, topBooksRes, topAuthorsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-activity'),
          api.get('/dashboard/borrowing-trends', { params: { period: trendsPeriod } }),
          api.get('/categories'),
          api.get('/dashboard/library-top-books', { params: { period: topBooksPeriod } }),
          api.get('/dashboard/library-top-authors', { params: { period: topAuthorsPeriod } }),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(statsRes.data);
        setRecentActivity(mapRecentActivity(activityRes.data ?? []));
        setTrends(mapTrendData(trendsRes.data ?? []));
        setCategories(mapCategoryData(categoriesRes.data ?? []));
        setTopBooks(mapTopBooks(topBooksRes.data ?? []));
        setTopAuthors(mapTopAuthors(topAuthorsRes.data ?? []));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTrendsPeriodChange = (value: string) => {
    const nextPeriod = value as TrendFilter;
    setTrendsPeriod(nextPeriod);
    void fetchTrends(nextPeriod);
  };

  const handleTopBooksPeriodChange = (value: string) => {
    const nextPeriod = value as LibraryFilter;
    setTopBooksPeriod(nextPeriod);
    void fetchTopBooks(nextPeriod);
  };

  const handleTopAuthorsPeriodChange = (value: string) => {
    const nextPeriod = value as LibraryFilter;
    setTopAuthorsPeriod(nextPeriod);
    void fetchTopAuthors(nextPeriod);
  };

  const summarizedCategories = (() => {
    const featured = categories.slice(0, 5);

    if (categories.length <= 5) {
      return featured;
    }

    const otherCount = categories.slice(5).reduce((sum, category) => sum + category.book_count, 0);

    return [
      ...featured,
      {
        name: t('dashboard.otherCategories', { defaultValue: 'Others' }),
        book_count: otherCount,
      },
    ];
  })();

  const totalCategoryBooks = summarizedCategories.reduce((sum, category) => sum + category.book_count, 0);
  const peakBorrowPoint = trends.reduce<ChartDataPoint | null>((best, point) => {
    if (!best || point.borrows > best.borrows) {
      return point;
    }

    return best;
  }, null);

  const borrowedShare = stats && Number(stats.total_copies) > 0
    ? Math.round((Number(stats.borrowed_books) / Number(stats.total_copies)) * 100)
    : 0;

  const metricCards = stats ? [
    {
      title: t('dashboard.totalBooks', { defaultValue: 'Total Books' }),
      value: Number(stats.total_copies).toLocaleString(),
      subtitle: t('dashboard.totalBooksHelper', {
        defaultValue: '{{value}} active titles in catalog',
        value: Number(stats.total_books).toLocaleString(),
      }),
      pillText: `${Number(stats.total_books).toLocaleString()} ${t('dashboard.titles', { defaultValue: 'titles' })}`,
      pillClassName: 'bg-primary/10 text-primary',
      icon: BookOpen,
      iconClassName: 'bg-primary/10 text-primary',
    },
    {
      title: t('dashboard.borrowed', { defaultValue: 'Borrowed' }),
      value: Number(stats.borrowed_books).toLocaleString(),
      subtitle: t('dashboard.borrowedHelper', {
        defaultValue: '{{value}}% of the collection is currently issued',
        value: borrowedShare.toLocaleString(),
      }),
      pillText: `${borrowedShare.toLocaleString()}% ${t('dashboard.live', { defaultValue: 'live' })}`,
      pillClassName: 'bg-amber-100 text-amber-700',
      icon: Clock,
      iconClassName: 'bg-amber-100 text-amber-700',
    },
    {
      title: t('dashboard.overdueBooks', { defaultValue: 'Overdue Books' }),
      value: Number(stats.overdue_books).toLocaleString(),
      subtitle: t('dashboard.overdueHelper', { defaultValue: 'Returns that need librarian follow-up' }),
      pillText: stats.overdue_books > 0
        ? t('dashboard.needsAttention', { defaultValue: 'Needs attention' })
        : t('dashboard.onTrack', { defaultValue: 'On track' }),
      pillClassName: stats.overdue_books > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700',
      icon: TrendingUp,
      iconClassName: stats.overdue_books > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700',
    },
    {
      title: t('dashboard.totalStudents', { defaultValue: 'Total Students' }),
      value: Number(stats.registered_students).toLocaleString(),
      subtitle: t('dashboard.studentsHelper', {
        defaultValue: 'Supported by {{value}} teachers across the school',
        value: Number(stats.total_teachers).toLocaleString(),
      }),
      pillText: `${Number(stats.total_teachers).toLocaleString()} ${t('dashboard.teachers', { defaultValue: 'teachers' })}`,
      pillClassName: 'bg-green-100 text-green-700',
      icon: GraduationCap,
      iconClassName: 'bg-green-100 text-green-700',
    },
  ] : [];

  const quickActions = [
    {
      title: t('dashboard.addBook'),
      icon: Plus,
      color: 'navy' as const,
      onClick: () => navigate('/books'),
      permission: 'books:create',
    },
    {
      title: t('dashboard.addStudent'),
      icon: UserPlus,
      color: 'green' as const,
      onClick: () => navigate('/students'),
      permission: 'students:create',
    },
    {
      title: t('dashboard.borrowReturn'),
      icon: ArrowLeftRight,
      color: 'amber' as const,
      onClick: () => navigate('/books-items-management/issue-book'),
      permission: 'borrow:manage',
    },
    {
      title: t('dashboard.addTeacher'),
      icon: School,
      color: 'navy' as const,
      onClick: () => navigate('/add-teacher'),
      permission: 'teachers:create',
    },
  ];

  const visibleActions = quickActions.filter((action) => hasPermission(action.permission));

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        {hasPermission('borrow:manage') && (
          <Button
            onClick={() => navigate('/books-items-management/issue-book')}
            className="h-11 rounded-full bg-primary px-5 hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.issueBook')}
          </Button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <MetricCard
                key={card.title}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                pillText={card.pillText}
                pillClassName={card.pillClassName}
                icon={card.icon}
                iconClassName={card.iconClassName}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/85 p-5 shadow-card"
              >
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('dashboard.libraryUsageTrends', { defaultValue: 'Library Usage Trends' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.borrowingPatternSubtitle', { defaultValue: 'Borrowers vs returns across the selected period' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    {isTrendsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <FilterSelect value={trendsPeriod} onValueChange={handleTrendsPeriodChange} options={trendFilterOptions} />
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {t('dashboard.borrowed', { defaultValue: 'Borrowed' })}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    {t('dashboard.returned', { defaultValue: 'Returned' })}
                  </span>
                  {peakBorrowPoint && (
                    <div className="ml-auto rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{peakBorrowPoint.month}</span>{' '}
                      {t('dashboard.peakBorrowing', {
                        defaultValue: 'peaked at {{value}} borrows',
                        value: peakBorrowPoint.borrows.toLocaleString(),
                      })}
                    </div>
                  )}
                </div>

                <div className={cn('h-[320px] transition-opacity', isTrendsLoading && 'opacity-60')}>
                  {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends} barGap={8} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748B', fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748B', fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                          contentStyle={{
                            borderRadius: 16,
                            border: '1px solid rgba(226, 232, 240, 0.9)',
                            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
                          }}
                        />
                        <Bar
                          dataKey="borrows"
                          name={t('dashboard.borrowed', { defaultValue: 'Borrowed' })}
                          fill="#1E3A8A"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          dataKey="returns"
                          name={t('dashboard.returned', { defaultValue: 'Returned' })}
                          fill="#F97316"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                      {t('dashboard.noBorrowingData', { defaultValue: 'No borrowing data available yet' })}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 }}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/85 p-5 shadow-card"
              >
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('dashboard.bookCategories', { defaultValue: 'Book Categories' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.categoryDistribution', { defaultValue: 'Distribution across your active collection' })}
                    </p>
                  </div>
                  <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {totalCategoryBooks.toLocaleString()} {t('dashboard.books', { defaultValue: 'books' })}
                  </div>
                </div>

                {summarizedCategories.length > 0 ? (
                  <>
                    <div className="rounded-lg border border-border/60 bg-background/70 p-4">
                      <div className="flex h-14 overflow-hidden rounded-2xl bg-muted/25 p-2 shadow-inner">
                        {summarizedCategories.map((category, index) => (
                          <div
                            key={category.name}
                            className="h-full rounded-lg"
                            style={{
                              flex: Math.max(category.book_count, 1),
                              backgroundColor: `${categoryPalette[index % categoryPalette.length]}10`,
                              backgroundImage: `repeating-linear-gradient(90deg, ${categoryPalette[index % categoryPalette.length]} 0px, ${categoryPalette[index % categoryPalette.length]} 3px, transparent 3px, transparent 7px)`,
                              backgroundSize: 'auto 100%',
                              marginRight: index === summarizedCategories.length - 1 ? 0 : 6,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {summarizedCategories.map((category, index) => {
                        const percentage = totalCategoryBooks > 0
                          ? Math.round((category.book_count / totalCategoryBooks) * 100)
                          : 0;

                        return (
                          <div
                            key={category.name}
                            className="rounded-2xl border border-border/50 bg-background/75 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="inline-flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }}
                                  />
                                  <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {category.book_count.toLocaleString()} {t('dashboard.books', { defaultValue: 'books' })}
                                </p>
                              </div>
                              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                    {t('dashboard.noCategories', { defaultValue: 'No categories available yet' })}
                  </div>
                )}
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/85 p-5 shadow-card"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('dashboard.topBorrowedBooks', { defaultValue: 'Top Borrowed Books' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.mostRequestedTitles', { defaultValue: 'Most requested titles right now' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTopBooksLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <FilterSelect value={topBooksPeriod} onValueChange={handleTopBooksPeriodChange} options={libraryFilterOptions} />
                  </div>
                </div>

                <div className="space-y-4">
                  {topBooks.length > 0 ? (
                    topBooks.map((book, index) => (
                      <div
                        key={`${book.title}-${index}`}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border border-border/50 bg-background/80 p-3 transition-opacity',
                          isTopBooksLoading && 'opacity-60'
                        )}
                      >
                        <div className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-600">
                          #{index + 1}
                        </div>
                        <LazyBookCover
                          src={book.cover_image}
                          fallbackSrc={generateBookCover(book.title)}
                          alt={book.title}
                          containerClassName="h-16 w-12 shrink-0 rounded-2xl shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {book.author || t('dashboard.unknownAuthor', { defaultValue: 'Unknown author' })}
                          </p>
                          <p className="mt-2 text-xs font-medium text-primary">
                            {book.borrow_count.toLocaleString()} {t('dashboard.borrows', { defaultValue: 'borrows' })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                      {t('dashboard.noTopBooks', { defaultValue: 'No top book data available yet' })}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.26 }}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/85 p-5 shadow-card"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('dashboard.topAuthors', { defaultValue: 'Top Authors' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.leadingCreators', { defaultValue: 'Writers with the highest circulation' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTopAuthorsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <FilterSelect value={topAuthorsPeriod} onValueChange={handleTopAuthorsPeriodChange} options={libraryFilterOptions} />
                  </div>
                </div>

                <div className="space-y-4">
                  {topAuthors.length > 0 ? (
                    topAuthors.map((author, index) => (
                      <div
                        key={`${author.author}-${index}`}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border border-border/50 bg-background/80 p-3 transition-opacity',
                          isTopAuthorsLoading && 'opacity-60'
                        )}
                      >
                        <div className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                          #{index + 1}
                        </div>
                        <IdentityAvatar
                          name={author.author}
                          className="h-12 w-12"
                          fallbackClassName="bg-primary/10 text-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{author.author}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {author.book_count.toLocaleString()} {t('dashboard.books', { defaultValue: 'books' })}
                            </span>
                            <span>
                              {author.borrow_count.toLocaleString()} {t('dashboard.borrows', { defaultValue: 'borrows' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                      {t('dashboard.noTopAuthors', { defaultValue: 'No author data available yet' })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/85 p-5 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('dashboard.recentActivity')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.latestLibraryEvents', { defaultValue: 'Latest library transactions and updates' })}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {recentActivity.length.toLocaleString()} {t('dashboard.items', { defaultValue: 'items' })}
              </span>
            </div>

            <div className="space-y-1">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((activity, index) => (
                  <ActivityItem key={activity.id} activity={activity} index={index} />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('dashboard.noActivity')}</p>
              )}
            </div>
          </motion.div>

          {visibleActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.34 }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('dashboard.quickActions')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.quickActionsSubtitle', { defaultValue: 'Shortcuts for common library workflows' })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {visibleActions.map((action) => (
                  <QuickActionCard
                    key={action.title}
                    title={action.title}
                    icon={action.icon}
                    color={action.color}
                    onClick={action.onClick}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}



