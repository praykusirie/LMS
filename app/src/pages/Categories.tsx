import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  FolderTree,
  CheckCircle2,
  AlertCircle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui-custom';

interface Category {
  id: string;
  name: string;
  description: string;
  bookCount: number;
  isActive: boolean;
  createdAt: string;
}

const initialCategories: Category[] = [
  { id: 'cat1', name: 'Fiction', description: 'Novels and fictional stories', bookCount: 450, isActive: true, createdAt: '2024-01-01' },
  { id: 'cat2', name: 'Non-Fiction', description: 'Factual and informational books', bookCount: 320, isActive: true, createdAt: '2024-01-01' },
  { id: 'cat3', name: 'Textbook', description: 'Educational textbooks', bookCount: 280, isActive: true, createdAt: '2024-01-01' },
  { id: 'cat4', name: 'Reference', description: 'Dictionaries, encyclopedias, etc.', bookCount: 150, isActive: true, createdAt: '2024-01-01' },
  { id: 'cat5', name: 'Biography', description: 'Life stories and memoirs', bookCount: 85, isActive: true, createdAt: '2024-01-01' },
];

export function Categories() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateId = () => `cat${Date.now()}`;

  const handleAdd = () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }

    const newCategory: Category = {
      id: generateId(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      bookCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setCategories([...categories, newCategory]);
    setShowAddDialog(false);
    setFormData({ name: '', description: '' });
    showNotification('success', 'Category added successfully');
  };

  const handleEdit = () => {
    if (!selectedCategory || !formData.name.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }

    setCategories(categories.map(c => 
      c.id === selectedCategory.id 
        ? { ...c, name: formData.name.trim(), description: formData.description.trim() }
        : c
    ));
    setShowEditDialog(false);
    setSelectedCategory(null);
    setFormData({ name: '', description: '' });
    showNotification('success', 'Category updated successfully');
  };

  const handleDelete = () => {
    if (!selectedCategory) return;

    setCategories(categories.filter(c => c.id !== selectedCategory.id));
    setShowDeleteDialog(false);
    setSelectedCategory(null);
    showNotification('success', 'Category deleted successfully');
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, description: category.description });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {notification.message}
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Book Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage book categories for classification
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', description: '' });
            setShowAddDialog(true);
          }}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Total Categories</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.filter(c => c.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active Categories</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.reduce((sum, c) => sum + c.bookCount, 0)}</p>
              <p className="text-sm text-muted-foreground">Total Books</p>
            </div>
          </div>
        </div>
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories found"
            description="Add your first category to get started."
            actionLabel="Add Category"
            onAction={() => setShowAddDialog(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Books
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr 
                    key={category.id} 
                    className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                          <FolderTree className="h-5 w-5 text-navy" />
                        </div>
                        <span className="font-medium text-foreground">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {category.bookCount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(category)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(category)}
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
        )}
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g., Fiction"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Novels and fictional stories"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g., Fiction"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Novels and fictional stories"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-navy hover:bg-navy/90 rounded-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedCategory?.name}</span>? 
              This action cannot be undone.
            </p>
            {selectedCategory && selectedCategory.bookCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This category has {selectedCategory.bookCount} books assigned.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive" className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
