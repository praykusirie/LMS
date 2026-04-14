import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  User,
  Hash,
  Calendar,
  Building2,
  MapPin,
  Layers,
  Globe,
  FileText,
  BookCopy,
  Tag,
  GraduationCap,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
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

const generateBookCover = (title: string) => {
  const seed = encodeURIComponent(title);
  const colors = ['1e3a5f', '2d5a3d', '5a2d2d', '4a3d5a', '3d4a5a'];
  const colorIndex = title.length % colors.length;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${colors[colorIndex]}`;
};

export function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [book, setBook] = useState<BookRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (bookId) fetchBook();
  }, [bookId]);

  const fetchBook = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/books/${bookId}`);
      setBook(data);
    } catch (error) {
      console.error('Error fetching book:', error);
      toast.error(t('books.failedToLoadDetails'));
      navigate('/books');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) return null;

  const borrowed = book.quantity - book.available;
  const availPercent = book.quantity > 0 ? (book.available / book.quantity) * 100 : 0;

  const infoItems = [
    { icon: User, label: t('books.author'), value: book.author },
    { icon: Hash, label: t('books.isbn'), value: book.isbn },
    { icon: Building2, label: t('books.publisher'), value: book.publisher },
    { icon: Calendar, label: t('books.publishYear'), value: book.published_year?.toString() },
    { icon: FileText, label: t('books.pages'), value: book.pages?.toString() },
    { icon: Globe, label: t('books.language'), value: book.language },
    { icon: BookCopy, label: t('books.summary'), value: book.series },
    { icon: Layers, label: t('books.edition'), value: book.volume },
    { icon: BookOpen, label: t('books.copies'), value: book.format },
    { icon: Tag, label: t('books.category'), value: book.category_name },
    { icon: GraduationCap, label: t('books.subject'), value: book.subject_name },
    { icon: GraduationCap, label: t('books.class'), value: book.class_name },
    { icon: MapPin, label: t('books.shelfLocation'), value: book.shelf_location_code ? `${book.shelf_location_code} — ${book.shelf_location_name}` : book.shelf_location_name },
  ].filter(item => item.value);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/books')}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('books.bookDetails')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">ID: {book.book_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t('common.delete')}
          </Button>
        </div>
      </motion.div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-[20px] bg-card shadow-card overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">
          {/* Cover */}
          <div className="w-full md:w-56 h-56 md:h-auto bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center p-6 flex-shrink-0">
            <LazyBookCover
              src={book.cover_image}
              fallbackSrc={generateBookCover(book.title)}
              alt={book.title}
              containerClassName="h-40 w-32 md:h-48 md:w-36 rounded-xl shadow-lg"
            />
          </div>

          {/* Main info */}
          <div className="flex-1 p-6 md:p-8">
            <div className="flex flex-wrap items-start gap-2 mb-3">
              {book.level && (
                <Badge variant="outline" className="text-xs capitalize border-navy/30 text-navy bg-navy/5">
                  {book.level} Level
                </Badge>
              )}
              {book.category_name && (
                <Badge variant="secondary" className="text-xs">
                  {book.category_name}
                </Badge>
              )}
              {!book.is_active && (
                <Badge variant="destructive" className="text-xs">{t('books.inactive')}</Badge>
              )}
            </div>

            <h2 className="text-2xl font-bold text-foreground leading-tight">{book.title}</h2>
            {book.author && (
              <p className="text-base text-muted-foreground mt-1">{t('books.byAuthor')} {book.author}</p>
            )}

            {book.description && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-2xl">
                {book.description}
              </p>
            )}

            {/* Availability bar */}
            <div className="mt-6 max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{t('books.availability')}</span>
                <span className="text-sm text-muted-foreground">
                  {book.available} {t('common.of')} {book.quantity} {t('books.available').toLowerCase()}
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    availPercent > 50 ? 'bg-green-50 dark:bg-green-950/300' : availPercent > 20 ? 'bg-amber-50 dark:bg-amber-950/300' : 'bg-red-50 dark:bg-red-950/300'
                  }`}
                  style={{ width: `${availPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{borrowed} {t('books.borrowed').toLowerCase()}</span>
                <span>{book.available} {t('books.onShelf')}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Details Grid */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-[20px] bg-card shadow-card p-6 md:p-8"
      >
        <h3 className="text-lg font-semibold text-foreground mb-5">{t('books.bookInformation')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {infoItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Meta */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-[20px] bg-card shadow-card p-6 md:p-8"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('books.recordDetails')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">{t('books.bookId')}</p>
            <p className="text-sm font-mono font-medium">{book.book_id}</p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">{t('books.totalCopies')}</p>
            <p className="text-sm font-medium">{book.quantity}</p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">{t('books.addedOn')}</p>
            <p className="text-sm font-medium">
              {new Date(book.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('books.deleteBook')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('books.deleteConfirm')} <span className="font-medium text-foreground">"{book.title}"</span>?
              {t('books.deleteWarning')}
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
