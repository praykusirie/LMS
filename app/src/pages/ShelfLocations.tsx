import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  MapPin,
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

const API_BASE = 'http://localhost:8080/api';

export function ShelfLocations() {
  const [locations, setLocations] = useState<ShelfLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ShelfLocation | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    section: '',
    capacity: 100
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/shelf-locations`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      showNotification('error', 'Failed to fetch locations');
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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification('error', 'Code and name are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/shelf-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          section: formData.section.trim().toUpperCase() || null,
          capacity: formData.capacity,
        }),
      });

      if (response.ok) {
        await fetchLocations();
        setShowAddDialog(false);
        setFormData({ code: '', name: '', section: '', capacity: 100 });
        showNotification('success', 'Shelf location added successfully');
      } else {
        showNotification('error', 'Failed to add location');
      }
    } catch (error) {
      console.error('Error adding location:', error);
      showNotification('error', 'Failed to add location');
    }
  };

  const handleEdit = async () => {
    if (!selectedLocation || !formData.code.trim() || !formData.name.trim()) {
      showNotification('error', 'Code and name are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/shelf-locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          section: formData.section.trim().toUpperCase() || null,
          capacity: formData.capacity,
        }),
      });

      if (response.ok) {
        await fetchLocations();
        setShowEditDialog(false);
        setSelectedLocation(null);
        setFormData({ code: '', name: '', section: '', capacity: 100 });
        showNotification('success', 'Shelf location updated successfully');
      } else {
        showNotification('error', 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      showNotification('error', 'Failed to update location');
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    try {
      const response = await fetch(`${API_BASE}/shelf-locations/${selectedLocation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchLocations();
        setShowDeleteDialog(false);
        setSelectedLocation(null);
        showNotification('success', 'Shelf location deleted successfully');
      } else {
        showNotification('error', 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      showNotification('error', 'Failed to delete location');
    }
  };

  const openEditDialog = (location: ShelfLocation) => {
    setSelectedLocation(location);
    setFormData({ 
      code: location.code, 
      name: location.name, 
      section: location.section,
      capacity: location.capacity 
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
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
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
          <h1 className="text-2xl font-bold text-foreground">Shelf Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage library shelf locations and sections
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ code: '', name: '', section: '', capacity: 100 });
            setShowAddDialog(true);
          }}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Location
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
            placeholder="Search locations..."
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
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
              <MapPin className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.length}</p>
              <p className="text-sm text-muted-foreground">Total Locations</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(locations.map(l => l.section)).size}</p>
              <p className="text-sm text-muted-foreground">Sections</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.reduce((sum, l) => sum + (l.book_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Books Stored</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.reduce((sum, l) => sum + l.capacity, 0)}</p>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
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
        ) : filteredLocations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No shelf locations found"
            description="Add your first shelf location to get started."
            actionLabel="Add Location"
            onAction={() => setShowAddDialog(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Section
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Capacity
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
                {filteredLocations.map((location) => (
                  <tr 
                    key={location.id} 
                    className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-navy" />
                        </div>
                        <span className="font-medium text-foreground">{location.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
                        {location.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {location.section}
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => openEditDialog(location)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(location)}
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
            <DialogTitle>Add New Shelf Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location Code *</Label>
                <Input
                  placeholder="e.g., A-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., A"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location Name *</Label>
              <Input
                placeholder="e.g., Fiction Section A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                placeholder="e.g., 200"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shelf Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location Code *</Label>
                <Input
                  placeholder="e.g., A-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., A"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location Name *</Label>
              <Input
                placeholder="e.g., Fiction Section A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                placeholder="e.g., 200"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
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
            <DialogTitle>Delete Shelf Location</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedLocation?.name}</span>? 
              This action cannot be undone.
            </p>
            {selectedLocation && (selectedLocation.book_count || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This location has {selectedLocation.book_count} books stored.
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
