import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, School, BadgeCheck, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { usePermissions } from '@/lib/permissions';
import api from '@/lib/api';
import { toast } from 'sonner';
import { type SchoolLevel, normalizeAssignedLevels } from '@/lib/teacher-levels';
import { PageHeader } from '@/components/ui-custom';

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
  homeroom_class_name?: string | null;
  level?: SchoolLevel | null;
  assigned_levels?: SchoolLevel[];
  created_at: string;
}

export function Teachers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get('/teachers');
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setIsError(true);
      toast.error(t('teachers.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    try {
      await api.delete(`/teachers/${teacherId}`);
      await fetchTeachers();
      setTeacherToDelete(null);
      toast.success(t('teachers.deleteSuccess'));
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast.error(error?.message || t('teachers.failedToDelete'));
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.teacher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (teacher.homeroom_class_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      normalizeAssignedLevels(teacher.assigned_levels, teacher.level || null).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);

  const columns: DataTableColumn<Teacher>[] = useMemo(() => [
    {
      key: 'name',
      header: t('teachers.teacher'),
      sortable: true,
      getValue: (row) => row.name,
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <PersonAvatar name={teacher.name} gender={teacher.gender || 'male'} className="h-10 w-10" />
          <span className="font-medium text-foreground">{teacher.name}</span>
        </div>
      ),
    },
    {
      key: 'teacher_id',
      header: t('teachers.teacherId'),
      sortable: true,
      render: (teacher) => (
        <span className="font-mono text-xs text-muted-foreground">{teacher.teacher_id}</span>
      ),
    },
    {
      key: 'assigned_levels',
      header: t('teachers.level'),
      sortable: true,
      getValue: (row) => normalizeAssignedLevels(row.assigned_levels, row.level || null).join(', '),
      render: (teacher) => {
        const assignedLevels = normalizeAssignedLevels(teacher.assigned_levels, teacher.level || null);
        return assignedLevels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedLevels.map((level) => (
              <Badge key={level} variant="outline" className="capitalize rounded-lg">
                {level}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: 'homeroom',
      header: t('teachers.homeroom'),
      sortable: true,
      getValue: (row) => row.homeroom_class_name || '',
      render: (teacher) =>
        teacher.is_homeroom_teacher ? (
          <Badge variant="outline" className="border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700">
            <BadgeCheck className="mr-1 h-3 w-3" />
            {teacher.homeroom_class_name || t('teachers.assigned')}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{t('common.no')}</span>
        ),
    },
    {
      key: 'created_at',
      header: t('teachers.created'),
      sortable: true,
      getValue: (row) => row.created_at,
      render: (teacher) => (
        <span className="text-muted-foreground text-xs">
          {new Date(teacher.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (teacher) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/teachers/${teacher.id}/view`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {hasPermission('teachers:edit') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/teachers/${teacher.id}`)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {hasPermission('teachers:delete') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              onClick={() => {
              setTeacherToDelete(teacher);
              setShowDeleteConfirm(true);
            }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [navigate, hasPermission, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('teachers.title')}
        description={t('teachers.manageSubtitle')}
        action={hasPermission('teachers:create') ? {
          label: t('teachers.addNewTeacher'),
          icon: Plus,
          onClick: () => navigate('/add-teacher'),
        } : undefined}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('teachers.searchTeachers')}
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
          : filteredTeachers.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <School className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('teachers.noTeachers')}</p>
              </div>
            )
          : filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-xl border bg-card p-4 shadow-sm cursor-pointer"
                onClick={() => navigate(`/teachers/${teacher.id}/view`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonAvatar name={teacher.name} gender={teacher.gender || 'male'} className="h-10 w-10 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{teacher.teacher_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/teachers/${teacher.id}/view`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {hasPermission('teachers:edit') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/teachers/${teacher.id}`)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('teachers:delete') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => { setTeacherToDelete(teacher); setShowDeleteConfirm(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeAssignedLevels(teacher.assigned_levels, teacher.level || null).map((level) => (
                    <Badge key={level} variant="outline" className="capitalize rounded-lg text-xs">{level}</Badge>
                  ))}
                  {teacher.is_homeroom_teacher && (
                    <Badge variant="outline" className="border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700 rounded-lg text-xs">
                      <BadgeCheck className="mr-1 h-3 w-3" />
                      {teacher.homeroom_class_name || t('teachers.assigned')}
                    </Badge>
                  )}
                </div>
              </div>
            ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredTeachers}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchTeachers(); }}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/teachers/${row.id}/view`)}
          emptyIcon={School}
          emptyTitle={t('teachers.noTeachers')}
          emptyDescription={t('teachers.noTeachersDesc')}
          emptyAction={hasPermission('teachers:create') ? {
            label: t('teachers.addNewTeacher'),
            icon: Plus,
            onClick: () => navigate('/add-teacher'),
          } : undefined}
        />
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teachers.deleteTeacher')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teachers.deleteConfirmMessage', { name: teacherToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (teacherToDelete) handleDelete(teacherToDelete.id); setShowDeleteConfirm(false); }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

