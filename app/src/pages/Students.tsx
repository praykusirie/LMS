import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Users,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, EmptyState } from '@/components/ui-custom';
import { students as mockStudents, borrowRecords } from '@/data/mockData';
import type { Student } from '@/types';

interface StudentsProps {
  onNavigate?: (page: string) => void;
}

export function Students({ onNavigate }: StudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudents(mockStudents);
      setIsLoading(false);
    };
    loadStudents();
  }, []);

  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    admissionNumber: '',
    class: '',
    gender: 'male',
    email: '',
    phone: ''
  });

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClass = classFilter === 'all' || student.class === classFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' ? student.isActive : !student.isActive);
      
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, classFilter, statusFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const classes = [...new Set(students.map(s => s.class))];

  const generateAvatar = (name: string, gender: string) => {
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&gender=${gender}`;
  };

  const handleAddStudent = () => {
    const newStudent: Student = {
      id: `s${Date.now()}`,
      name: formData.name || '',
      admissionNumber: formData.admissionNumber || '',
      class: formData.class || '',
      gender: formData.gender as 'male' | 'female' | 'other',
      avatar: generateAvatar(formData.name || '', formData.gender || 'male'),
      email: formData.email,
      phone: formData.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      borrowHistory: [],
      currentBorrows: [],
      overdueCount: 0
    };
    setStudents([newStudent, ...students]);
    setShowAddDialog(false);
    setFormData({
      name: '',
      admissionNumber: '',
      class: '',
      gender: 'male',
      email: '',
      phone: ''
    });
  };

  const handleEditStudent = () => {
    if (!selectedStudent) return;
    setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, ...formData } : s));
    setShowEditDialog(false);
    setSelectedStudent(null);
  };

  const handleDeleteStudent = () => {
    if (!selectedStudent) return;
    setStudents(students.filter(s => s.id !== selectedStudent.id));
    setShowDeleteDialog(false);
    setSelectedStudent(null);
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData(student);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteDialog(true);
  };

  const openProfileDialog = (student: Student) => {
    setSelectedStudent(student);
    setShowProfileDialog(true);
  };

  const getStudentBorrows = (studentId: string) => {
    return borrowRecords.filter(r => r.studentId === studentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student registrations and borrowing
          </p>
        </div>
        <Button 
          onClick={() => onNavigate?.('add-student')}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Register Student
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-6 w-[60px] rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description="Try adjusting your search or filters, or register a new student."
            actionLabel="Register Student"
            onAction={() => setShowAddDialog(true)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Class
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Overdue
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.avatar} alt={student.name} />
                            <AvatarFallback className="bg-navy text-white text-xs">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {student.admissionNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {student.class}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        {student.overdueCount > 0 ? (
                          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                            <AlertCircle className="h-4 w-4" />
                            {student.overdueCount}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openProfileDialog(student)}>
                              <BookOpen className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(student)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(student)}
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg ${currentPage === page ? 'bg-navy hover:bg-navy/90' : ''}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter student name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="e.g., ADM2024001"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Input
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  placeholder="e.g., Grade 10"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddStudent} className="bg-navy hover:bg-navy/90 rounded-xl">
              Register Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Input
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })}
                >
                  <SelectTrigger className="rounded-xl">
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
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditStudent} className="bg-navy hover:bg-navy/90 rounded-xl">
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

      {/* Student Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="py-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} />
                  <AvatarFallback className="bg-navy text-white text-lg">
                    {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.admissionNumber} • {selectedStudent.class}</p>
                </div>
              </div>

              <Tabs defaultValue="current">
                <TabsList className="rounded-xl">
                  <TabsTrigger value="current">Current Borrows</TabsTrigger>
                  <TabsTrigger value="history">Borrow History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="current" className="mt-4">
                  {getStudentBorrows(selectedStudent.id).filter(r => r.status === 'borrowed').length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No current borrows</p>
                  ) : (
                    <div className="space-y-3">
                      {getStudentBorrows(selectedStudent.id)
                        .filter(r => r.status === 'borrowed')
                        .map(borrow => (
                          <div key={borrow.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                            <div>
                              <p className="font-medium text-sm">{borrow.bookTitle}</p>
                              <p className="text-xs text-muted-foreground">Due: {new Date(borrow.dueDate).toLocaleDateString()}</p>
                            </div>
                            <StatusBadge status="borrowed" />
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  {getStudentBorrows(selectedStudent.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No borrow history</p>
                  ) : (
                    <div className="space-y-3">
                      {getStudentBorrows(selectedStudent.id).map(borrow => (
                        <div key={borrow.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                          <div>
                            <p className="font-medium text-sm">{borrow.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(borrow.borrowDate).toLocaleDateString()} - {borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString() : 'Not returned'}
                            </p>
                          </div>
                          <StatusBadge status={borrow.status === 'returned' ? 'returned' : borrow.status === 'overdue' ? 'overdue' : 'borrowed'} />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
