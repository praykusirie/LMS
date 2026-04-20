import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin,
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
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/lib/permissions';

interface ShelfLocation {
  id: string;
  code: string;
  name: string;
  section: string;
  capacity: number;
  book_count: number;
  is_active: boolean;
  created_at: string;
}

export function ShelfLocations() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const [locations, setLocations] = useState<ShelfLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ShelfLocation | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    section: '',
    capacity: 100,
    level: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/shelf-locations');
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error(t('shelfLocations.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(l => 
      (l.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.section || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const handleAdd = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error(t('shelfLocations.codeNameRequired'));
      return;
    }

    try {
      await api.post('/shelf-locations', {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        section: formData.section.trim().toUpperCase() || null,
        capacity: formData.capacity,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchLocations();
      setShowAddDialog(false);
      setFormData({ code: '', name: '', section: '', capacity: 100, level: '' });
      toast.success(t('shelfLocations.addSuccess'));
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast.error(error?.message || t('shelfLocations.failedToAdd'));
    }
  };

  const handleEdit = async () => {
    if (!selectedLocation || !formData.code.trim() || !formData.name.trim()) {
      toast.error(t('shelfLocations.codeNameRequired'));
      return;
    }

    try {
      await api.put(`/shelf-locations/${selectedLocation.id}`, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        section: formData.section.trim().toUpperCase() || null,
        capacity: formData.capacity,
      });
      await fetchLocations();
      setShowEditDialog(false);
      setSelectedLocation(null);
      setFormData({ code: '', name: '', section: '', capacity: 100, level: '' });
      toast.success(t('shelfLocations.updateSuccess'));
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error(t('shelfLocations.failedToUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    try {
      await api.delete(`/shelf-locations/${selectedLocation.id}`);
      await fetchLocations();
      setShowDeleteDialog(false);
      setSelectedLocation(null);
      toast.success(t('shelfLocations.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error(t('shelfLocations.failedToDelete'));
    }
  };

  const openEditDialog = (location: ShelfLocation) => {
    setSelectedLocation(location);
    setFormData({ 
      code: location.code, 
      name: location.name, 
      section: location.section,
      capacity: location.capacity,
      level: (location as any).level || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (location: ShelfLocation) => {
    setSelectedLocation(location);
    setShowDeleteDialog(true);
  };

  const getCapacityColor = (book_count: number, capacity: number) => {
    const percentage = ((book_count || 0) / (capacity || 1)) * 100;
    if (percentage >= 90) return 'bg-red-50 dark:bg-red-950/300';
    if (percentage >= 70) return 'bg-amber-50 dark:bg-amber-950/300';
    return 'bg-green-50 dark:bg-green-950/300';
  };

  const columns: DataTableColumn<ShelfLocation>[] = useMemo(() => [
    {
      key: 'name',
      header: t('shelfLocations.location'),
      sortable: true,
      getValue: (row) => row.name,
      render: (location) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <MapPin className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground">{location.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: t('shelfLocations.code'),
      sortable: true,
      render: (location) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
          {location.code}
        </span>
      ),
    },
    {
      key: 'section',
      header: t('shelfLocations.section'),
      sortable: true,
      render: (location) => (
        <span className="font-medium">{location.section}</span>
      ),
    },
    {
      key: 'capacity',
      header: t('shelfLocations.capacity'),
      sortable: true,
      getValue: (row) => row.book_count || 0,
      render: (location) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-secondary rounded-full max-w-[100px]">
            <div 
              className={`h-2 rounded-full ${getCapacityColor(location.book_count, location.capacity)}`}
              style={{ width: `${Math.min(((location.book_count || 0) / (location.capacity || 1)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {location.book_count || 0}/{location.capacity}
          </span>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: t('common.status'),
      sortable: true,
      getValue: (row) => row.is_active ? 'Active' : 'Inactive',
      render: (location) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          location.is_active 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
        }`}>
          {location.is_active ? t('shelfLocations.active') : t('shelfLocations.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (location) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {hasPermission('shelf_locations:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(location)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('shelf_locations:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(location)}
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
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('shelfLocations.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('shelfLocations.subtitle')}
          </p>
        </div>
        {hasPermission('shelf_locations:manage') && (
        <Button 
          onClick={() => {
            setFormData({ code: '', name: '', section: '', capacity: 100, level: !isAdmin && userLevel ? userLevel : '' });
            setShowAddDialog(true);
          }}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('shelfLocations.addLocation')}
        </Button>
        )}
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
            placeholder={t('shelfLocations.searchLocations')}
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
              <MapPin className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.length}</p>
              <p className="text-sm text-muted-foreground">{t('shelfLocations.totalLocations')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(locations.map(l => l.section)).size}</p>
              <p className="text-sm text-muted-foreground">{t('shelfLocations.sections')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.reduce((sum, l) => sum + (l.book_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">{t('shelfLocations.booksStored')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.reduce((sum, l) => sum + l.capacity, 0)}</p>
              <p className="text-sm text-muted-foreground">{t('shelfLocations.totalCapacity')}</p>
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
          data={filteredLocations}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={MapPin}
          emptyTitle={t('shelfLocations.noLocations')}
          emptyDescription={t('shelfLocations.noLocationsDesc')}
        />
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shelfLocations.addNewLocation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shelfLocations.locationCode')} *</Label>
                <Input
                  placeholder={t('shelfLocations.enterLocationCode')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('shelfLocations.section')}</Label>
                <Input
                  placeholder={t('shelfLocations.enterSection')}
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('shelfLocations.locationName')} *</Label>
              <Input
                placeholder={t('shelfLocations.enterLocationName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('shelfLocations.capacity')}</Label>
              <Input
                type="number"
                placeholder={t('shelfLocations.enterCapacity')}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
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
                  <SelectValue placeholder={isAdmin ? t('shelfLocations.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('shelfLocations.primaryLevel') : t('shelfLocations.secondaryLevel')) : t('shelfLocations.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('shelfLocations.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('shelfLocations.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              {t('shelfLocations.addLocation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shelfLocations.editLocationTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shelfLocations.locationCode')} *</Label>
                <Input
                  placeholder={t('shelfLocations.enterLocationCode')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('shelfLocations.section')}</Label>
                <Input
                  placeholder={t('shelfLocations.enterSection')}
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('shelfLocations.locationName')} *</Label>
              <Input
                placeholder={t('shelfLocations.enterLocationName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('shelfLocations.capacity')}</Label>
              <Input
                type="number"
                placeholder={t('shelfLocations.enterCapacity')}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
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
                  <SelectValue placeholder={isAdmin ? t('shelfLocations.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('shelfLocations.primaryLevel') : t('shelfLocations.secondaryLevel')) : t('shelfLocations.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('shelfLocations.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('shelfLocations.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit} className="bg-navy hover:bg-navy/90 rounded-xl">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shelfLocations.deleteLocationTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('shelfLocations.deleteConfirmMessage', { name: selectedLocation?.name })}
            </p>
            {selectedLocation && (selectedLocation.book_count || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {t('shelfLocations.hasBooks', { count: selectedLocation.book_count })}
                </p>
              </div>
            )}
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
