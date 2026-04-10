import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Upload,
  BookOpen,
  Loader2,
  Eye,
  X,
  Merge,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui-custom';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
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

const generateBookCover = (title: string) => {
  const seed = encodeURIComponent(title);
  const colors = ['1e3a5f', '2d5a3d', '5a2d2d', '4a3d5a', '3d4a5a'];
  const colorIndex = title.length % colors.length;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${colors[colorIndex]}`;
};

export function Books() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [books, setBooks] = useState<BookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  const fetchDuplicateCount = async () => {
    try {
      const { data } = await api.get('/books/duplicate-count');
      setDuplicateCount(data.duplicateRows ?? 0);
      console.log(data)
    } catch {
      setDuplicateCount(0);
    }
  };

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/books');
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to fetch books');
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

  const getEffectiveLevel = () => {
    if (isAdmin) return formData.level || null;
    return userLevel;
  };

  const handleAddBook = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (isAdmin && !formData.level) {
      toast.error('Level is required');
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
      await fetchBooks();
      setShowAddDialog(false);
      resetForm();
      toast.success('Book added successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add book');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      toast.success('Book updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update book');
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
      toast.success('Book deleted successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete book');
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
      toast.success(`Deleted ${selectedRows.size} books`);
    } catch (error: any) {
      toast.error('Failed to delete some books');
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
        toast.info('No duplicates found in the database.');
      }
      await fetchDuplicateCount();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to merge duplicates');
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

  // Table columns
  const columns: DataTableColumn<BookRecord>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Book',
      sortable: true,
      getValue: (row) => row.title,
      render: (book) => (
        <div className="flex items-center gap-3">
          <LazyBookCover
            src={book.cover_image}
            fallbackSrc={generateBookCover(book.title)}
            alt={book.title}
            containerClassName="h-10 w-8 rounded-lg flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate max-w-[200px]">{book.title}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{book.author || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'book_id',
      header: 'ID',
      sortable: true,
      render: (book) => (
        <span className="text-muted-foreground font-mono text-xs">{book.book_id}</span>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      sortable: true,
      getValue: (row) => row.category_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.category_name || '-'}</span>
      ),
    },
    {
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      getValue: (row) => row.subject_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.subject_name || '-'}</span>
      ),
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      getValue: (row) => row.class_name,
      render: (book) => (
        <span className="text-muted-foreground">{book.class_name || '-'}</span>
      ),
    },
    {
      key: 'available',
      header: 'Availability',
      sortable: true,
      render: (book) => (
        <StatusBadge status={book.available > 0 ? 'available' : 'unavailable'}>
          {book.available} / {book.quantity}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      header: 'Added',
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
      header: 'Action',
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(book)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => { setSelectedBook(book); setShowDeleteDialog(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [navigate, categories, subjects, classes]);

  const renderLevelSelect = (disabled = false) => (
    <div className="space-y-2">
      <Label>Level <span className="text-red-500">*</span></Label>
      <Select
        value={isAdmin ? formData.level : (userLevel || '')}
        onValueChange={(value) => setFormData({ ...formData, level: value })}
        disabled={!isAdmin || disabled}
      >
        <SelectTrigger className="rounded-xl h-11">
          <SelectValue placeholder={isAdmin ? 'Select level' : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : 'No level')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">Primary Level</SelectItem>
          <SelectItem value="secondary">Secondary Level</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderBookForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title <span className="text-red-500">*</span></Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter book title"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Author</Label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="Enter author name"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ISBN</Label>
          <Input
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            placeholder="Enter ISBN"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Select category" />
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
          <Label>Subject</Label>
          <Select
            value={formData.subject_id}
            onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Class</Label>
          <Select
            value={formData.class_id}
            onValueChange={(value) => setFormData({ ...formData, class_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Select class" />
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
          <Label>Quantity</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Shelf Location</Label>
          <Select
            value={formData.shelf_location_id}
            onValueChange={(value) => setFormData({ ...formData, shelf_location_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Select shelf location" />
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
          <Label>Publisher</Label>
          <Input
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            placeholder="Enter publisher"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Published Year</Label>
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
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your library catalog ({filteredBooks.length} books)
          </p>
        </div>
        <div className="flex gap-3">
          {selectedRows.size > 0 && (
            <Button 
              variant="destructive"
              className="rounded-xl h-11"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.size})
            </Button>
          )}
          {duplicateCount > 0 && (
            <Button
              variant="outline"
              className="rounded-xl h-11"
              onClick={handleMergeDuplicates}
              disabled={isMerging}
            >
              {isMerging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge Duplicates ({duplicateCount})
            </Button>
          )}
          <Button 
            onClick={() => navigate('/add-book')}
            variant="outline"
            className="rounded-xl h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="bg-navy hover:bg-navy/90 rounded-xl h-11"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-xl">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryNames.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-xl">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectNames.map(sub => (
              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[130px] h-11 rounded-xl">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classNames.map(cls => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-xl">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">In Stock</SelectItem>
            <SelectItem value="unavailable">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
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
          emptyTitle="No books found"
          emptyDescription="Try adjusting your search or filters, or add a new book."
        />
      </motion.div>

      {/* Add Book Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Book</DialogTitle>
          </DialogHeader>
          {renderBookForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleAddBook} 
              className="bg-navy hover:bg-navy/90 rounded-xl"
              disabled={isSubmitting || !formData.title.trim() || (isAdmin && !formData.level)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          {renderBookForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleEditBook} 
              className="bg-navy hover:bg-navy/90 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{selectedBook?.title}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleDeleteBook} variant="destructive" className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
