import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  GraduationCap,
  CheckCircle2,
  AlertCircle
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

interface ClassItem {
  id: string;
  name: string;
  description: string;
  student_count: number;
  is_active: boolean;
  created_at: string;
}

export function Classes() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';
  const { t } = useTranslation();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(t('classes.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error(t('classes.nameRequired'));
      return;
    }

    try {
      await api.post('/classes', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchClasses();
      setShowAddDialog(false);
      setFormData({ name: '', description: '', level: '' });
      toast.success(t('classes.addSuccess'));
    } catch (error: any) {
      console.error('Error adding class:', error);
      toast.error(error?.message || t('classes.failedToAdd'));
    }
  };

  const handleEdit = async () => {
    if (!selectedClass || !formData.name.trim()) {
      toast.error(t('classes.nameRequired'));
      return;
    }

    try {
      await api.put(`/classes/${selectedClass.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchClasses();
      setShowEditDialog(false);
      setSelectedClass(null);
      setFormData({ name: '', description: '', level: '' });
      toast.success(t('classes.updateSuccess'));
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error(t('classes.failedToUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;

    try {
      await api.delete(`/classes/${selectedClass.id}`);
      await fetchClasses();
      setShowDeleteDialog(false);
      setSelectedClass(null);
      toast.success(t('classes.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error(t('classes.failedToDelete'));
    }
  };

  const openEditDialog = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setFormData({ name: classItem.name, description: classItem.description, level: (classItem as any).level || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setShowDeleteDialog(true);
  };

  const columns: DataTableColumn<ClassItem>[] = useMemo(() => [
    {
      key: 'name',
      header: t('classes.className'),
      sortable: true,
      getValue: (row) => row.name,
      render: (classItem) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground">{classItem.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('common.description'),
      sortable: true,
      getValue: (row) => row.description,
      render: (classItem) => (
        <span className="text-muted-foreground">{classItem.description || '-'}</span>
      ),
    },
    {
      key: 'student_count',
      header: t('classes.students'),
      sortable: true,
      getValue: (row) => row.student_count || 0,
      render: (classItem) => (
        <span className="font-medium">{classItem.student_count || 0}</span>
      ),
    },
    {
      key: 'is_active',
      header: t('common.status'),
      sortable: true,
      getValue: (row) => row.is_active ? 'Active' : 'Inactive',
      render: (classItem) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          classItem.is_active 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
        }`}>
          {classItem.is_active ? t('classes.active') : t('classes.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (classItem) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(classItem)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(classItem)}
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
          <h1 className="text-2xl font-bold text-foreground">{t('classes.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('classes.subtitle')}
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
          {t('classes.addClass')}
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
            placeholder={t('classes.searchClasses')}
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
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classes.length}</p>
              <p className="text-sm text-muted-foreground">{t('classes.totalClasses')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classes.filter(c => c.is_active).length}</p>
              <p className="text-sm text-muted-foreground">{t('classes.activeClasses')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classes.reduce((sum, c) => sum + (c.student_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">{t('classes.totalStudents')}</p>
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
          data={filteredClasses}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={GraduationCap}
          emptyTitle={t('classes.noClasses')}
          emptyDescription={t('classes.noClassesDesc')}
        />
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('classes.addNewClass')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('classes.className')} *</Label>
              <Input
                placeholder={t('classes.enterClassName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('classes.enterDescription')}
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
                  <SelectValue placeholder={isAdmin ? t('classes.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('classes.primaryLevel') : t('classes.secondaryLevel')) : t('classes.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('classes.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('classes.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              {t('classes.addClass')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('classes.editClass')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('classes.className')} *</Label>
              <Input
                placeholder={t('classes.enterClassName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('classes.enterDescription')}
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
                  <SelectValue placeholder={isAdmin ? t('classes.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('classes.primaryLevel') : t('classes.secondaryLevel')) : t('classes.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('classes.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('classes.secondaryLevel')}</SelectItem>
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
            <DialogTitle>{t('classes.deleteClass')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('classes.deleteConfirmMessage', { name: selectedClass?.name })}
            </p>
            {selectedClass && (selectedClass.student_count || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {t('classes.hasStudents', { count: selectedClass.student_count })}
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
