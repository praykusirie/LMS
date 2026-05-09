import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Users,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui-custom';
import { PageHeader } from '@/components/ui-custom';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions';

interface StudentRecord {
  id: string;
  student_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  admission_number: string;
  class_id: string | null;
  class_name: string | null;
  gender: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  nationality: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  address: string | null;
  avatar: string | null;
  level: string | null;
  is_active: boolean;
  created_at: string;
  active_borrows: number;
}


export function Students() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRole = session?.user?.role ?? null;
  const isAdmin = userRole === 'admin';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Delete dialog only
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  // Master data

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setIsError(true);
      toast.error(t('students.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchQuery ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.student_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.last_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClass = classFilter === 'all' || student.class_name === classFilter;
      const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' ? student.is_active : !student.is_active);
      const matchesLevel = levelFilter === 'all' || student.level === levelFilter;
      
      return matchesSearch && matchesClass && matchesGender && matchesStatus && matchesLevel;
    });
  }, [students, searchQuery, classFilter, genderFilter, statusFilter, levelFilter]);

  const classNames = [...new Set(students.map(s => s.class_name).filter(Boolean))] as string[];
  const hasActiveFilters = classFilter !== 'all' || genderFilter !== 'all' || statusFilter !== 'all' || levelFilter !== 'all';

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await api.delete(`/students/${selectedStudent.id}`);
      await fetchStudents();
      setShowDeleteDialog(false);
      setSelectedStudent(null);
      toast.success(t('students.deleteSuccess'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('students.failedToDelete'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedRows).map(id => api.delete(`/students/${id}`))
      );
      await fetchStudents();
      setSelectedRows(new Set());
      toast.success(t('students.bulkDeleteSuccess', { count: selectedRows.size }));
    } catch (error: any) {
      toast.error(t('students.failedToDeleteSome'));
    }
  };

  const clearFilters = () => {
    setClassFilter('all');
    setGenderFilter('all');
    setStatusFilter('all');
    setLevelFilter('all');
    setSearchQuery('');
  };

  // Table columns
  const columns: DataTableColumn<StudentRecord>[] = useMemo(() => [
    {
      key: 'name',
      header: t('students.student'),
      sortable: true,
      getValue: (row) => row.name,
      render: (student) => (
        <div className="flex items-center gap-3">
          <PersonAvatar name={student.name} gender={(student.gender as 'male' | 'female') || 'male'} className="h-10 w-10 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]">{student.name}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{student.student_id || student.admission_number}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'student_id',
      header: t('students.id'),
      sortable: true,
      render: (student) => (
        <span className="text-muted-foreground font-mono text-xs">{student.student_id || student.admission_number}</span>
      ),
    },
    {
      key: 'class_name',
      header: t('students.class'),
      sortable: true,
      getValue: (row) => row.class_name,
      render: (student) => (
        <span className="text-muted-foreground">{student.class_name || '-'}</span>
      ),
    },
    {
      key: 'gender',
      header: t('students.gender'),
      sortable: true,
      render: (student) => (
        <span className="text-muted-foreground capitalize">{student.gender}</span>
      ),
    },
    {
      key: 'active_borrows',
      header: t('students.activeBorrows'),
      sortable: true,
      render: (student) => (
        <Badge variant={student.active_borrows > 0 ? 'default' : 'secondary'} className="rounded-lg">
          {student.active_borrows}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: t('common.status'),
      sortable: true,
      render: (student) => (
        <StatusBadge status={student.is_active ? 'active' : 'inactive'}>
          {student.is_active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'level',
      header: t('students.level'),
      sortable: true,
      render: (student) => (
        student.level ? (
          <Badge variant="outline" className="rounded-lg capitalize">
            {student.level}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'actions',
      header: t('students.action'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (student) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/students/${student.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {hasPermission('students:edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/students/${student.id}/edit`)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('students:delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => { setSelectedStudent(student); setShowDeleteDialog(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          )}
        </div>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('students.title')}
        description={t('students.manageRegistrations', { count: filteredStudents.length })}
        action={hasPermission('students:create') ? {
          label: t('students.registerStudent'),
          icon: Plus,
          onClick: () => navigate('/add-student'),
        } : undefined}
        secondaryActions={selectedRows.size > 0 && hasPermission('students:delete') ? (
          <Button
            variant="destructive"
            className="rounded-xl h-11"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedRows.size})
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('students.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-11 rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allClasses')}</SelectItem>
            {classNames.map(cls => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-11 rounded-xl">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allGenders')}</SelectItem>
            <SelectItem value="male">{t('common.male')}</SelectItem>
            <SelectItem value="female">{t('common.female')}</SelectItem>
            <SelectItem value="other">{t('common.other')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-11 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allStatus')}</SelectItem>
            <SelectItem value="active">{t('common.active')}</SelectItem>
            <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-11 rounded-xl">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('students.allLevels')}</SelectItem>
              <SelectItem value="primary">{t('students.primary')}</SelectItem>
              <SelectItem value="secondary">{t('students.secondary')}</SelectItem>
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-24" />
            ))
          : filteredStudents.length === 0
          ? (
              <div className="rounded-xl border border-dashed bg-card/70 px-6 py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">{t('students.noStudents')}</p>
              </div>
            )
          : filteredStudents.map((student) => (
              <div
                key={student.id}
                className="rounded-xl border bg-card p-4 shadow-sm cursor-pointer"
                onClick={() => navigate(`/students/${student.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonAvatar name={student.name} gender={(student.gender as 'male' | 'female') || 'male'} className="h-10 w-10 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.student_id || student.admission_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/students/${student.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {hasPermission('students:edit') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/students/${student.id}/edit`)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('students:delete') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => { setSelectedStudent(student); setShowDeleteDialog(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {student.class_name && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium">{student.class_name}</span>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{student.gender}</span>
                  {student.active_borrows > 0 && (
                    <Badge variant="default" className="rounded-lg text-xs">{student.active_borrows} borrow{student.active_borrows > 1 ? 's' : ''}</Badge>
                  )}
                  <StatusBadge status={student.is_active ? 'active' : 'inactive'}>
                    {student.is_active ? t('common.active') : t('common.inactive')}
                  </StatusBadge>
                </div>
              </div>
            ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredStudents}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchStudents(); }}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/students/${row.id}`)}
          emptyIcon={Users}
          emptyTitle={t('students.noStudents')}
          emptyDescription={t('students.noStudentsDesc')}
          emptyAction={hasPermission('students:create') ? {
            label: t('students.registerStudent'),
            icon: Plus,
            onClick: () => navigate('/add-student'),
          } : undefined}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteStudent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteConfirmMessage', { name: selectedStudent?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
