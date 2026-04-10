import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FolderTree,
  CheckCircle2,
  AlertCircle,
  BookOpen
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';

interface Category {
  id: string;
  name: string;
  description: string;
  book_count: number;
  is_active: boolean;
  created_at: string;
}

export function Categories() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      await api.post('/categories', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchCategories();
      setShowAddDialog(false);
      setFormData({ name: '', description: '', level: '' });
      toast.success('Category added successfully');
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(error?.message || 'Failed to add category');
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      await api.put(`/categories/${selectedCategory.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      await fetchCategories();
      setShowEditDialog(false);
      setSelectedCategory(null);
      setFormData({ name: '', description: '', level: '' });
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      await api.delete(`/categories/${selectedCategory.id}`);
      await fetchCategories();
      setShowDeleteDialog(false);
      setSelectedCategory(null);
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, description: category.description, level: (category as any).level || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  const columns: DataTableColumn<Category>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      getValue: (row) => row.name,
      render: (category) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <FolderTree className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground">{category.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      getValue: (row) => row.description,
      render: (category) => (
        <span className="text-muted-foreground">{category.description || '-'}</span>
      ),
    },
    {
      key: 'book_count',
      header: 'Books',
      sortable: true,
      getValue: (row) => row.book_count || 0,
      render: (category) => (
        <span className="font-medium">{category.book_count || 0}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      getValue: (row) => row.is_active ? 'Active' : 'Inactive',
      render: (category) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          category.is_active 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (category) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(category)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(category)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

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
          <h1 className="text-2xl font-bold text-foreground">Book Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage book categories for classification
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
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
              <p className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</p>
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
              <p className="text-2xl font-bold">{categories.reduce((sum, c) => sum + (c.book_count || 0), 0)}</p>
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
      >
        <DataTable
          data={filteredCategories}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={FolderTree}
          emptyTitle="No categories found"
          emptyDescription="Add your first category to get started."
        />
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
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
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
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
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
            {selectedCategory && (selectedCategory.book_count || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This category has {selectedCategory.book_count} books assigned.
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
