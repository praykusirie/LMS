import { useState, useMemo, useEffect } from 'react';
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
  const [isError, setIsError] = useState(false);
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
      setIsError(false);
      const { data } = await api.get('/shelf-locations');
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setIsError(true);
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
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-400';
    return 'bg-green-500';
  };

  const columns: DataTableColumn<ShelfLocation>[] = useMemo(() => [
    {
      key: 'name',
      header: t('shelfLocations.location'),
      sortable: true,
      getValue: (row) => row.name,
      render: (location) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
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
      <PageHeader
        title={t('shelfLocations.title')}
        description={t('shelfLocations.subtitle')}
        action={hasPermission('shelf_locations:manage') ? {
          label: t('shelfLocations.addLocation'),
          icon: Plus,
          onClick: () => {
            setFormData({ code: '', name: '', section: '', capacity: 100, level: !isAdmin && userLevel ? userLevel : '' });
            setShowAddDialog(true);
          },
        } : undefined}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('shelfLocations.searchLocations')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.length}</p>
              <p className="text-sm text-muted-foreground">{t('shelfLocations.totalLocations')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-card p-5 shadow-card">
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
        <div className="rounded-lg bg-card p-5 shadow-card">
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
        <div className="rounded-lg bg-card p-5 shadow-card">
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
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-24" />
            ))
          : filteredLocations.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('shelfLocations.noLocations')}</p>
              </div>
            )
          : filteredLocations.map((location) => {
              const pct = Math.min(((location.book_count || 0) / (location.capacity || 1)) * 100, 100);
              return (
                <div key={location.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{location.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">{location.code}</span>
                          {location.section && <span className="text-xs text-muted-foreground">{location.section}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {hasPermission('shelf_locations:manage') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(location)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('shelf_locations:manage') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => openDeleteDialog(location)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('shelfLocations.capacity')}</span>
                      <span className="font-medium">{location.book_count || 0}/{location.capacity}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full">
                      <div
                        className={`h-1.5 rounded-full ${getCapacityColor(location.book_count, location.capacity)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      location.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
                    }`}>
                      {location.is_active ? t('shelfLocations.active') : t('shelfLocations.inactive')}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredLocations}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchLocations(); }}
          getRowId={(row) => row.id}
          emptyIcon={MapPin}
          emptyTitle={t('shelfLocations.noLocations')}
          emptyDescription={t('shelfLocations.noLocationsDesc')}
          emptyAction={hasPermission('shelf_locations:manage') ? {
            label: t('shelfLocations.addLocation'),
            icon: Plus,
            onClick: () => {
              setFormData({ code: '', name: '', section: '', capacity: 100, level: !isAdmin && userLevel ? userLevel : '' });
              setShowAddDialog(true);
            },
          } : undefined}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-lg max-w-md">
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
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 rounded-xl">
              {t('shelfLocations.addLocation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-lg max-w-md">
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
            <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90 rounded-xl">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shelfLocations.deleteLocationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shelfLocations.deleteConfirmMessage', { name: selectedLocation?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedLocation && (selectedLocation.book_count || 0) > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <p className="text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {t('shelfLocations.hasBooks', { count: selectedLocation.book_count })}
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


