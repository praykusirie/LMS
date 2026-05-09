import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Flag,
  Users,
  BookOpen,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import api from '@/lib/api';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui-custom';
import { PersonAvatar } from '@/components/shared/PersonAvatar';

interface StudentRecord {
  id: string;
  student_id: string;
  admission_number: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
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
  updated_at: string;
  active_borrows: number;
}

interface BorrowRecord {
  id: string;
  book_id: string;
  book_title: string;
  book_code: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
  fine_amount: number;
}

export function StudentDetail() {
  const { t } = useTranslation();
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Delete dialog only
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
      fetchBorrowHistory();
    }
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/students/${studentId}`);
      setStudent(data);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error(t('students.failedToLoadDetails'));
      navigate('/students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      const { data } = await api.get(`/students/${studentId}/borrow-history`);
      setBorrowHistory(data);
    } catch (error) {
      console.error('Error fetching borrow history:', error);
    }
  };


  const handleDelete = async () => {
    if (!student) return;
    try {
      await api.delete(`/students/${student.id}`);
      toast.success(t('students.deleteSuccess'));
      navigate('/students');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('students.failedToDelete'));
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Users className="h-16 w-16 mb-4" />
        <p className="text-lg">{t('students.notFound')}</p>
        <Button onClick={() => navigate('/students')} className="mt-4 rounded-xl">
          {t('students.backToStudents')}
        </Button>
      </div>
    );
  }

  const currentBorrows = borrowHistory.filter(b => b.status === 'borrowed');
  const overdueBorrows = borrowHistory.filter(b => b.status === 'overdue');
  const age = calculateAge(student.dob);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/students')}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('students.studentProfile')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('students.profileSubtitle')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="rounded-xl h-11"
            onClick={() => navigate(`/students/${studentId}/edit`)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
          <Button 
            variant="destructive"
            className="rounded-xl h-11"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-lg bg-card p-6 shadow-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <PersonAvatar name={student.name} gender={(student.gender as 'male' | 'female') || 'male'} className="h-32 w-32 rounded-2xl" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{student.name}</h2>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                  {student.student_id || student.admission_number}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant={student.is_active ? 'default' : 'secondary'} className="rounded-lg">
                    {student.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                  {student.level && (
                    <Badge variant="outline" className="rounded-lg capitalize">
                      {student.level} Level
                    </Badge>
                  )}
                  <Badge variant="outline" className="rounded-lg capitalize">
                    {student.gender}
                  </Badge>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{currentBorrows.length}</p>
                  <p className="text-xs text-muted-foreground">{t('students.currentBorrows')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{overdueBorrows.length}</p>
                  <p className="text-xs text-muted-foreground">{t('students.overdue')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {borrowHistory.filter(b => b.status === 'returned').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('students.returned')}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('students.class')}</p>
                  <p className="text-sm font-medium">{student.class_name || '-'}</p>
                </div>
              </div>
              
              {age && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.age')}</p>
                    <p className="text-sm font-medium">{t('students.yearsOld', { age })}</p>
                  </div>
                </div>
              )}

              {student.dob && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.dateOfBirth')}</p>
                    <p className="text-sm font-medium">{formatDate(student.dob)}</p>
                  </div>
                </div>
              )}

              {student.nationality && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Flag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.nationality')}</p>
                    <p className="text-sm font-medium">{student.nationality}</p>
                  </div>
                </div>
              )}

              {student.email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.email')}</p>
                    <p className="text-sm font-medium truncate">{student.email}</p>
                  </div>
                </div>
              )}

              {student.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.phone')}</p>
                    <p className="text-sm font-medium">{student.phone}</p>
                  </div>
                </div>
              )}

              {student.address && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.address')}</p>
                    <p className="text-sm font-medium">{student.address}</p>
                  </div>
                </div>
              )}

              {student.parent_email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.parentEmail')}</p>
                    <p className="text-sm font-medium truncate">{student.parent_email}</p>
                  </div>
                </div>
              )}

              {student.parent_phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('students.parentPhoneLabel')}</p>
                    <p className="text-sm font-medium">{student.parent_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg bg-card p-6 shadow-card">
        <Tabs defaultValue="current">
          <TabsList className="rounded-xl">
            <TabsTrigger value="current" className="rounded-lg">
              <BookOpen className="h-4 w-4 mr-2" />
              {t('students.currentBorrows')} ({currentBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-lg">
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('students.overdue')} ({overdueBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">
              <Clock className="h-4 w-4 mr-2" />
              {t('students.history')} ({borrowHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {currentBorrows.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('students.noCurrentBorrows')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentBorrows.map((borrow) => (
                  <div key={borrow.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{borrow.book_title}</p>
                        <p className="text-xs text-muted-foreground">{borrow.book_code}</p>
                        <p className="text-xs text-muted-foreground">{t('students.due')}: {formatDate(borrow.due_date)}</p>
                      </div>
                    </div>
                    <StatusBadge status="borrowed">{t('students.borrowed')}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            {overdueBorrows.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('students.noOverdueBooks')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueBorrows.map((borrow) => (
                  <div key={borrow.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{borrow.book_title}</p>
                        <p className="text-xs text-muted-foreground">{borrow.book_code}</p>
                        <p className="text-xs text-red-600">{t('students.due')}: {formatDate(borrow.due_date)}</p>
                        {borrow.fine_amount > 0 && (
                          <p className="text-xs text-red-600 font-medium">{t('students.fine')}: TZS {Number(borrow.fine_amount).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status="overdue">{t('students.overdue')}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {borrowHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('students.noBorrowHistory')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {borrowHistory.map((borrow) => (
                  <div key={borrow.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{borrow.book_title}</p>
                        <p className="text-xs text-muted-foreground">{borrow.book_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(borrow.borrow_date)} - {borrow.return_date ? formatDate(borrow.return_date) : (borrow.status === 'overdue' ? t('students.overdue') : t('students.notReturned'))}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={borrow.status === 'returned' ? 'returned' : borrow.status === 'overdue' ? 'overdue' : 'borrowed'}>
                      {borrow.status === 'returned' ? t('students.returned') : borrow.status === 'overdue' ? t('students.overdue') : t('students.borrowed')}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteStudent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteConfirmMessage', { name: student.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
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
