import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, School, BadgeCheck, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { usePermissions } from '@/lib/permissions';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
  homeroom_class_name?: string | null;
  created_at: string;
}

export function Teachers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/teachers');
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error(t('teachers.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    try {
      await api.delete(`/teachers/${teacherId}`);
      await fetchTeachers();
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
      (teacher.homeroom_class_name || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            onClick={() => navigate(`/teachers/${teacher.id}?mode=view`)}
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
              onClick={() => handleDelete(teacher.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [navigate, hasPermission]);

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
          <h1 className="text-2xl font-bold text-foreground">{t('teachers.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('teachers.manageSubtitle')}</p>
        </div>
        {hasPermission('teachers:create') && (
          <Button onClick={() => navigate('/add-teacher')} className="bg-navy hover:bg-navy/90 rounded-xl h-11">
            <Plus className="h-4 w-4 mr-2" />
            {t('teachers.addNewTeacher')}
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
            placeholder={t('teachers.searchTeachers')}
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
          data={filteredTeachers}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/teachers/${row.id}?mode=view`)}
          emptyIcon={School}
          emptyTitle={t('teachers.noTeachers')}
          emptyDescription={t('teachers.noTeachersDesc')}
        />
      </motion.div>
    </div>
  );
}
