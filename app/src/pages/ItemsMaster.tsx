import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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

interface Item {
  id: string;
  name: string;
  description: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export function ItemsMaster() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
      const { data } = await api.get('/items');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
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
      toast.success('Item created successfully');
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error(error?.message || 'Failed to create item');
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
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
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
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
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
      header: 'Item Name',
      sortable: true,
      getValue: (row) => row.name,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <Package className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      getValue: (row) => row.description,
      render: (item) => (
        <span className="text-muted-foreground max-w-[300px] truncate block">{item.description || '-'}</span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
          {item.unit}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
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
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(item)}
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
          <h1 className="text-2xl font-bold text-foreground">Items Master</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage library inventory items
          </p>
        </div>
        <Button onClick={() => { resetForm(); if (!isAdmin && userLevel) setFormData(prev => ({ ...prev, level: userLevel })); setIsCreateDialogOpen(true); }} className="bg-navy hover:bg-navy/90 rounded-xl h-11">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
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
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <DataTable
          data={filteredItems}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={Package}
          emptyTitle="No items found"
          emptyDescription="Add your first item to get started."
        />
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>Add a new item to the inventory catalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Textbook - Mathematics" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Item description..." className="rounded-xl resize-none" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g., pcs, box" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl">
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formData.name} className="bg-navy hover:bg-navy/90">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update item details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl resize-none" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input id="edit-unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={isAdmin ? formData.level : (userLevel || '')}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger className="rounded-xl">
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name} className="bg-navy hover:bg-navy/90">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
