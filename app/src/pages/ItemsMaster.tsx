import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  Search, 
  Edit2, 
  Trash2, 
  Plus,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

interface Item {
  id: string;
  name: string;
  description: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export function ItemsMaster() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', unit: 'pcs', level: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get('/items');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      setIsError(true);
      toast.error(t('items.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      await api.post('/items', {
        name: formData.name,
        description: formData.description,
        unit: formData.unit,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchItems();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success(t('items.createSuccess'));
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error(error?.message || t('items.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem || !formData.name) return;
    setIsSubmitting(true);
    try {
      await api.put(`/items/${selectedItem.id}`, formData);
      await fetchItems();
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      resetForm();
      toast.success(t('items.updateSuccess'));
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(t('items.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/items/${selectedItem.id}`);
      await fetchItems();
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast.success(t('items.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(t('items.failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', unit: 'pcs', level: '' });
  };

  const openEditDialog = (item: Item) => {
    setSelectedItem(item);
    setFormData({ name: item.name, description: item.description || '', unit: item.unit || 'pcs', level: (item as any).level || '' });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (item: Item) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const columns: DataTableColumn<Item>[] = useMemo(() => [
    {
      key: 'name',
      header: t('items.itemName'),
      sortable: true,
      getValue: (row) => row.name,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium text-foreground">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('items.description'),
      sortable: true,
      getValue: (row) => row.description,
      render: (item) => (
        <span className="text-muted-foreground max-w-[300px] truncate block">{item.description || '-'}</span>
      ),
    },
    {
      key: 'unit',
      header: t('items.unit'),
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
          {item.unit}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('items.created'),
      sortable: true,
      getValue: (row) => row.created_at,
      render: (item) => (
        <span className="text-muted-foreground text-xs">
          {new Date(item.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('items.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {hasPermission('items:edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('items:delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(item)}
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
        title={t('items.title')}
        description={t('items.subtitle')}
        action={hasPermission('items:create') ? {
          label: t('items.addItem'),
          icon: Plus,
          onClick: () => { resetForm(); if (!isAdmin && userLevel) setFormData(prev => ({ ...prev, level: userLevel })); setIsCreateDialogOpen(true); },
        } : undefined}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('items.searchItems')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-20" />
            ))
          : filteredItems.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('items.noItems')}</p>
              </div>
            )
          : filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description || t('common.noDescription')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {hasPermission('items:edit') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('items:delete') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => openDeleteDialog(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
                    {item.unit}
                  </span>
                </div>
              </div>
            ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredItems}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchItems(); }}
          getRowId={(row) => row.id}
          emptyIcon={Package}
          emptyTitle={t('items.noItems')}
          emptyDescription={t('items.noItemsDesc')}
          emptyAction={hasPermission('items:create') ? {
            label: t('items.addItem'),
            icon: Plus,
            onClick: () => { resetForm(); if (!isAdmin && userLevel) setFormData(prev => ({ ...prev, level: userLevel })); setIsCreateDialogOpen(true); },
          } : undefined}
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('items.createItemTitle')}</DialogTitle>
            <DialogDescription>{t('items.createItemDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('items.itemName')}</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('items.namePlaceholder')} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('items.description')}</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('items.descriptionPlaceholder')} className="rounded-xl resize-none" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('items.unit')}</Label>
              <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder={t('items.unitPlaceholder')} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>{t('items.level')}</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={isAdmin ? t('items.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : t('items.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('items.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('items.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formData.name} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {t('items.createItem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('items.editItemTitle')}</DialogTitle>
            <DialogDescription>{t('items.editItemDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('items.itemName')}</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('items.description')}</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl resize-none" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">{t('items.unit')}</Label>
              <Input id="edit-unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>{t('items.level')}</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={isAdmin ? t('items.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : t('items.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('items.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('items.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name} className="bg-primary hover:bg-primary/90">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deleteItemTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deleteConfirm', { name: selectedItem?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('items.deleteItem')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
