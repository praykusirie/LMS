import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  BookOpen,
  Loader2,
  Eye,
  X,
  Merge,
  Filter,
  LayoutGrid,
  List,
  BookPlus,
  FileSpreadsheet,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { StatusBadge } from '@/components/ui-custom';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui-custom';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { LazyBookCover } from '@/components/shared/LazyBookCover';

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

interface MasterItem {
  id: string;
  name: string;
  code?: string;
}

const BOOKS_VIEW_MODE_KEY = 'lms.books.view-mode';

type ViewMode = 'grid' | 'list';

export function Books() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [books, setBooks] = useState<BookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    return window.localStorage.getItem(BOOKS_VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Dialogs
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Master data
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [subjects, setSubjects] = useState<MasterItem[]>([]);
  const [classes, setClasses] = useState<MasterItem[]>([]);
  const [shelfLocations, setShelfLocations] = useState<MasterItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    subject_id: '',
    class_id: '',
    shelf_location_id: '',
    quantity: 1,
    publisher: '',
    published_year: '',
    description: '',
    level: '',
  });

  useEffect(() => {
    fetchBooks();
    fetchMasterData();
    fetchDuplicateCount();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BOOKS_VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  const fetchDuplicateCount = async () => {
    try {
      const { data } = await api.get('/books/duplicate-count');
      setDuplicateCount(data.duplicateRows ?? 0);
    } catch {
      setDuplicateCount(0);
    }
  };

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get('/books');
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
      setIsError(true);
      toast.error(t('books.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [catRes, subRes, clsRes, slRes] = await Promise.all([
        api.get('/categories'),
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/shelf-locations'),
      ]);
      setCategories(catRes.data);
      setSubjects(subRes.data);
      setClasses(clsRes.data);
      setShelfLocations(slRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.isbn || '').includes(searchQuery) ||
        (book.book_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || book.category_name === categoryFilter;
      const matchesSubject = subjectFilter === 'all' || book.subject_name === subjectFilter;
      const matchesClass = classFilter === 'all' || book.class_name === classFilter;
      const matchesAvailability = availabilityFilter === 'all' || 
        (availabilityFilter === 'available' ? book.available > 0 : book.available === 0);
      
      return matchesSearch && matchesCategory && matchesSubject && matchesClass && matchesAvailability;
    });
  }, [books, searchQuery, categoryFilter, subjectFilter, classFilter, availabilityFilter]);

  const categoryNames = [...new Set(books.map(b => b.category_name).filter(Boolean))] as string[];
  const subjectNames = [...new Set(books.map(b => b.subject_name).filter(Boolean))] as string[];
  const classNames = [...new Set(books.map(b => b.class_name).filter(Boolean))] as string[];
  const hasActiveFilters = categoryFilter !== 'all' || subjectFilter !== 'all' || classFilter !== 'all' || availabilityFilter !== 'all';
  const activeFilterCount = [categoryFilter, subjectFilter, classFilter, availabilityFilter]
    .filter((value) => value !== 'all').length;
  const visibleSelectedCount = filteredBooks.filter((book) => selectedRows.has(book.id)).length;
  const allFilteredSelected = filteredBooks.length > 0 && filteredBooks.every((book) => selectedRows.has(book.id));

  useEffect(() => {
    setSelectedRows((previous) => {
      if (previous.size === 0) return previous;

      const filteredIds = new Set(filteredBooks.map((book) => book.id));
      const next = new Set(Array.from(previous).filter((id) => filteredIds.has(id)));

      return next.size === previous.size ? previous : next;
    });
  }, [filteredBooks]);



  const handleEditBook = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    try {
      await api.put(`/books/${selectedBook.id}`, {
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        isbn: formData.isbn.trim() || null,
        category_id: formData.category_id || null,
        subject_id: formData.subject_id || null,
        class_id: formData.class_id || null,
        shelf_location_id: formData.shelf_location_id || null,
        quantity: formData.quantity || 1,
        publisher: formData.publisher.trim() || null,
        published_year: formData.published_year ? parseInt(formData.published_year) : null,
        description: formData.description.trim() || null,
      });
      await fetchBooks();
      setShowEditDialog(false);
      setSelectedBook(null);
      resetForm();
      toast.success(t('books.bookUpdatedSuccess'));
    } catch (error: any) {
      toast.error(error?.message || t('books.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/books/${selectedBook.id}`);
      await fetchBooks();
      setShowDeleteDialog(false);
      setSelectedBook(null);
      toast.success(t('books.bookDeletedSuccess'));
    } catch (error: any) {
      toast.error(error?.message || t('books.failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedRows).map(id => api.delete(`/books/${id}`))
      );
      await fetchBooks();
      setSelectedRows(new Set());
      toast.success(`${t('common.delete')}: ${selectedRows.size}`);
    } catch (error: any) {
      toast.error(t('books.failedToDeleteSome'));
    }
  };

  const handleMergeDuplicates = async () => {
    setIsMerging(true);
    try {
      const { data } = await api.post('/books/merge-duplicates');
      if (data.mergedGroups > 0) {
        toast.success(data.message);
        await fetchBooks();
      } else {
        toast.info(t('books.noDuplicatesFound'));
      }
      await fetchDuplicateCount();
    } catch (error: any) {
      toast.error(error?.message || t('books.failedToMerge'));
    } finally {
      setIsMerging(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', author: '', isbn: '',
      category_id: '', subject_id: '', class_id: '',
      shelf_location_id: '', quantity: 1,
      publisher: '', published_year: '', description: '',
      level: !isAdmin && userLevel ? userLevel : '',
    });
  };

  const openEditDialog = (book: BookRecord) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author || '',
      isbn: book.isbn || '',
      category_id: book.category_id || '',
      subject_id: book.subject_id || '',
      class_id: book.class_id || '',
      shelf_location_id: book.shelf_location_id || '',
      quantity: book.quantity,
      publisher: book.publisher || '',
      published_year: book.published_year?.toString() || '',
      description: book.description || '',
      level: book.level || '',
    });
    setShowEditDialog(true);
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setSubjectFilter('all');
    setClassFilter('all');
    setAvailabilityFilter('all');
    setSearchQuery('');
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedRows((previous) => {
      const next = new Set(previous);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedRows((previous) => {
      const next = new Set(previous);

      if (allFilteredSelected) {
        filteredBooks.forEach((book) => next.delete(book.id));
      } else {
        filteredBooks.forEach((book) => next.add(book.id));
      }

      return next;
    });
  };

  // Table columns
  const columns: DataTableColumn<BookRecord>[] = useMemo(() => [
    {
      key: 'title',
      header: t('books.book'),
      sortable: true,
      getValue: (row) => row.title,
      render: (book) => (
        <div className="flex items-center gap-3">
          {book.cover_image
            ? <LazyBookCover src={book.cover_image} alt={book.title} containerClassName="h-10 w-8 rounded-lg flex-shrink-0" />
            : <div className="h-10 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-primary" /></div>
          }
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]">{book.title}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{book.author || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'book_id',
      header: t('books.id'),
      sortable: true,
      render: (book) => (
        <span className="text-muted-foreground font-mono text-xs">{book.book_id}</span>
      ),
    },
    {
      key: 'category_name',
      header: t('books.category'),
      sortable: true,
      getValue: (row) => row.category_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.category_name || '-'}</span>
      ),
    },
    {
      key: 'subject_name',
      header: t('books.subject'),
      sortable: true,
      getValue: (row) => row.subject_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.subject_name || '-'}</span>
      ),
    },
    {
      key: 'class_name',
      header: t('books.class'),
      sortable: true,
      getValue: (row) => row.class_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.class_name || '-'}</span>
      ),
    },
    {
      key: 'available',
      header: t('books.availability'),
      sortable: true,
      render: (book) => (
        <StatusBadge status={book.available > 0 ? 'available' : 'unavailable'}>
          {book.available} / {book.quantity}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      header: t('books.added'),
      sortable: true,
      getValue: (row) => row.created_at,
      render: (book) => (
        <span className="text-muted-foreground text-xs">
          {new Date(book.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('books.action'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (book) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/books/${book.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {hasPermission('books:edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(book)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('books:delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => { setSelectedBook(book); setShowDeleteDialog(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          )}
        </div>
      ),
    },
  ], [hasPermission, navigate, t]);

  const filterControls = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">{t('books.category')}</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
              <SelectValue placeholder={t('books.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('books.allCategories')}</SelectItem>
              {categoryNames.map((categoryName) => (
                <SelectItem key={categoryName} value={categoryName}>{categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">{t('books.subject')}</Label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
              <SelectValue placeholder={t('books.subject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('books.allSubjects')}</SelectItem>
              {subjectNames.map((subjectName) => (
                <SelectItem key={subjectName} value={subjectName}>{subjectName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">{t('books.class')}</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
              <SelectValue placeholder={t('books.class')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('books.allClasses')}</SelectItem>
              {classNames.map((className) => (
                <SelectItem key={className} value={className}>{className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">{t('books.availability')}</Label>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
              <SelectValue placeholder={t('books.availability')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="available">{t('books.inStock')}</SelectItem>
              <SelectItem value="unavailable">{t('books.outOfStock')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <p className="text-sm text-muted-foreground">
          {filteredBooks.length} {t('common.results')}
        </p>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              setIsFilterPanelOpen(false);
            }}
            className="rounded-xl text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            {t('common.clearAll')}
          </Button>
        )}
      </div>
    </div>
  );

  const renderBooksGrid = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[320px] rounded-xl border border-border/60 bg-card/80 shadow-card animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (filteredBooks.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/70 px-6 py-16 text-center shadow-card">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/35" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('books.noBooks')}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('books.noBooksDesc')}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredBooks.map((book) => {
          const isSelected = selectedRows.has(book.id);

          return (
            <div
              key={book.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/books/${book.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/books/${book.id}`);
                }
              }}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-4 shadow-card transition-all hover:-translate-y-1 sm:p-5',
                isSelected
                  ? 'border-primary/30 bg-gradient-to-b from-card via-card to-primary/5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.45)]'
                  : 'border-border/60 bg-gradient-to-b from-card via-card to-secondary/25 hover:border-primary/20 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)]'
              )}
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/10" />

              <div
                className="absolute left-4 top-4 z-10"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleBookSelection(book.id)}
                  className="border-white/80 bg-white/90 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
              </div>

              <div className="relative z-[1] flex h-full flex-col">
                <div className="flex items-start gap-4">
                  {book.cover_image
                    ? <LazyBookCover src={book.cover_image} alt={book.title} containerClassName="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.55)]" />
                    : <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-primary/10 ring-1 ring-black/5 flex items-center justify-center"><BookOpen className="h-8 w-8 text-primary/40" /></div>
                  }

                  <div className="min-w-0 flex-1 space-y-3 pt-1">
                    <div className="space-y-2 pr-8">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">{book.book_id}</p>
                      <div>
                        <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{book.title}</h3>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{book.author || '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {book.category_name && (
                        <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                          {book.category_name}
                        </span>
                      )}
                      {book.subject_name && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {book.subject_name}
                        </span>
                      )}
                    </div>

                    <div>
                      <StatusBadge status={book.available > 0 ? 'available' : 'unavailable'}>
                        {book.available} / {book.quantity}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('books.class')}</p>
                    <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">{book.class_name || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('books.shelfLocation')}</p>
                    <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
                      {book.shelf_location_code || book.shelf_location_name || '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <span>
                    {new Date(book.created_at).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-medium text-primary/80">{t('common.view')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLevelSelect = (disabled = false) => (
    <div className="space-y-2">
      <Label>{t('books.level')} <span className="text-red-500">*</span></Label>
      <Select
        value={isAdmin ? formData.level : (userLevel || '')}
        onValueChange={(value) => setFormData({ ...formData, level: value })}
        disabled={!isAdmin || disabled}
      >
        <SelectTrigger className="rounded-xl h-11">
          <SelectValue placeholder={isAdmin ? t('books.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} ${t('books.level')}` : t('books.noLevel'))} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">{t('books.primaryLevel')}</SelectItem>
          <SelectItem value="secondary">{t('books.secondaryLevel')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderBookForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('books.bookTitle')} <span className="text-red-500">*</span></Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t('books.enterTitle')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('books.author')}</Label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder={t('books.enterAuthor')}
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('books.isbn')}</Label>
          <Input
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            placeholder={t('books.enterISBN')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('books.category')}</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={t('books.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('books.subject')}</Label>
          <Select
            value={formData.subject_id}
            onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={t('books.selectSubject')} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('books.class')}</Label>
          <Select
            value={formData.class_id}
            onValueChange={(value) => setFormData({ ...formData, class_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={t('books.selectClass')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('books.quantity')}</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('books.shelfLocation')}</Label>
          <Select
            value={formData.shelf_location_id}
            onValueChange={(value) => setFormData({ ...formData, shelf_location_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={t('books.selectShelf')} />
            </SelectTrigger>
            <SelectContent>
              {shelfLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.code ? `${loc.code} - ${loc.name}` : loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('books.publisher')}</Label>
          <Input
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            placeholder={t('books.enterPublisher')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('books.publishedYear')}</Label>
          <Input
            value={formData.published_year}
            onChange={(e) => setFormData({ ...formData, published_year: e.target.value })}
            placeholder="e.g., 2023"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      {renderLevelSelect()}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('books.allBooks')}
        description={`${t('books.manageCatalog')} (${filteredBooks.length})`}
        secondaryActions={
          <div className="flex flex-wrap gap-3">
            {selectedRows.size > 0 && hasPermission('books:delete') && (
              <Button variant="destructive" className="rounded-xl h-11" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')} ({selectedRows.size})
              </Button>
            )}
            {duplicateCount > 0 && (
              <Button variant="outline" className="rounded-xl h-11" onClick={handleMergeDuplicates} disabled={isMerging}>
                {isMerging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
                {t('books.mergeDuplicates')} ({duplicateCount})
              </Button>
            )}

          </div>
        }
        action={hasPermission('books:create') ? {
          label: t('books.addBook'),
          icon: Plus,
          onClick: () => setShowAddSheet(true),
        } : undefined}
      />

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('books.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-2xl border-border/60 bg-background/85 pl-11 shadow-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/8 px-3 py-1.5 font-medium text-primary">
                {filteredBooks.length} {t('common.results')}
              </span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-amber-500/12 px-3 py-1.5 font-medium text-amber-700">
                  {activeFilterCount} {t('common.filter')}
                </span>
              )}
              {visibleSelectedCount > 0 && (
                <span className="rounded-full bg-emerald-500/12 px-3 py-1.5 font-medium text-emerald-700">
                  {visibleSelectedCount} {t('common.selected')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {isMobile ? (
              <Drawer open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-background/90 px-4">
                    <Filter className="h-4 w-4 mr-2" />
                    {t('common.filter')}
                    {activeFilterCount > 0 && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="rounded-t-[28px] border-border/60">
                  <DrawerHeader className="text-left">
                    <DrawerTitle>{t('common.filter')}</DrawerTitle>
                    <DrawerDescription>{t('books.manageCatalog')}</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2">{filterControls}</div>
                  <DrawerFooter>
                    <Button variant="outline" className="rounded-xl" onClick={() => setIsFilterPanelOpen(false)}>
                      {t('common.close')}
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-background/90 px-4">
                    <Filter className="h-4 w-4 mr-2" />
                    {t('common.filter')}
                    {activeFilterCount > 0 && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={10} className="w-[420px] rounded-xl border-border/60 p-5 shadow-2xl">
                  {filterControls}
                </PopoverContent>
              </Popover>
            )}

            <div className="inline-flex items-center rounded-2xl border border-border/60 bg-background/90 p-1.5 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-9 rounded-xl px-3 text-muted-foreground',
                  viewMode === 'grid' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-9 rounded-xl px-3 text-muted-foreground',
                  viewMode === 'list' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {viewMode === 'grid' && filteredBooks.length > 0 && (
              <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-background/90 px-4" onClick={toggleSelectAllFiltered}>
                {allFilteredSelected ? t('common.clear') : t('common.selectAll')}
              </Button>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="h-12 rounded-2xl px-4 text-muted-foreground">
                <X className="h-4 w-4 mr-2" />
                {t('common.clearAll')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Catalog */}
      <div>
        {viewMode === 'grid' ? (
          renderBooksGrid()
        ) : (
          <DataTable
            data={filteredBooks}
            columns={columns}
            isLoading={isLoading}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            getRowId={(row) => row.id}
            onRowClick={(row) => navigate(`/books/${row.id}`)}
            emptyIcon={BookOpen}
            emptyTitle={t('books.noBooks')}
            emptyDescription={t('books.noBooksDesc')}
            isError={isError}
            onRetry={() => { setIsError(false); fetchBooks(); }}
            emptyAction={hasPermission('books:create') ? {
              label: t('books.addBook'),
              icon: Plus,
              onClick: () => { resetForm(); setShowAddSheet(true); },
            } : undefined}
          />
        )}
      </div>

      {/* Add Book Action Sheet */}
      <Dialog open={showAddSheet} onOpenChange={setShowAddSheet}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{t('books.addBook')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose how you'd like to add books to the catalogue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
            <button
              onClick={() => { navigate('/add-book', { state: { tab: 'individual' } }); setShowAddSheet(false); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 text-center transition-all hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-xl bg-primary/10 p-3.5 group-hover:bg-primary/15 transition-colors">
                <BookPlus className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Individual</p>
                <p className="text-xs text-muted-foreground leading-snug">Fill a form for one book</p>
              </div>
            </button>

            <button
              onClick={() => { navigate('/add-book', { state: { tab: 'bulk' } }); setShowAddSheet(false); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 text-center transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-xl bg-amber-500/10 p-3.5 group-hover:bg-amber-500/15 transition-colors">
                <FileSpreadsheet className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Bulk Import</p>
                <p className="text-xs text-muted-foreground leading-snug">Upload CSV or Excel file</p>
              </div>
            </button>

            <button
              onClick={() => { navigate('/add-book', { state: { tab: 'scan' } }); setShowAddSheet(false); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 text-center transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-xl bg-emerald-500/10 p-3.5 group-hover:bg-emerald-500/15 transition-colors">
                <ScanLine className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Scan ISBN</p>
                <p className="text-xs text-muted-foreground leading-snug">Use camera to scan barcodes</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('books.editBook')}</DialogTitle>
          </DialogHeader>
          {renderBookForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleEditBook} 
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('books.deleteBook')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('books.deleteConfirm', { title: selectedBook?.title })} {t('books.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

