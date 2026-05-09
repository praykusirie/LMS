import { useState, useMemo, useEffect } from 'react';
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
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

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
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
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
      setIsError(false);
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setIsError(true);
      toast.error(t('categories.failedToFetch'));
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
      toast.error(t('categories.nameRequired'));
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
      toast.success(t('categories.addSuccess'));
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(error?.message || t('categories.failedToAdd'));
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error(t('categories.nameRequired'));
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
      toast.success(t('categories.updateSuccess'));
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(t('categories.failedToUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      await api.delete(`/categories/${selectedCategory.id}`);
      await fetchCategories();
      setShowDeleteDialog(false);
      setSelectedCategory(null);
      toast.success(t('categories.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('categories.failedToDelete'));
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
      header: t('categories.categoryName'),
      sortable: true,
      getValue: (row) => row.name,
      render: (category) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium text-foreground">{category.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('common.description'),
      sortable: true,
      getValue: (row) => row.description,
      render: (category) => (
        <span className="text-muted-foreground">{category.description || '-'}</span>
      ),
    },
    {
      key: 'book_count',
      header: t('categories.books'),
      sortable: true,
      getValue: (row) => row.book_count || 0,
      render: (category) => (
        <span className="font-medium">{category.book_count || 0}</span>
      ),
    },
    {
      key: 'is_active',
      header: t('common.status'),
      sortable: true,
      getValue: (row) => row.is_active ? 'Active' : 'Inactive',
      render: (category) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          category.is_active 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
        }`}>
          {category.is_active ? t('categories.active') : t('categories.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (category) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {hasPermission('categories:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(category)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('categories:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(category)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('categories.title')}
        description={t('categories.subtitle')}
        action={hasPermission('categories:manage') ? {
          label: t('categories.addCategory'),
          icon: Plus,
          onClick: () => {
            setFormData({ name: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
            setShowAddDialog(true);
          },
        } : undefined}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('categories.searchCategories')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-sm text-muted-foreground">{t('categories.totalCategories')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</p>
              <p className="text-sm text-muted-foreground">{t('categories.activeCategories')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.reduce((sum, c) => sum + (c.book_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">{t('categories.totalBooks')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-20" />
            ))
          : filteredCategories.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <FolderTree className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('categories.noCategories')}</p>
              </div>
            )
          : filteredCategories.map((category) => (
              <div key={category.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderTree className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{category.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{category.description || t('common.noDescription')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {hasPermission('categories:manage') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(category)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('categories:manage') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => openDeleteDialog(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                    <BookOpen className="h-3 w-3" />
                    {category.book_count || 0} {t('categories.books')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    category.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
                  }`}>
                    {category.is_active ? t('categories.active') : t('categories.inactive')}
                  </span>
                </div>
              </div>
            ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredCategories}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchCategories(); }}
          getRowId={(row) => row.id}
          emptyIcon={FolderTree}
          emptyTitle={t('categories.noCategories')}
          emptyDescription={t('categories.noCategoriesDesc')}
          emptyAction={hasPermission('categories:manage') ? {
            label: t('categories.addCategory'),
            icon: Plus,
            onClick: () => {
              setFormData({ name: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
              setShowAddDialog(true);
            },
          } : undefined}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.addNewCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('categories.categoryName')} *</Label>
              <Input
                placeholder={t('categories.enterCategoryName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('categories.enterDescription')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('classes.level')}</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={isAdmin ? t('categories.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('categories.primaryLevel') : t('categories.secondaryLevel')) : t('categories.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('categories.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('categories.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              {t('categories.addCategory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.editCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('categories.categoryName')} *</Label>
              <Input
                placeholder={t('categories.enterCategoryName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('categories.enterDescription')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('classes.level')}</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={isAdmin ? t('categories.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('categories.primaryLevel') : t('categories.secondaryLevel')) : t('categories.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('categories.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('categories.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteConfirmMessage', { name: selectedCategory?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedCategory && (selectedCategory.book_count || 0) > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <p className="text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {t('categories.hasBooks', { count: selectedCategory.book_count })}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
