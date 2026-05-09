import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Upload, 
  BookPlus, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2,
  ScanLine,
  Trash2,
  Search,
  Edit2,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate, useLocation } from 'react-router-dom';

interface MasterItem {
  id: string;
  name: string;
  code?: string;
}

interface ScannedBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category_id: string;
  subject_id?: string;
  quantity: number;
  cover_image?: string;
  description?: string;
  publisher?: string;
  published_year?: string;
  pages?: string;
}

export function AddBook() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as any)?.tab ?? 'individual';
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

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
  
  // Bulk import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLevel, setBulkLevel] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  
  // Scan state
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchingIsbn, setSearchingIsbn] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<ScannedBook | null>(null);
  const [editDraft, setEditDraft] = useState<ScannedBook | null>(null);
  const [manualIsbn, setManualIsbn] = useState('');
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [pendingBook, setPendingBook] = useState<ScannedBook | null>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; updatedExisting: number; skipped: number; total: number; duplicatesMerged: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetchMasterData();
    if (!isAdmin && userLevel) {
      setFormData(prev => ({ ...prev, level: userLevel }));
      setBulkLevel(userLevel);
    }
  }, [isAdmin, userLevel]);

  const fetchMasterData = async () => {
    const fetchSafe = async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return [];
      }
    };

    const [catData, subData, clsData, slData] = await Promise.all([
      fetchSafe('/categories'),
      fetchSafe('/subjects'),
      fetchSafe('/classes'),
      fetchSafe('/shelf-locations'),
    ]);
    
    setCategories(catData);
    setSubjects(subData);
    setClasses(clsData);
    setShelfLocations(slData);
  };

  const getEffectiveLevel = () => {
    if (isAdmin) return formData.level || null;
    return userLevel;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!formData.title.trim()) {
      setErrorMessage(t('books.titleRequired'));
      return;
    }
    if (isAdmin && !formData.level) {
      setErrorMessage(t('books.levelRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/books', {
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
        level: getEffectiveLevel(),
      });
      setSuccessMessage(t('books.bookAddedSuccess'));
      toast.success(t('books.bookAddedSuccess'));
      setFormData({
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
        level: isAdmin ? '' : (userLevel || ''),
      });
    } catch (error: any) {
      setErrorMessage(error?.message || t('books.failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setErrorMessage(t('books.uploadError'));
      return;
    }
    
    setBulkFile(file);
    setImportResult(null);
    setErrorMessage('');
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setImportResult(null);
    
    try {
      const effectiveLevel = isAdmin ? bulkLevel : (userLevel || '');
      if (isAdmin && !effectiveLevel) {
        setErrorMessage(t('books.levelRequiredBulk'));
        setIsSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append('file', bulkFile);
      if (effectiveLevel) fd.append('level', effectiveLevel);
      if (bulkCategoryId) fd.append('category_id', bulkCategoryId);

      const { data } = await api.post('/books/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setImportResult(data);
      if (data.imported > 0) {
        setSuccessMessage(t('books.successfullyImported', { imported: data.imported, total: data.total }));
        toast.success(t('books.importedCount', { count: data.imported }));
      }
      if (data.skipped > 0 && data.imported === 0) {
        setErrorMessage(t('books.allRowsSkipped', { count: data.skipped }));
      }
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setErrorMessage(error?.message || t('books.failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Title,Author,ISBN,Publisher,Published Date,Pages,Series,Language,Volume,Format,Category,Subject,Class,Quantity,Location,Summary\nThe Great Gatsby,F. Scott Fitzgerald,978-0743273565,Scribner,1925,180,,English,,,Fiction,English,Grade 10,15,A-01,A classic novel';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleIsbnScan = async (isbn: string) => {
    if (!isbn) return;
    setErrorMessage('');
    
    // Prevent re-scanning the same item in the active session
    if (scannedBooks.some((b) => b.isbn === isbn)) {
      toast.error('ISBN already exists in the current session list.');
      return;
    }

    setSearchingIsbn(isbn);
    try {
      // 1. Check local DB first
      const checkRes = await api.get(`/books/isbn/${isbn}`);
      if (checkRes.data && checkRes.data.length > 0) {
         toast.error(t('books.bookAlreadyExists', { defaultValue: 'Book already exists in database' }));
         setSearchingIsbn(null);
         setIsScanning(true);
         return;
      }
    } catch (e: any) {
      // 404 is good; it means we don't have it yet.
      if (e.status !== 404 && e.response?.status !== 404) {
        toast.error('Error verifying local catalogue.');
      }
    }

    try {
      let bookData: Partial<ScannedBook> = {};

      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
      let usedGoogle = false;

      if (apiKey) {
        // 2. Fetch from Google Books API
        const gResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
        const gData = await gResponse.json();
        if (gData.items && gData.items.length > 0) {
          const info = gData.items[0].volumeInfo;
          bookData = {
            title: info.title,
            author: info.authors ? info.authors.join(', ') : '',
            cover_image: info.imageLinks?.thumbnail?.replace(/^http:/i, 'https:') || '',
            description: info.description || '',
            publisher: info.publisher || '',
            published_year: info.publishedDate ? info.publishedDate.substring(0,4) : '',
            pages: info.pageCount ? info.pageCount.toString() : '',
          };
          usedGoogle = true;
        }
      }

      // 3. Fallback to OpenLibrary
      if (!usedGoogle) {
        const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const olData = await olResponse.json();
        const olKey = `ISBN:${isbn}`;
        
        if (olData[olKey]) {
          const info = olData[olKey];
          bookData = {
            title: info.title,
            author: info.authors ? info.authors.map((a: any) => a.name).join(', ') : '',
            cover_image: info.cover?.medium?.replace(/^http:/i, 'https:') || '',
            publisher: info.publishers ? info.publishers.map((p: any) => p.name).join(', ') : '',
            published_year: info.publish_date ? info.publish_date.match(/\\d{4}/)?.[0] || '' : '',
            pages: info.number_of_pages ? info.number_of_pages.toString() : '',
          };
        }
      }

      if (!bookData.title) {
        // Book not found — notify user and reopen scanner for continuous scanning
        toast.info(`Book not found online for ISBN: ${isbn}. Try scanning another book.`);
        setSearchingIsbn(null);
        setIsScanning(true);
        return;
      }

      const newScannedBook: ScannedBook = {
        id: crypto.randomUUID(),
        isbn: isbn,
        title: bookData.title || '',
        author: bookData.author || '',
        category_id: '',
        subject_id: '',
        quantity: 1,
        cover_image: bookData.cover_image,
        description: bookData.description,
        publisher: bookData.publisher,
        published_year: bookData.published_year,
        pages: bookData.pages,
      };

      setPendingBook(newScannedBook);
      console.log('Fetched book data:', newScannedBook);
      setShowBookDialog(true);
      setManualIsbn('');
      toast.success(`Found: ${newScannedBook.title}`);
    } catch (err) {
       toast.error('Failed to fetch book data automatically.');
    } finally {
      setSearchingIsbn(null);
    }
  };

  const handleAddBookToCart = () => {
    if (!pendingBook) return;
    
    // Check if textbook
    const selectedCat = categories.find(c => c.id === pendingBook.category_id);
    const isTextbook = selectedCat && selectedCat.name.toLowerCase().includes('text');
    
    if (isTextbook && !pendingBook.subject_id) {
      toast.error('Please select a subject for this textbook.');
      return;
    }

    setScannedBooks((prev) => [...prev, pendingBook]);
    setShowBookDialog(false);
    setPendingBook(null);
    toast.success(`${pendingBook.title || 'Book'} added to cart`);
    // Auto-reopen scanner for continuous scanning
    setIsScanning(true);
  };

  const handleRemoveScannedBook = (id: string) => {
    setScannedBooks(prev => prev.filter(b => b.id !== id));
  };

  const openEditBook = (book: ScannedBook) => {
    setEditingBook(book);
    setEditDraft({ ...book });
  };

  const saveEditBook = () => {
    if (!editDraft) return;
    setScannedBooks(prev => prev.map(b => b.id === editDraft.id ? editDraft : b));
    setEditingBook(null);
    setEditDraft(null);
  };

  const handleSubmitScannedBooks = async () => {
    if (scannedBooks.length === 0) return;
    
    // validate
    for (const book of scannedBooks) {
      if (!book.title.trim()) {
        setErrorMessage('All scanned books must have a valid title.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const effectiveLevel = isAdmin ? bulkLevel : (userLevel || '');
      if (isAdmin && !effectiveLevel) {
         setErrorMessage(t('books.levelRequiredBulk'));
         setIsSubmitting(false);
         return;
      }

      const payloadUrl = '/books/batch';
      const booksPayload = scannedBooks.map((b) => ({
         ...b,
         level: effectiveLevel,
         category_id: b.category_id || bulkCategoryId || null, // fallback to single select
         subject_id: b.subject_id || null,
      }));

      const { data } = await api.post(payloadUrl, { books: booksPayload });
      
      setSuccessMessage(`Successfully saved ${data.imported} book(s) to the database. Skipped ${data.skipped} duplicates.`);
      toast.success('Batch import successful');
      setScannedBooks([]);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to submit batch books.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLevelSelect = () => (
    <div className="space-y-2">
      <Label>{t('books.level')} <span className="text-red-500">*</span></Label>
      <Select
        value={isAdmin ? formData.level : (userLevel || '')}
        onValueChange={(value) => setFormData({ ...formData, level: value })}
        disabled={!isAdmin}
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-foreground">{t('books.addBooksTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('books.addBooksSubtitle')}
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-lg bg-card p-4 md:p-6 shadow-card">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="flex flex-col sm:grid sm:grid-cols-3 w-full mb-6 rounded-xl h-auto sm:h-12 bg-transparent sm:bg-muted p-0 sm:p-1 gap-2 sm:gap-0">
            <TabsTrigger value="individual" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-11 sm:h-auto border sm:border-0 bg-card sm:bg-transparent shadow-sm sm:shadow-none">
              <BookPlus className="h-4 w-4 mr-2" />
              {t('books.addIndividual')}
            </TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-11 sm:h-auto border sm:border-0 bg-card sm:bg-transparent shadow-sm sm:shadow-none">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('books.bulkImportExcel')}
            </TabsTrigger>
            <TabsTrigger value="scan" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-11 sm:h-auto border sm:border-0 bg-card sm:bg-transparent shadow-sm sm:shadow-none">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan ISBN
            </TabsTrigger>
          </TabsList>

          {/* Individual Book Tab */}
          <TabsContent value="individual" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('books.bookTitle')} <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('books.enterTitle')}
                    className="rounded-xl h-11"
                    required
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
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
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
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
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
                        <SelectItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, quantity: (e.target.value === '' ? '' : parseInt(e.target.value)) as any })}
                    placeholder="Enter quantity"
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
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/books')}
                  className="rounded-xl h-11"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 rounded-xl h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('books.adding')}</> : t('books.addBook')}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="mt-0">
            <div className="space-y-6">
              {/* File Format Info */}
              <div className="p-4 bg-secondary/50 rounded-xl">
                <h3 className="font-medium text-sm mb-2">{t('books.supportedFormats')}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('books.formatDescription')}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg">Title *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Author</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">ISBN</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Publisher</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Published Date</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Pages</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Series</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Language</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Volume</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Format</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Genres / Category</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Quantity / Copy</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Summary</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Image URL</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('books.downloadTemplate')}
                </Button>
              </div>

              {/* Level & Category for bulk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('books.level')} <span className="text-red-500">*</span></Label>
                  <Select
                    value={isAdmin ? bulkLevel : (userLevel || '')}
                    onValueChange={(value) => setBulkLevel(value)}
                    disabled={!isAdmin}
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
                <div className="space-y-2">
                  <Label>{t('books.category')}</Label>
                  <Select
                    value={bulkCategoryId}
                    onValueChange={(value) => setBulkCategoryId(value)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={t('books.categoryOptional')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Upload */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {bulkFile ? bulkFile.name : t('books.clickToUpload')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('books.supportedFileTypes')}
                </p>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <h3 className="font-medium text-sm">{t('books.importResults')}</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-600">{t('books.newCount')}: {importResult.imported}</span>
                    {importResult.updatedExisting > 0 && (
                      <span className="text-purple-600">{t('books.updatedExisting')}: {importResult.updatedExisting}</span>
                    )}
                    {importResult.duplicatesMerged > 0 && (
                      <span className="text-blue-600">{t('books.duplicatesMerged')}: {importResult.duplicatesMerged}</span>
                    )}
                    <span className="text-amber-600">{t('books.skipped')}: {importResult.skipped}</span>
                    <span className="text-muted-foreground">{t('books.totalRows')}: {importResult.total}</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-[150px] overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bulkFile && (
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setBulkFile(null);
                      setImportResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded-xl h-11"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('common.clearAll')}
                  </Button>
                  <Button 
                    onClick={handleBulkUpload}
                    className="bg-primary hover:bg-primary/90 rounded-xl h-11"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('books.importing')}</> : t('books.importBooks')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Scan ISBN Tab */}
          <TabsContent value="scan" className="mt-0">
            <div className="space-y-6">
              {!isScanning && (
                <div className="flex flex-col lg:flex-row gap-4">
                  <Button 
                    onClick={() => setIsScanning(true)} 
                    className="flex-1 h-14 sm:h-16 text-base sm:text-lg bg-primary hover:bg-primary/90 rounded-xl"
                  >
                    <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                    Open Camera Scanner
                    {scannedBooks.length > 0 && (
                      <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-sm">({scannedBooks.length} in cart)</span>
                    )}
                  </Button>
                  <div className="flex flex-1 gap-2">
                    <Input 
                      value={manualIsbn} 
                      onChange={(e) => setManualIsbn(e.target.value)} 
                      placeholder="Or type ISBN manually..." 
                      className="h-14 sm:h-16 text-base sm:text-lg rounded-xl flex-1 px-4"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualIsbn) {
                          e.preventDefault();
                          handleIsbnScan(manualIsbn);
                        }
                      }}
                    />
                    <Button 
                      onClick={() => handleIsbnScan(manualIsbn)} 
                      disabled={!manualIsbn || !!searchingIsbn}
                      variant="outline"
                      className="h-14 sm:h-16 px-4 sm:px-6 text-lg rounded-xl border-2 hover:bg-secondary/50"
                    >
                      {!!searchingIsbn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              )}

              {isScanning && (
                <BarcodeScanner
                  onScan={(isbn) => handleIsbnScan(isbn)}
                  onClose={() => setIsScanning(false)}
                />
              )}

              {scannedBooks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Scanned Cart ({scannedBooks.length})</h3>
                  </div>

                  <div className="hidden lg:block border border-border/60 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Book</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 w-20">Qty</th>
                          <th className="px-4 py-3 w-20 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {scannedBooks.map((book) => (
                          <tr key={book.id} className="bg-card hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {book.cover_image
                                  ? <img src={book.cover_image} alt="" className="w-10 h-14 object-cover rounded-lg border shadow-sm flex-shrink-0" />
                                  : <div className="w-10 h-14 rounded-lg bg-primary/8 border border-border/60 flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-primary/40" /></div>
                                }
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate max-w-[220px]">{book.title}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">{book.author || 'Unknown author'}</p>
                                  <span className="mt-1 inline-block font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">ISBN: {book.isbn}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {book.category_id
                                ? <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">{categories.find(c => c.id === book.category_id)?.name ?? '—'}</span>
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center rounded-lg bg-secondary px-3 py-1 text-sm font-semibold text-foreground min-w-[2rem]">{book.quantity}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditBook(book)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveScannedBook(book.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-3">
                    {scannedBooks.map((book) => (
                      <div key={book.id} className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 p-3">
                          {book.cover_image
                            ? <img src={book.cover_image} alt="" className="w-12 h-16 object-cover rounded-lg border shadow-sm flex-shrink-0" />
                            : <div className="w-12 h-16 rounded-lg bg-primary/8 border border-border/60 flex items-center justify-center flex-shrink-0"><BookOpen className="h-5 w-5 text-primary/40" /></div>
                          }
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground line-clamp-2">{book.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{book.author || 'Unknown author'}</p>
                            <span className="mt-1 inline-block font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">ISBN: {book.isbn}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 bg-secondary/30">
                          <div className="flex items-center gap-2 min-w-0">
                            {book.category_id
                              ? <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary truncate max-w-[140px]">{categories.find(c => c.id === book.category_id)?.name ?? '—'}</span>
                              : <span className="text-xs text-muted-foreground">No category</span>
                            }
                            <span className="rounded-lg bg-secondary border border-border/60 px-2 py-0.5 text-xs font-semibold text-foreground flex-shrink-0">×{book.quantity}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditBook(book)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveScannedBook(book.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <div className="bg-secondary/30 p-4 rounded-xl mb-4">
                      {renderLevelSelect()}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setScannedBooks([])} className="h-11 rounded-xl px-6 w-full sm:w-auto">
                      Clear Cart
                    </Button>
                    <Button 
                      onClick={handleSubmitScannedBooks} 
                      className="bg-primary hover:bg-primary/90 h-11 rounded-xl px-8 w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : `Submit ${scannedBooks.length} Book(s)`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scan Review Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Review Book Details</DialogTitle>
            <DialogDescription className="sr-only">Confirm details before adding to cart</DialogDescription>
          </DialogHeader>
          {pendingBook && (
            <div className="space-y-4 py-4">
              {!pendingBook.title && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Book not found online — please enter details manually.
                </div>
              )}
              <div className="flex gap-4 items-start">
                {pendingBook.cover_image ? (
                  <img src={pendingBook.cover_image} alt="" className="w-20 h-28 object-cover rounded-lg shadow-sm border" />
                ) : (
                  <div className="w-20 h-28 bg-secondary rounded-lg border flex items-center justify-center">
                    <BookPlus className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-lg leading-tight line-clamp-2">{pendingBook.title}</h4>
                  <p className="text-sm text-muted-foreground">{pendingBook.author || 'Unknown Author'}</p>
                  <p className="text-xs font-mono text-muted-foreground bg-secondary inline-block px-1.5 rounded mt-1">ISBN: {pendingBook.isbn}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={pendingBook.category_id}
                    onValueChange={(val) => setPendingBook({ ...pendingBook, category_id: val })}
                  >
                    <SelectTrigger className="h-11 rounded-xl w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {categories.find(c => c.id === pendingBook.category_id)?.name.toLowerCase().includes('text') && (
                  <div className="space-y-1.5">
                    <Label>Subject <span className="text-red-500">*</span></Label>
                    <Select
                      value={pendingBook.subject_id}
                      onValueChange={(val) => setPendingBook({ ...pendingBook, subject_id: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl w-full">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    className="h-11 rounded-xl" 
                    value={pendingBook.quantity} 
                    onChange={(e) => setPendingBook({ ...pendingBook, quantity: (e.target.value === '' ? '' : parseInt(e.target.value)) as any })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleAddBookToCart} className="bg-primary hover:bg-primary/90 rounded-xl h-11">
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen ISBN Search Overlay */}
      {!!searchingIsbn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="mx-4 w-full max-w-xs rounded-3xl bg-card p-8 text-center shadow-2xl space-y-5">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
              <div className="absolute inset-[6px] rounded-full bg-primary/10 flex items-center justify-center">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground">Searching online…</p>
              <p className="text-xs text-muted-foreground">Checking local catalogue &amp; book databases</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
              <span className="font-mono text-xs font-medium text-foreground">{searchingIsbn}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cart Edit Sheet */}
      <Sheet open={!!editingBook} onOpenChange={(open) => { if (!open) { setEditingBook(null); setEditDraft(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-border/60">
            <SheetTitle>Edit Book</SheetTitle>
          </SheetHeader>
          {editDraft && (
            <div className="space-y-4 pt-4 pb-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60">
                {editDraft.cover_image
                  ? <img src={editDraft.cover_image} alt="" className="w-10 h-14 object-cover rounded-lg border shadow-sm flex-shrink-0" />
                  : <div className="w-10 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-muted-foreground/50" /></div>
                }
                <div className="min-w-0 space-y-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded inline-block">ISBN: {editDraft.isbn}</span>
                  {editDraft.publisher && <p className="text-xs text-muted-foreground">{editDraft.publisher}{editDraft.published_year ? `, ${editDraft.published_year}` : ''}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input className="h-11 rounded-xl" value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} placeholder="Book title" />
              </div>

              <div className="space-y-2">
                <Label>Author</Label>
                <Input className="h-11 rounded-xl" value={editDraft.author} onChange={(e) => setEditDraft({ ...editDraft, author: e.target.value })} placeholder="Author name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editDraft.category_id} onValueChange={(val) => setEditDraft({ ...editDraft, category_id: val })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" className="h-11 rounded-xl text-center" value={editDraft.quantity} onChange={(e) => setEditDraft({ ...editDraft, quantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              {categories.find(c => c.id === editDraft.category_id)?.name.toLowerCase().includes('text') && (
                <div className="space-y-2">
                  <Label>Subject <span className="text-red-500">*</span></Label>
                  <Select value={editDraft.subject_id} onValueChange={(val) => setEditDraft({ ...editDraft, subject_id: val })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => { setEditingBook(null); setEditDraft(null); }}>Cancel</Button>
                <Button className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90" onClick={saveEditBook}>Save Changes</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

