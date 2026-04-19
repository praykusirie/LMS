import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  GraduationCap,
  ChevronRight,
  Save,
  ArrowLeft,
  Users,
  Loader2,
  Award,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/permissions';
import { LazyBookCover } from '@/components/shared/LazyBookCover';

interface Activity {
  id: string;
  activity_id: string;
  name: string;
  class_id: string;
  class_name: string;
  class_short_code: string;
  teacher_name: string;
  date: string;
  total_marks: number;
  marks_count: number;
  total_students: number;
  level: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  short_code: string;
}

interface StudentMark {
  id: string;
  student_name: string;
  avatar: string | null;
  student_code: string;
  mark_id: string | null;
  marks_obtained: number | null;
  total_marks: number;
  attendance_status: 'present' | 'absent' | 'excused' | null;
}

interface ActivityDetail extends Activity {
  students: StudentMark[];
}

const generateAvatar = (name: string) => {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

export function ClassActivities() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  
  // Create activity dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextId, setNextId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    class_id: '',
    date: new Date().toISOString().split('T')[0],
    total_marks: '',
    level: '',
  });

  // View activity marks
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);
  const [studentMarks, setStudentMarks] = useState<Record<string, number | ''>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchClasses();
    if (!isAdmin && userLevel) {
      setFormData(prev => ({ ...prev, level: userLevel }));
    }
  }, [classFilter]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (classFilter !== 'all') params.class_id = classFilter;
      
      const { data } = await api.get('/activities', { params });
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error(t('classActivities.failedToFetch'));
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

  const fetchNextId = async (classId: string) => {
    if (!classId) return;
    try {
      const { data } = await api.get(`/activities/next-id/${classId}`);
      setNextId(data.nextId);
    } catch (error) {
      console.error('Error fetching next ID:', error);
    }
  };

  const handleCreateActivity = async () => {
    if (!formData.name || !formData.class_id || !formData.date || !formData.total_marks) {
      toast.error(t('classActivities.fillRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Check attendance has been taken
      const { data: attendanceCheck } = await api.get(`/attendance/check/${formData.class_id}/${formData.date}`);
      if (!attendanceCheck.taken) {
        toast.error(t('attendance.attendanceRequired'));
        setIsSubmitting(false);
        return;
      }

      const effectiveLevel = isAdmin ? formData.level : userLevel;
      
      await api.post('/activities', {
        name: formData.name.trim(),
        class_id: formData.class_id,
        date: formData.date,
        total_marks: parseInt(formData.total_marks),
        level: effectiveLevel,
      });

      toast.success(t('classActivities.activityCreated'));
      setShowCreateDialog(false);
      fetchActivities();
      
      // Reset form
      setFormData({
        name: '',
        class_id: '',
        date: new Date().toISOString().split('T')[0],
        total_marks: '',
        level: isAdmin ? '' : (userLevel || ''),
      });
      setNextId('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('classActivities.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewActivity = async (activity: Activity) => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/activities/${activity.id}`);
      setSelectedActivity(data);
      
      // Initialize marks (pre-fill 0 for absent students)
      const marks: Record<string, number | ''> = {};
      data.students.forEach((s: StudentMark) => {
        if (s.marks_obtained != null) {
          marks[s.id] = s.marks_obtained;
        } else if (s.attendance_status === 'absent') {
          marks[s.id] = 0;
        } else {
          marks[s.id] = '';
        }
      });
      setStudentMarks(marks);
    } catch (error) {
      console.error('Error fetching activity details:', error);
      toast.error(t('classActivities.failedToLoadDetails'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedActivity) return;

    // Validate marks don't exceed total
    for (const [, mark] of Object.entries(studentMarks)) {
      if (mark !== '' && Number(mark) > selectedActivity.total_marks) {
        toast.error(t('classActivities.marksExceed', { max: selectedActivity.total_marks }));
        return;
      }
    }

    setIsSavingMarks(true);
    try {
      const marksArray = selectedActivity.students
        .filter(s => studentMarks[s.id] !== '')
        .map(s => ({
          student_id: s.id,
          marks_obtained: Number(studentMarks[s.id])
        }));

      await api.post(`/activities/${selectedActivity.id}/marks`, { marks: marksArray });
      toast.success(t('classActivities.marksSaved'));
      fetchActivities();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('classActivities.failedToSaveMarks'));
    } finally {
      setIsSavingMarks(false);
    }
  };

  const filteredActivities = activities.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.activity_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Table columns
  const columns: DataTableColumn<Activity>[] = [
    {
      key: 'name',
      header: t('classActivities.activity'),
      sortable: true,
      render: (activity) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-navy" />
          </div>
          <div>
            <div className="font-medium text-foreground">{activity.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{activity.activity_id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'class_name',
      header: t('classActivities.class'),
      sortable: true,
      render: (activity) => (
        <span className="text-muted-foreground">{activity.class_name}</span>
      ),
    },
    {
      key: 'date',
      header: t('classActivities.date'),
      sortable: true,
      render: (activity) => (
        <span className="text-muted-foreground">
          {new Date(activity.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'total_marks',
      header: t('classActivities.totalMarks'),
      sortable: true,
      render: (activity) => (
        <Badge variant="outline" className="rounded-lg">
          {activity.total_marks}
        </Badge>
      ),
    },
    {
      key: 'marks_count',
      header: t('classActivities.progress'),
      sortable: true,
      render: (activity) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-navy rounded-full"
              style={{ width: `${(activity.marks_count / activity.total_students) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {activity.marks_count}/{activity.total_students}
          </span>
        </div>
      ),
    },
    {
      key: 'level',
      header: t('classActivities.level'),
      sortable: true,
      render: (activity) => (
        activity.level ? (
          <Badge variant="outline" className="rounded-lg capitalize">
            {activity.level}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'actions',
      header: t('classActivities.action'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (activity) => (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl"
          onClick={() => viewActivity(activity)}
        >
          {t('classActivities.enterMarks')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ),
    },
  ];

  // Marks entry view
  if (selectedActivity) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedActivity(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{selectedActivity.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedActivity.class_name} • {selectedActivity.total_marks} marks • {new Date(selectedActivity.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          {hasPermission('class_activities:manage') && (
          <Button 
            onClick={handleSaveMarks}
            className="bg-navy hover:bg-navy/90 rounded-xl h-11"
            disabled={isSavingMarks}
          >
            {isSavingMarks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t('classActivities.saveMarks')}
          </Button>
          )}
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-4 bg-navy/5 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-navy/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-navy" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('classActivities.studentProgress')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('classActivities.studentsMarked', { count: selectedActivity.students.filter(s => studentMarks[s.id] !== '').length, total: selectedActivity.students.length })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-navy">
                {Math.round((selectedActivity.students.filter(s => studentMarks[s.id] !== '').length / selectedActivity.students.length) * 100)}%
              </p>
            </div>
          </div>
        </motion.div>

        {/* Student Marks Table */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-[20px] bg-card p-6 shadow-card"
        >
          <div className="space-y-4">
            {selectedActivity.students.map((student) => (
              <div 
                key={student.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LazyBookCover
                    src={student.avatar}
                    fallbackSrc={generateAvatar(student.student_name)}
                    alt={student.student_name}
                    containerClassName="h-10 w-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{student.student_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground font-mono">{student.student_code}</p>
                      {student.attendance_status && student.attendance_status !== 'present' && (
                        <Badge variant="outline" className={student.attendance_status === 'absent' ? 'text-red-600 border-red-300 text-[10px] px-1 py-0' : 'text-yellow-600 border-yellow-300 text-[10px] px-1 py-0'}>
                          {student.attendance_status === 'absent' ? t('attendance.absent') : t('attendance.excused')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('classActivities.totalMarks')}</p>
                    <p className="font-medium text-navy">{selectedActivity.total_marks}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <Label className="text-xs">{t('classActivities.marksObtained')}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={selectedActivity.total_marks}
                      value={studentMarks[student.id] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseInt(e.target.value);
                        if (value !== '' && (value < 0 || value > selectedActivity.total_marks)) {
                          toast.error(t('classActivities.marksBetween', { max: selectedActivity.total_marks }));
                          return;
                        }
                        setStudentMarks(prev => ({ ...prev, [student.id]: value }));
                      }}
                      className="w-24 rounded-xl h-10"
                      placeholder="0"
                    />
                  </div>
                  {studentMarks[student.id] !== '' && (
                    <div className="text-right min-w-[60px]">
                      <p className="text-xs text-muted-foreground">%</p>
                      <p className="font-medium">
                        {Math.round((Number(studentMarks[student.id]) / selectedActivity.total_marks) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-foreground">{t('classActivities.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('classActivities.createAndManageSubtitle')}
          </p>
        </div>
        {hasPermission('class_activities:manage') && (
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('classActivities.createActivity')}
        </Button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('classActivities.searchActivities')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px] h-11 rounded-xl">
            <GraduationCap className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('classActivities.filterByClass')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('classActivities.allClasses')}</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DataTable
          data={filteredActivities}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={Award}
          emptyTitle={t('classActivities.noActivities')}
          emptyDescription={t('classActivities.noActivitiesDesc')}
        />
      </motion.div>

      {/* Create Activity Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('classActivities.createNewActivity')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Next ID Preview */}
            {nextId && (
              <div className="p-3 bg-navy/5 rounded-xl">
                <p className="text-xs text-muted-foreground">{t('classActivities.activityId')}</p>
                <p className="font-mono text-navy font-medium">{nextId}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('classActivities.activityName')} <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('classActivities.midtermExample')}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('classActivities.class')} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, class_id: value });
                  fetchNextId(value);
                }}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={t('classActivities.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('classActivities.date')} <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('classActivities.totalMarks')} <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.total_marks}
                  onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                  placeholder={t('classActivities.marksExample')}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2">
              <Label>{t('classActivities.level')} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={t('classActivities.selectLevel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('classActivities.primary')}</SelectItem>
                  <SelectItem value="secondary">{t('classActivities.secondary')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateActivity}
              className="bg-navy hover:bg-navy/90 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('classActivities.createActivity')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
