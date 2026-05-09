import { useState, useMemo, useEffect } from 'react';
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
  const { hasPermission } = usePermissions();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
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
      setIsError(false);
      const { data } = await api.get('/subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setIsError(true);
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
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookMarked className="h-5 w-5 text-primary" />
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
          {hasPermission('subjects:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(subject)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('subjects:manage') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(subject)}
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
        title={t('subjects.title')}
        description={t('subjects.subtitle')}
        action={hasPermission('subjects:manage') ? {
          label: t('subjects.addSubject'),
          icon: Plus,
          onClick: () => {
            setFormData({ name: '', code: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
            setShowAddDialog(true);
          },
        } : undefined}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('subjects.searchSubjects')}
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
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.length}</p>
              <p className="text-sm text-muted-foreground">{t('subjects.totalSubjects')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-card p-5 shadow-card">
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
        <div className="rounded-lg bg-card p-5 shadow-card">
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
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-20" />
            ))
          : filteredSubjects.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <BookMarked className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('subjects.noSubjects')}</p>
              </div>
            )
          : filteredSubjects.map((subject) => (
              <div key={subject.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookMarked className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{subject.name}</p>
                      {subject.code && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">{subject.code}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {hasPermission('subjects:manage') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(subject)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('subjects:manage') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => openDeleteDialog(subject)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                    <BookOpen className="h-3 w-3" />
                    {subject.book_count || 0} {t('subjects.books')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subject.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700'
                  }`}>
                    {subject.is_active ? t('subjects.active') : t('subjects.inactive')}
                  </span>
                </div>
              </div>
            ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredSubjects}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchSubjects(); }}
          getRowId={(row) => row.id}
          emptyIcon={BookMarked}
          emptyTitle={t('subjects.noSubjects')}
          emptyDescription={t('subjects.noSubjectsDesc')}
          emptyAction={hasPermission('subjects:manage') ? {
            label: t('subjects.addSubject'),
            icon: Plus,
            onClick: () => {
              setFormData({ name: '', code: '', description: '', level: !isAdmin && userLevel ? userLevel : '' });
              setShowAddDialog(true);
            },
          } : undefined}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-lg max-w-md">
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
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 rounded-xl">
              {t('subjects.addSubject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-lg max-w-md">
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
            <AlertDialogTitle>{t('subjects.deleteSubject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('subjects.deleteConfirmMessage', { name: selectedSubject?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedSubject && (selectedSubject.book_count || 0) > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <p className="text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {t('subjects.hasBooks', { count: selectedSubject.book_count })}
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


