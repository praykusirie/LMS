import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Upload,
  BookOpen
} from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, EmptyState } from '@/components/ui-custom';
import { books as mockBooks } from '@/data/mockData';
import type { Book } from '@/types';
import { useNavigate } from 'react-router-dom';

const generateBookCover = (title: string, category: string) => {
  const seed = encodeURIComponent(title);
  const colors = ['1e3a5f', '2d5a3d', '5a2d2d', '4a3d5a', '3d4a5a'];
  const colorIndex = title.length % colors.length;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${colors[colorIndex]}`;
};

export function Books() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBooks(mockBooks);
      setIsLoading(false);
    };
    loadBooks();
  }, []);

  // Form state
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    isbn: '',
    category: '',
    subject: '',
    class: '',
    quantity: 1,
    shelfLocation: ''
  });

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery);
      
      const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
      const matchesAvailability = availabilityFilter === 'all' || 
        (availabilityFilter === 'available' ? book.available > 0 : book.available === 0);
      
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [books, searchQuery, categoryFilter, availabilityFilter]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBooks.slice(start, start + itemsPerPage);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  const categories = [...new Set(books.map(b => b.category))];

  const handleAddBook = () => {
    const newBook: Book = {
      id: `b${Date.now()}`,
      title: formData.title || '',
      author: formData.author || '',
      isbn: formData.isbn || '',
      category: formData.category || '',
      subject: formData.subject || '',
      class: formData.class || '',
      quantity: formData.quantity || 1,
      available: formData.quantity || 1,
      shelfLocation: formData.shelfLocation || '',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setBooks([newBook, ...books]);
    setShowAddDialog(false);
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      subject: '',
      class: '',
      quantity: 1,
      shelfLocation: ''
    });
  };

  const handleEditBook = () => {
    if (!selectedBook) return;
    setBooks(books.map(b => b.id === selectedBook.id ? { ...b, ...formData } : b));
    setShowEditDialog(false);
    setSelectedBook(null);
  };

  const handleDeleteBook = () => {
    if (!selectedBook) return;
    setBooks(books.filter(b => b.id !== selectedBook.id));
    setShowDeleteDialog(false);
    setSelectedBook(null);
  };

  const openEditDialog = (book: Book) => {
    setSelectedBook(book);
    setFormData(book);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (book: Book) => {
    setSelectedBook(book);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your library catalog
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="rounded-xl h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button 
            onClick={() => navigate('/add-book')}
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
        className="flex flex-wrap gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">In Stock</SelectItem>
            <SelectItem value="unavailable">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-6 w-[60px] rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books found"
            description="Try adjusting your search or filters, or add a new book."
            actionLabel="Add Book"
            onAction={() => navigate('/add-book')}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Book
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ISBN
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Class
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBooks.map((book) => (
                    <tr 
                      key={book.id} 
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                            <img 
                              src={generateBookCover(book.title, book.category)} 
                              alt={book.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{book.title}</div>
                            <div className="text-xs text-muted-foreground">{book.author}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {book.isbn}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {book.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {book.class}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge 
                          status={book.available > 0 ? 'available' : 'unavailable'}
                        >
                          {book.available} / {book.quantity}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(book)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(book)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBooks.length)} of {filteredBooks.length} books
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg ${currentPage === page ? 'bg-navy hover:bg-navy/90' : ''}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Add Book Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter book title"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Enter author name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>ISBN</Label>
              <Input
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="Enter ISBN"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Fiction"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., English"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Input
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  placeholder="e.g., Grade 10"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Enter quantity"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shelf Location</Label>
              <Input
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                placeholder="e.g., A-12-3"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddBook} className="bg-navy hover:bg-navy/90 rounded-xl">
              Add Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>ISBN</Label>
              <Input
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Input
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shelf Location</Label>
              <Input
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditBook} className="bg-navy hover:bg-navy/90 rounded-xl">
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
