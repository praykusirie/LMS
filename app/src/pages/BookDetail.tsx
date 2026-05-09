import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  Hash,
  Languages,
  Loader2,
  MapPin,
  Package2,
  Trash2,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { LazyBookCover } from '@/components/shared/LazyBookCover';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BookRecord {
  id: string;
  book_id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category_id: string | null;
  category_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  class_id: string | null;
  class_name: string | null;
  shelf_location_id: string | null;
  shelf_location_code: string | null;
  shelf_location_name: string | null;
  quantity: number;
  available: number;
  cover_image: string | null;
  description: string | null;
  published_year: number | null;
  publisher: string | null;
  pages: number | null;
  series: string | null;
  language: string | null;
  volume: string | null;
  format: string | null;
  level: string | null;
  is_active: boolean;
  created_at: string;
}

type BorrowerGender = 'male' | 'female' | 'other' | null;
type TrendPeriod = 'week' | 'month' | '6months';
type ActivityPeriod = 'week' | 'month' | 'all';

interface CurrentBorrower {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentAvatar: string | null;
  studentGender: BorrowerGender;
  className: string | null;
  borrowDate: string;
  dueDate: string;
  currentStatus: 'borrowed' | 'overdue' | 'returned';
  activeBorrows: number;
}

interface BorrowTrendPoint {
  month: string;
  borrows: number;
  returns: number;
}

interface BorrowHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentAvatar: string | null;
  studentGender: BorrowerGender;
  className: string | null;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  currentStatus: 'borrowed' | 'overdue' | 'returned';
  lateDays: number;
  fineAmount: number;
}

interface DetailSummary {
  totalBorrowed: number;
  activeBorrowers: number;
  averageLoanDays: number;
  nextAvailabilityDate: string | null;
  nextAvailabilityStatus: 'available' | 'expected' | 'unavailable';
  topBorrowerSegment: string;
  topBorrowerSegmentShare: number;
}

interface RelatedBook {
  id: string;
  bookId: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  available: number;
  quantity: number;
  categoryName: string | null;
  subjectName: string | null;
  className: string | null;
}

interface BookDetailRecord extends BookRecord {
  currentBorrowers: CurrentBorrower[];
  borrowingTrend: BorrowTrendPoint[];
  history: BorrowHistoryItem[];
  summary: DetailSummary;
  relatedBooks: RelatedBook[];
}

interface PeriodOption<T extends string> {
  value: T;
  label: string;
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '--';

  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
}

function formatMediumDate(value: string | null | undefined) {
  if (!value) return '--';

  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return `TZS ${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function slugTag(value: string) {
  return `#${value.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

function BookDetailSelect<T extends string>({
  value,
  onValueChange,
  options,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: PeriodOption<T>[];
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
      <SelectTrigger className="h-9 rounded-md border-border/60 bg-background/85 px-3 text-xs font-medium text-muted-foreground shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-border/70">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BorrowerAvatar({
  name,
  avatar,
  gender,
  className,
}: {
  name: string;
  avatar: string | null;
  gender: BorrowerGender;
  className?: string;
}) {
  if (avatar) {
    return (
      <div className={cn('overflow-hidden rounded-full bg-secondary', className)}>
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  if (gender === 'male' || gender === 'female') {
    return <PersonAvatar name={name} gender={gender} className={className} />;
  }

  return <IdentityAvatar name={name} className={className} fallbackClassName="bg-primary/10 text-primary" />;
}

export function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [book, setBook] = useState<BookDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('6months');
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>('week');

  useEffect(() => {
    if (!bookId) return;

    let isCancelled = false;

    const fetchBook = async () => {
      const preserveCurrentContent = !!book;

      try {
        if (preserveCurrentContent) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const { data } = await api.get(`/books/${bookId}`, {
          params: {
            trendPeriod,
            activityPeriod,
          },
        });

        if (isCancelled) {
          return;
        }

        setBook({
          ...data,
          currentBorrowers: data.currentBorrowers ?? [],
          borrowingTrend: data.borrowingTrend ?? [],
          history: data.history ?? [],
          summary: data.summary ?? {
            totalBorrowed: 0,
            activeBorrowers: 0,
            averageLoanDays: 0,
            nextAvailabilityDate: null,
            nextAvailabilityStatus: 'unavailable',
            topBorrowerSegment: 'No data',
            topBorrowerSegmentShare: 0,
          },
          relatedBooks: data.relatedBooks ?? [],
        });
      } catch (error) {
        console.error('Error fetching book:', error);

        if (isCancelled) {
          return;
        }

        toast.error(t('books.failedToLoadDetails'));

        if (!preserveCurrentContent) {
          navigate('/books');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void fetchBook();

    return () => {
      isCancelled = true;
    };
  }, [activityPeriod, bookId, navigate, t, trendPeriod]);

  const handleDelete = async () => {
    if (!book) return;

    try {
      await api.delete(`/books/${book.id}`);
      toast.success(t('books.bookDeletedSuccess'));
      navigate('/books');
    } catch (error: any) {
      toast.error(error?.message || t('books.failedToDelete'));
    }
  };

  const activityOptions = useMemo<PeriodOption<ActivityPeriod>[]>(
    () => [
      { value: 'week', label: t('reports.thisWeek') },
      { value: 'month', label: t('reports.thisMonth') },
      { value: 'all', label: t('reports.allTime') },
    ],
    [t],
  );

  const trendOptions = useMemo<PeriodOption<TrendPeriod>[]>(
    () => [
      { value: 'week', label: t('dashboard.lastWeek', { defaultValue: 'Last Week' }) },
      { value: 'month', label: t('dashboard.last30Days', { defaultValue: 'Last 30 Days' }) },
      { value: '6months', label: t('dashboard.last6Months') },
    ],
    [t],
  );

  if (isLoading && !book) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) return null;

  const headlineStats = [
    { label: t('books.language'), value: book.language || '--', icon: Languages },
    { label: t('books.pages'), value: book.pages ? String(book.pages) : '--', icon: FileText },
    { label: t('books.totalCopies'), value: String(book.quantity), icon: Package2 },
    { label: t('books.availableCopies'), value: `${book.available} ${t('common.of')} ${book.quantity}`, icon: BookOpen },
  ];

  const detailRows = [
    { label: t('books.bookId'), value: book.book_id, icon: Hash },
    {
      label: `${t('books.publisher')} / ${t('books.publishedYear')}`,
      value: [book.publisher, book.published_year].filter(Boolean).join(', ') || '--',
      icon: Building2,
    },
    {
      label: t('books.shelfLocation'),
      value: book.shelf_location_code ? `${book.shelf_location_code} - ${book.shelf_location_name}` : (book.shelf_location_name || '--'),
      icon: MapPin,
    },
    { label: t('books.isbn'), value: book.isbn || '--', icon: Calendar },
  ];

  const bookTags = Array.from(
    new Set(
      [
        book.category_name,
        book.subject_name,
        book.class_name,
        book.level ? `${book.level} level` : null,
        book.format,
        book.language,
        book.series,
      ].filter(Boolean) as string[],
    ),
  );

  const trendHighlight = [...book.borrowingTrend].reverse().find((point) => point.borrows > 0) ?? book.borrowingTrend[book.borrowingTrend.length - 1] ?? null;
  const hasTrendData = book.borrowingTrend.some((point) => point.borrows > 0 || point.returns > 0);
  const nextAvailabilityText = book.summary.nextAvailabilityStatus === 'available'
    ? t('books.availableNow', { defaultValue: 'Available now' })
    : book.summary.nextAvailabilityDate
      ? formatMediumDate(book.summary.nextAvailabilityDate)
      : t('books.outOfStock');

  const renderHeroCard = () => (
    <section
      className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-card"
    >
      <div className="relative p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="mx-auto w-full max-w-[220px] lg:mx-0 lg:max-w-[240px] xl:max-w-[250px]">
            <div className="rounded-xl bg-gradient-to-br from-[#fff6ea] via-[#fff9f3] to-[#f7fbff] p-2.5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
              <LazyBookCover
                src={book.cover_image}
                alt={book.title}
                containerClassName="h-[290px] w-full rounded-lg bg-muted shadow-lg sm:h-[320px]"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {book.category_name && (
                  <Badge className="rounded-full bg-[#ffe7df] px-3 py-1 text-[11px] font-medium text-[#c85f44] shadow-none hover:bg-[#ffe7df]">
                    {book.category_name}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-medium shadow-none',
                    book.available > 0
                      ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                      : 'bg-red-500 text-white hover:bg-red-500',
                  )}
                >
                  {book.available > 0 ? t('books.inStock') : t('books.outOfStock')}
                </Badge>
                {!book.is_active && (
                  <Badge className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 shadow-none hover:bg-red-50">
                    {t('books.inactive')}
                  </Badge>
                )}
              </div>

              {hasPermission('books:delete') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-2xl text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mt-4">
              <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {book.title}
              </h1>
              {book.author && (
                <p className="mt-2 text-base text-muted-foreground sm:text-lg">
                  {t('books.byAuthor')} {book.author}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {headlineStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-lg border border-border/60 bg-background/85 p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground sm:text-base">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 border-t border-border/60 pt-5 text-sm text-muted-foreground sm:grid-cols-2">
              {detailRows.map((row) => {
                const Icon = row.icon;

                return (
                  <div key={row.label} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/70 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">{row.label}</p>
                      <p className="mt-1 break-words font-medium text-foreground">{row.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-border/60 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
                {t('books.synopsis', { defaultValue: 'Synopsis' })}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                {book.description || t('books.noSynopsis', { defaultValue: 'No synopsis available for this book yet.' })}
              </p>
            </div>

            <div className="mt-6 border-t border-border/60 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
                {t('books.tags', { defaultValue: 'Tags' })}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {bookTags.length > 0 ? (
                  bookTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {slugTag(tag)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t('common.none')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderCurrentBorrowersPanel = () => (
    <section
      className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('books.currentBorrowers')} ({book.currentBorrowers.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {book.summary.activeBorrowers} {t('books.activeBorrowers', { defaultValue: 'active borrowers right now' })}
          </p>
        </div>
        <BookDetailSelect value={activityPeriod} onValueChange={setActivityPeriod} options={activityOptions} />
      </div>

      {isRefreshing && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      )}

      {book.currentBorrowers.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border/70 bg-secondary/30 px-4 py-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/35" />
          <p className="mt-3 text-sm text-muted-foreground">{t('books.noCurrentBorrowsForPeriod', { defaultValue: 'No current borrowers for the selected period.' })}</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {book.currentBorrowers.map((borrower, index) => (
            <div key={borrower.id} className="rounded-lg border border-border/60 bg-background/80 p-2.5 text-center shadow-sm">
              <div className="rounded-sm bg-[#ff7a59] px-2 py-1 text-left text-[10px] font-semibold text-white">#{index + 1}</div>
              <div className="mt-2 flex justify-center">
                <BorrowerAvatar
                  name={borrower.studentName}
                  avatar={borrower.studentAvatar}
                  gender={borrower.studentGender}
                  className="h-11 w-11 border-2 border-background shadow-sm"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{borrower.studentName}</p>
              <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{borrower.studentCode || borrower.className || '--'}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderTrendPanel = () => (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('books.borrowingTrend', { defaultValue: 'Borrowing Trend' })}</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('reports.totalBorrowed')}</p>
              <p className="text-4xl font-bold leading-none tracking-tight text-foreground">{book.summary.totalBorrowed}</p>
            </div>
            {trendHighlight && (
              <div className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{trendHighlight.month}</p>
                <p>{trendHighlight.borrows} {t('books.loans', { defaultValue: 'loans' })}</p>
              </div>
            )}
          </div>
        </div>
        <BookDetailSelect value={trendPeriod} onValueChange={setTrendPeriod} options={trendOptions} />
      </div>

      <div className="mt-5 h-[220px]">
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={book.borrowingTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                }}
              />
              <Line
                type="monotone"
                dataKey="borrows"
                stroke="#ff7a59"
                strokeWidth={2.5}
                dot={{ fill: '#ff7a59', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 5, fill: '#ff7a59' }}
                name={t('books.borrowed')}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70 bg-secondary/20 text-sm text-muted-foreground">
            {t('books.noTrendData', { defaultValue: 'No borrowing activity for this period yet.' })}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('reports.totalBorrowed')}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{book.summary.totalBorrowed}</p>
          <p className="mt-1 text-xs text-muted-foreground">{activityOptions.find((option) => option.value === activityPeriod)?.label}</p>
        </div>
        <div className="rounded-lg bg-warning/8 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('books.averageLoanTime', { defaultValue: 'Average Loan Time' })}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{book.summary.averageLoanDays} {t('overdue.days')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('books.returnedLoans', { defaultValue: 'Returned loans in selected period' })}</p>
        </div>
        <div className="rounded-lg bg-amber-500/8 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('books.topBorrowerSegment', { defaultValue: 'Top Borrower Segment' })}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{book.summary.topBorrowerSegment}</p>
          <p className="mt-1 text-xs text-muted-foreground">{book.summary.topBorrowerSegmentShare}% {t('common.of')} {t('common.results')}</p>
        </div>
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('books.nextAvailableCopy', { defaultValue: 'Next Available Copy' })}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{nextAvailabilityText}</p>
          <p className="mt-1 text-xs text-muted-foreground">{book.available > 0 ? t('books.onShelf') : t('books.expectedReturn', { defaultValue: 'Expected from active loan' })}</p>
        </div>
      </div>
    </section>
  );

  const renderRelatedBooksPanel = () => (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('books.relatedBooks', { defaultValue: 'Related Books' })}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {book.category_name || book.subject_name || t('books.similarBooks', { defaultValue: 'Similar books from your catalog' })}
        </p>
      </div>

      {book.relatedBooks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border/70 bg-secondary/20 px-4 py-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/35" />
          <p className="mt-3 text-sm text-muted-foreground">{t('books.noRelatedBooks', { defaultValue: 'No related books found yet.' })}</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {book.relatedBooks.map((related) => (
            <button
              key={related.id}
              type="button"
              onClick={() => navigate(`/books/${related.id}`)}
              className="text-left"
            >
              <div className="overflow-hidden rounded-lg border border-border/60 bg-background/80 p-2 transition-transform duration-200 hover:-translate-y-1">
                <LazyBookCover
                  src={related.coverImage}
                  alt={related.title}
                  containerClassName="h-28 w-full rounded-lg bg-muted"
                />
                <div className="mt-3 px-1 pb-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-4 text-foreground">{related.title}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{related.author || '--'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );

  const renderHistoryPanel = () => (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('books.borrowHistory')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('books.historySubtitle', { defaultValue: 'Borrow and return activity for this title.' })}</p>
        </div>
        <BookDetailSelect value={activityPeriod} onValueChange={setActivityPeriod} options={activityOptions} />
      </div>

      {book.history.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border/70 bg-secondary/20 px-4 py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/35" />
          <p className="mt-3 text-sm text-muted-foreground">{t('books.noBorrowHistory')}</p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('books.memberInfo', { defaultValue: 'Member Info' })}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('books.borrowAndDueDate', { defaultValue: 'Borrow & Due Date' })}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('reports.returnDate')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('reports.overdue')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('reports.fine')}</th>
              </tr>
            </thead>
            <tbody>
              {book.history.map((record) => (
                <tr key={record.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <BorrowerAvatar
                        name={record.studentName}
                        avatar={record.studentAvatar}
                        gender={record.studentGender}
                        className="h-10 w-10"
                      />
                      <div>
                        <p className="font-medium text-foreground">{record.studentName}</p>
                        <p className="text-xs text-muted-foreground">{record.studentCode || record.className || '--'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    <div className="space-y-1">
                      <p>{formatMediumDate(record.borrowDate)} - {formatShortDate(record.dueDate)}</p>
                      <p className="text-xs">{record.className || '--'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{record.returnDate ? formatMediumDate(record.returnDate) : '--'}</td>
                  <td className="px-4 py-4">
                    {record.lateDays > 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        {record.lateDays} {t('overdue.days')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-foreground">
                    {record.fineAmount > 0 ? formatCurrency(record.fineAmount) : formatCurrency(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-full space-y-6">
      <div
        className="flex items-center justify-between gap-3"
      >
        <Button variant="ghost" onClick={() => navigate('/books')} className="h-10 rounded-2xl px-3 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <div className="flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          )}
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            {book.book_id}
          </Badge>
        </div>
      </div>

      <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.7fr)_340px] xl:gap-6">
        {renderHeroCard()}
        <div className="space-y-6">
          {renderCurrentBorrowersPanel()}
          {renderTrendPanel()}
          {renderRelatedBooksPanel()}
        </div>
      </div>

      <div className="space-y-6 xl:hidden">
        {renderHeroCard()}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
          {renderTrendPanel()}
          <div className="space-y-6">
            {renderCurrentBorrowersPanel()}
            {renderRelatedBooksPanel()}
          </div>
        </div>
      </div>

      {renderHistoryPanel()}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('books.deleteBook')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('books.deleteConfirm')} <span className="font-medium text-foreground">&quot;{book.title}&quot;</span>? {t('books.deleteWarning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDelete} variant="destructive" className="rounded-xl">
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
