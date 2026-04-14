import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  BookMarked,
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

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  book_count: number;
  is_active: boolean;
  created_at: string;
}

export function Subjects() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';
  const { t } = useTranslation();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error(t('subjects.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subjects, searchQuery]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error(t('subjects.nameRequired'));
      return;
    }

    try {
      await api.post('/subjects', {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        level: isAdmin ? (formData.level || null) : userLevel,
      });
      await fetchSubjects();
      setShowAddDialog(false);
      setFormData({ name: '', code: '', description: '', level: '' });
      toast.success(t('subjects.addSuccess'));
    } catch (error: any) {
      console.error('Error adding subject:', error);
      toast.error(error?.message || t('subjects.failedToAdd'));
    }
  };

  const handleEdit = async () => {
    if (!selectedSubject || !formData.name.trim()) {
      toast.error(t('subjects.nameRequired'));
      return;
    }

    try {
      await api.put(`/subjects/${selectedSubject.id}`, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
      });
      await fetchSubjects();
      setShowEditDialog(false);
      setSelectedSubject(null);
      setFormData({ name: '', code: '', description: '', level: '' });
      toast.success(t('subjects.updateSuccess'));
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error(t('subjects.failedToUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;

    try {
      await api.delete(`/subjects/${selectedSubject.id}`);
      await fetchSubjects();
      setShowDeleteDialog(false);
      setSelectedSubject(null);
      toast.success(t('subjects.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error(t('subjects.failedToDelete'));
    }
  };

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({ name: subject.name, code: subject.code, description: subject.description, level: (subject as any).level || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteDialog(true);
  };

  const columns: DataTableColumn<Subject>[] = useMemo(() => [
    {
      key: 'name',
      header: t('subjects.subject'),
      sortable: true,
      getValue: (row) => row.name,
      render: (subject) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <BookMarked className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground">{subject.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: t('subjects.code'),
      sortable: true,
      render: (subject) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
          {subject.code}
        </span>
      ),
    },
    {
      key: 'description',
      header: t('common.description'),
      sortable: true,
      getValue: (row) => row.description,
      render: (subject) => (
        <span className="text-muted-foreground">{subject.description || '-'}</span>
      ),
    },
    {
      key: 'book_count',
      header: t('subjects.books'),
      sortable: true,
      getValue: (row) => row.book_count || 0,
      render: (subject) => (
        <span className="font-medium">{subject.book_count || 0}</span>
      ),
    },
    {
      key: 'is_active',
      header: t('common.status'),
      sortable: true,
      getValue: (row) => row.is_active ? 'Active' : 'Inactive',
      render: (subject) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          subject.is_active 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
        }`}>
          {subject.is_active ? t('subjects.active') : t('subjects.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (subject) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(subject)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(subject)}
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
          <h1 className="text-2xl font-bold text-foreground">{t('subjects.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subjects.subtitle')}
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', code: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
            setShowAddDialog(true);
          }}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('subjects.addSubject')}
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
            placeholder={t('subjects.searchSubjects')}
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
              <BookMarked className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.length}</p>
              <p className="text-sm text-muted-foreground">{t('subjects.totalSubjects')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.filter(s => s.is_active).length}</p>
              <p className="text-sm text-muted-foreground">{t('subjects.activeSubjects')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.reduce((sum, s) => sum + (s.book_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">{t('subjects.totalBooks')}</p>
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
          data={filteredSubjects}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={BookMarked}
          emptyTitle={t('subjects.noSubjects')}
          emptyDescription={t('subjects.noSubjectsDesc')}
        />
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('subjects.addNewSubject')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('subjects.subjectName')} *</Label>
              <Input
                placeholder={t('subjects.enterSubjectName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('subjects.subjectCode')}</Label>
              <Input
                placeholder={t('subjects.enterSubjectCode')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('subjects.enterDescription')}
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
                  <SelectValue placeholder={isAdmin ? t('subjects.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('subjects.primaryLevel') : t('subjects.secondaryLevel')) : t('subjects.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('subjects.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('subjects.secondaryLevel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              {t('subjects.addSubject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('subjects.editSubject')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('subjects.subjectName')} *</Label>
              <Input
                placeholder={t('subjects.enterSubjectName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('subjects.subjectCode')}</Label>
              <Input
                placeholder={t('subjects.enterSubjectCode')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                placeholder={t('subjects.enterDescription')}
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
                  <SelectValue placeholder={isAdmin ? t('subjects.selectLevel') : (userLevel ? (userLevel === 'primary' ? t('subjects.primaryLevel') : t('subjects.secondaryLevel')) : t('subjects.noLevel'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('subjects.primaryLevel')}</SelectItem>
                  <SelectItem value="secondary">{t('subjects.secondaryLevel')}</SelectItem>
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
            <DialogTitle>{t('subjects.deleteSubject')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('subjects.deleteConfirmMessage', { name: selectedSubject?.name })}
            </p>
            {selectedSubject && (selectedSubject.book_count || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {t('subjects.hasBooks', { count: selectedSubject.book_count })}
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
