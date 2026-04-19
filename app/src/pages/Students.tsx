import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Users,
  Eye,
  X,
  Loader2
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
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui-custom';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions';
import { LazyBookCover } from '@/components/shared/LazyBookCover';

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

interface ClassItem {
  id: string;
  name: string;
}

const generateAvatar = (name: string, gender: string) => {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&gender=${gender}`;
};

export function Students() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRole = session?.user?.role ?? null;
  const isAdmin = userRole === 'admin';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master data
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    class_id: '',
    gender: 'male',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    parent_email: '',
    parent_phone: '',
    address: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error(t('students.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
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

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      await api.put(`/students/${selectedStudent.id}`, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        class_id: formData.class_id || null,
        gender: formData.gender,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        dob: formData.dob || null,
        nationality: formData.nationality.trim() || null,
        parent_email: formData.parent_email.trim() || null,
        parent_phone: formData.parent_phone.trim() || null,
        address: formData.address.trim() || null,
      });
      await fetchStudents();
      setShowEditDialog(false);
      setSelectedStudent(null);
      toast.success(t('students.updateSuccess'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('students.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/students/${selectedStudent.id}`);
      await fetchStudents();
      setShowDeleteDialog(false);
      setSelectedStudent(null);
      toast.success(t('students.deleteSuccess'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('students.failedToDelete'));
    } finally {
      setIsSubmitting(false);
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

  const openEditDialog = (student: StudentRecord) => {
    setSelectedStudent(student);
    setFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      class_id: student.class_id || '',
      gender: student.gender || 'male',
      email: student.email || '',
      phone: student.phone || '',
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      nationality: student.nationality || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
      address: student.address || '',
    });
    setShowEditDialog(true);
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
          <LazyBookCover
            src={student.avatar}
            fallbackSrc={generateAvatar(student.name, student.gender)}
            alt={student.name}
            containerClassName="h-10 w-10 rounded-full flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate max-w-[200px]">{student.name}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{student.student_id || student.admission_number}</div>
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
            onClick={() => openEditDialog(student)}
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
  ], [navigate, classes]);

  const renderStudentForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('students.firstName')}</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder={t('students.enterFirstName')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('students.lastName')}</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder={t('students.enterLastName')}
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('students.class')}</Label>
          <Select
            value={formData.class_id}
            onValueChange={(value) => setFormData({ ...formData, class_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={t('students.selectClass')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('students.gender')}</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('common.male')}</SelectItem>
              <SelectItem value="female">{t('common.female')}</SelectItem>
              <SelectItem value="other">{t('common.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('students.dateOfBirth')}</Label>
          <Input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('students.nationality')}</Label>
          <Input
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            placeholder="e.g., Tanzanian"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('students.email')}</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('students.enterEmail')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('students.phone')}</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder={t('students.enterPhone')}
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('students.parentEmail')}</Label>
          <Input
            type="email"
            value={formData.parent_email}
            onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
            placeholder={t('students.enterParentEmail')}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('students.parentPhoneLabel')}</Label>
          <Input
            value={formData.parent_phone}
            onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
            placeholder={t('students.enterParentPhone')}
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('students.address')}</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder={t('students.enterAddress')}
          className="rounded-xl h-11"
        />
      </div>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-foreground">{t('students.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('students.manageRegistrations', { count: filteredStudents.length })}
          </p>
        </div>
        <div className="flex gap-3">
          {selectedRows.size > 0 && hasPermission('students:delete') && (
            <Button 
              variant="destructive"
              className="rounded-xl h-11"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.size})
            </Button>
          )}
          {hasPermission('students:create') && (
          <Button 
            onClick={() => navigate('/add-student')}
            className="bg-navy hover:bg-navy/90 rounded-xl h-11"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('students.registerStudent')}
          </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-3 items-center"
      >
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
          <SelectTrigger className="w-[150px] h-11 rounded-xl">
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
          <SelectTrigger className="w-[130px] h-11 rounded-xl">
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
          <SelectTrigger className="w-[130px] h-11 rounded-xl">
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
            <SelectTrigger className="w-[130px] h-11 rounded-xl">
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
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DataTable
          data={filteredStudents}
          columns={columns}
          isLoading={isLoading}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/students/${row.id}`)}
          emptyIcon={Users}
          emptyTitle={t('students.noStudents')}
          emptyDescription={t('students.noStudentsDesc')}
        />
      </motion.div>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('students.editStudent')}</DialogTitle>
          </DialogHeader>
          {renderStudentForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleEditStudent} 
              className="bg-navy hover:bg-navy/90 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('students.deleteStudent')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('students.deleteConfirmMessage', { name: selectedStudent?.name })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDeleteStudent} variant="destructive" className="rounded-xl">
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
