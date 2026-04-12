import { useState, useMemo, useEffect, useCallback } from 'react';
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
  const navigate = useNavigate();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
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
      toast.error('Failed to fetch students');
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
      toast.success('Student updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update student');
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
      toast.success('Student deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete student');
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
      toast.success(`Deleted ${selectedRows.size} students`);
    } catch (error: any) {
      toast.error('Failed to delete some students');
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
      header: 'Student',
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
      header: 'ID',
      sortable: true,
      render: (student) => (
        <span className="text-muted-foreground font-mono text-xs">{student.student_id || student.admission_number}</span>
      ),
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      getValue: (row) => row.class_name,
      render: (student) => (
        <span className="text-muted-foreground">{student.class_name || '-'}</span>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      sortable: true,
      render: (student) => (
        <span className="text-muted-foreground capitalize">{student.gender}</span>
      ),
    },
    {
      key: 'active_borrows',
      header: 'Active Borrows',
      sortable: true,
      render: (student) => (
        <Badge variant={student.active_borrows > 0 ? 'default' : 'secondary'} className="rounded-lg">
          {student.active_borrows}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (student) => (
        <StatusBadge status={student.is_active ? 'active' : 'inactive'}>
          {student.is_active ? 'Active' : 'Inactive'}
        </StatusBadge>
      ),
    },
    {
      key: 'level',
      header: 'Level',
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
      header: 'Action',
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(student)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => { setSelectedStudent(student); setShowDeleteDialog(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [navigate, classes]);

  const renderStudentForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="Enter first name"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Enter last name"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select
            value={formData.class_id}
            onValueChange={(value) => setFormData({ ...formData, class_id: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Nationality</Label>
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
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Parent Email</Label>
          <Input
            type="email"
            value={formData.parent_email}
            onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
            placeholder="Enter parent email"
            className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Parent Phone</Label>
          <Input
            value={formData.parent_phone}
            onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
            placeholder="Enter parent phone"
            className="rounded-xl h-11"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter address"
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
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student registrations ({filteredStudents.length} students)
          </p>
        </div>
        <div className="flex gap-3">
          {selectedRows.size > 0 && (
            <Button 
              variant="destructive"
              className="rounded-xl h-11"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.size})
            </Button>
          )}
          <Button 
            onClick={() => navigate('/add-student')}
            className="bg-navy hover:bg-navy/90 rounded-xl h-11"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register Student
          </Button>
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
            placeholder="Search by name or ID..."
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
            <SelectItem value="all">All Classes</SelectItem>
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
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-11 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[130px] h-11 rounded-xl">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear
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
          emptyTitle="No students found"
          emptyDescription="Try adjusting your search or filters, or register a new student."
        />
      </motion.div>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {renderStudentForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleEditStudent} 
              className="bg-navy hover:bg-navy/90 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{selectedStudent?.name}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleDeleteStudent} variant="destructive" className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
