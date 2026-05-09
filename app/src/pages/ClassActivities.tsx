import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Save,
  ArrowLeft,
  Users,
  Loader2,
  Award,
  BookOpen,
  Trash2,
  CheckCircle2,
  X,
  MoreVertical,
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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui-custom';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import type { SchoolLevel } from '@/lib/teacher-levels';

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
  activity_type: string;
}

interface ClassItem {
  id: string;
  name: string;
  short_code: string;
  level?: SchoolLevel | null;
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

const ACTIVITY_TYPES = ['test', 'assignment', 'quiz', 'project', 'other'] as const;
type ActivityType = typeof ACTIVITY_TYPES[number];

const typeColorMap: Record<ActivityType, string> = {
  test: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  assignment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  quiz: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  project: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  other: 'bg-secondary text-muted-foreground',
};

const getTypeLabelKey = (type: string): string => {
  const map: Record<string, string> = {
    test: 'classActivities.typeTest',
    assignment: 'classActivities.typeAssignment',
    quiz: 'classActivities.typeQuiz',
    project: 'classActivities.typeProject',
    other: 'classActivities.typeOther',
  };
  return map[type] || 'classActivities.typeOther';
};

export function ClassActivities() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all');

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
    activity_type: 'test' as ActivityType,
  });

  // View activity marks
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(-1);
  const [studentMarks, setStudentMarks] = useState<Record<string, number | ''>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Delete activity
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchClasses();
  }, [classFilter]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const params: Record<string, string> = {};
      if (classFilter !== 'all') params.class_id = classFilter;

      const { data } = await api.get('/activities', { params });
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setIsError(true);
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
      const { data: attendanceCheck } = await api.get(`/attendance/check/${formData.class_id}/${formData.date}`);
      if (!attendanceCheck.taken) {
        toast.error(t('attendance.attendanceRequired'));
        setIsSubmitting(false);
        return;
      }

      const selectedClass = classes.find((c) => c.id === formData.class_id);

      await api.post('/activities', {
        name: formData.name.trim(),
        class_id: formData.class_id,
        date: formData.date,
        total_marks: formData.total_marks === '' ? null : Number(formData.total_marks),
        level: selectedClass?.level || null,
        activity_type: formData.activity_type,
      });

      toast.success(t('classActivities.activityCreated'));
      setShowCreateDialog(false);
      fetchActivities();
      setFormData({
        name: '',
        class_id: '',
        date: new Date().toISOString().split('T')[0],
        total_marks: '',
        level: '',
        activity_type: 'test',
      });
      setNextId('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || t('classActivities.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewActivity = async (activity: Activity) => {
    const idx = filteredActivities.findIndex((a) => a.id === activity.id);
    setCurrentActivityIndex(idx);
    try {
      setIsLoading(true);
      const { data } = await api.get(`/activities/${activity.id}`);
      setSelectedActivity(data);

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

  const navigateActivity = async (direction: 'prev' | 'next') => {
    const newIdx = direction === 'prev' ? currentActivityIndex - 1 : currentActivityIndex + 1;
    if (newIdx < 0 || newIdx >= filteredActivities.length) return;
    await viewActivity(filteredActivities[newIdx]);
  };

  const handleSaveMarks = async () => {
    if (!selectedActivity) return;

    for (const [, mark] of Object.entries(studentMarks)) {
      if (mark !== '' && Number(mark) > selectedActivity.total_marks) {
        toast.error(t('classActivities.marksExceed', { max: selectedActivity.total_marks }));
        return;
      }
    }

    setIsSavingMarks(true);
    try {
      const marksArray = selectedActivity.students
        .filter((s) => studentMarks[s.id] !== '')
        .map((s) => ({
          student_id: s.id,
          marks_obtained: Number(studentMarks[s.id]),
        }));

      await api.post(`/activities/${selectedActivity.id}/marks`, { marks: marksArray });
      toast.success(t('classActivities.marksSaved'));
      fetchActivities();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || t('classActivities.failedToSaveMarks'));
    } finally {
      setIsSavingMarks(false);
    }
  };

  const handleFillMax = () => {
    if (!selectedActivity) return;
    const marks: Record<string, number | ''> = {};
    selectedActivity.students.forEach((s) => {
      marks[s.id] = s.attendance_status === 'absent' ? 0 : selectedActivity.total_marks;
    });
    setStudentMarks(marks);
  };

  const handleClearAll = () => {
    if (!selectedActivity) return;
    const marks: Record<string, number | ''> = {};
    selectedActivity.students.forEach((s) => {
      marks[s.id] = s.attendance_status === 'absent' ? 0 : '';
    });
    setStudentMarks(marks);
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${activityToDelete.id}`);
      toast.success(t('classActivities.deleteActivity'));
      setActivityToDelete(null);
      fetchActivities();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || t('classActivities.failedToFetch'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredActivities = activities.filter(
    (a) =>
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.activity_id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (typeFilter === 'all' || a.activity_type === typeFilter),
  );

  // â”€â”€â”€ Table columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const columns: DataTableColumn<Activity>[] = [
    {
      key: 'name',
      header: t('classActivities.activity'),
      sortable: true,
      render: (activity) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{activity.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{activity.activity_id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'activity_type',
      header: t('classActivities.activityType'),
      sortable: true,
      render: (activity) => {
        const type = (activity.activity_type || 'other') as ActivityType;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${typeColorMap[type] || typeColorMap.other}`}>
            {t(getTypeLabelKey(type))}
          </span>
        );
      },
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
        <Badge variant="outline" className="rounded-lg font-mono">
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
          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${(activity.marks_count / Math.max(activity.total_students, 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {activity.marks_count}/{activity.total_students}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (activity) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg h-8 text-xs"
            onClick={() => viewActivity(activity)}
          >
            {t('classActivities.enterMarks')}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          {hasPermission('class_activities:manage') && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setActivityToDelete(activity)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // â”€â”€â”€ Mark entry view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (selectedActivity) {
    const markedCount = selectedActivity.students.filter((s) => studentMarks[s.id] !== '').length;
    const progressPct = Math.round((markedCount / Math.max(selectedActivity.students.length, 1)) * 100);
    const canEdit = hasPermission('class_activities:manage');

    return (
      <div className="space-y-4 pb-24">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedActivity(null)}
              className="rounded-lg flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{selectedActivity.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium capitalize mr-2 ${typeColorMap[(selectedActivity.activity_type as ActivityType) || 'other'] || typeColorMap.other}`}>
                  {t(getTypeLabelKey(selectedActivity.activity_type || 'other'))}
                </span>
                {selectedActivity.class_name} &bull; {selectedActivity.total_marks} marks &bull; {new Date(selectedActivity.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9"
              disabled={currentActivityIndex <= 0}
              onClick={() => navigateActivity('prev')}
              title="Previous activity"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-1">
              {currentActivityIndex + 1}/{filteredActivities.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9"
              disabled={currentActivityIndex >= filteredActivities.length - 1}
              onClick={() => navigateActivity('next')}
              title="Next activity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress + quick actions card */}
        <div className="rounded-xl border bg-card shadow-card p-4 space-y-3">
          {/* Progress row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('classActivities.studentProgress')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('classActivities.studentsMarked', { count: markedCount, total: selectedActivity.students.length })}
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums flex-shrink-0">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Quick actions */}
          {canEdit && (
            <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
              <span className="text-xs text-muted-foreground">{t('common.quickActions', 'Quick')}:</span>
              <button
                type="button"
                onClick={handleFillMax}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-green-300 text-green-700 dark:text-green-400 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('classActivities.fillMax')}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-muted-foreground/30 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                {t('classActivities.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Student rows */}
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          {/* Column header â€” desktop only */}
          <div className="hidden sm:flex items-center px-4 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <span className="flex-1">{t('results.student')}</span>
            <span className="w-32 text-right">{t('classActivities.totalMarks')}</span>
            <span className="w-32 text-right">{t('classActivities.marksObtained')}</span>
            <span className="w-16 text-right">%</span>
          </div>

          <div className="divide-y">
            {selectedActivity.students.map((student) => {
              const markVal = studentMarks[student.id];
              const pct = markVal !== '' && markVal !== undefined
                ? Math.round((Number(markVal) / selectedActivity.total_marks) * 100)
                : null;
              const isAbsent = student.attendance_status === 'absent';
              const isExcused = student.attendance_status === 'excused';

              return (
                <div key={student.id} className={`px-4 py-3 transition-colors ${isAbsent ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  {/* Mobile: stacked layout */}
                  <div className="flex items-start gap-3 sm:hidden">
                    <IdentityAvatar name={student.student_name} className="h-9 w-9 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.student_code}</p>
                        {(isAbsent || isExcused) && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${isAbsent ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-800' : 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800'}`}>
                            {isAbsent ? t('attendance.absent') : t('attendance.excused')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          max={selectedActivity.total_marks}
                          value={markVal ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : parseInt(e.target.value);
                            if (v !== '' && (v < 0 || v > selectedActivity.total_marks)) {
                              toast.error(t('classActivities.marksBetween', { max: selectedActivity.total_marks }));
                              return;
                            }
                            setStudentMarks((prev) => ({ ...prev, [student.id]: v }));
                          }}
                          disabled={!canEdit}
                          className="flex-1 rounded-lg h-10 text-base"
                          placeholder={`0–${selectedActivity.total_marks}`}
                        />
                        {pct !== null && (
                          <span className={`text-sm font-medium tabular-nums ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {pct}%
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">/{selectedActivity.total_marks}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop: side-by-side */}
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <IdentityAvatar name={student.student_name} className="h-9 w-9 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{student.student_name}</p>
                          {(isAbsent || isExcused) && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${isAbsent ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-800' : 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800'}`}>
                              {isAbsent ? t('attendance.absent') : t('attendance.excused')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{student.student_code}</p>
                      </div>
                    </div>
                    <div className="w-32 text-right text-sm text-muted-foreground tabular-nums">{selectedActivity.total_marks}</div>
                    <div className="w-32 flex justify-end">
                      <Input
                        type="number"
                        min={0}
                        max={selectedActivity.total_marks}
                        value={markVal ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (v !== '' && (v < 0 || v > selectedActivity.total_marks)) {
                            toast.error(t('classActivities.marksBetween', { max: selectedActivity.total_marks }));
                            return;
                          }
                          setStudentMarks((prev) => ({ ...prev, [student.id]: v }));
                        }}
                        disabled={!canEdit}
                        className="w-24 rounded-lg h-9 text-sm text-right"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-16 text-right">
                      {pct !== null ? (
                        <span className={`text-sm font-medium tabular-nums ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pct}%
                        </span>
                      ) : (
                      <span className="text-muted-foreground text-sm text-right">/{selectedActivity.total_marks}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky save bar */}
        {canEdit && (
          <div className="sticky bottom-0 z-10 -mx-4 md:-mx-8 border-t bg-card/95 backdrop-blur-sm px-4 md:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {markedCount}/{selectedActivity.students.length} {t('classActivities.studentProgress').toLowerCase()}
            </p>
            <Button
              onClick={handleSaveMarks}
              disabled={isSavingMarks}
              className="bg-primary hover:bg-primary/90 shrink-0"
            >
              {isSavingMarks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t('classActivities.saveMarks')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // â”€â”€â”€ Activity list view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('classActivities.title')}
        description={t('classActivities.createAndManageSubtitle')}
        action={
          hasPermission('class_activities:create') || hasPermission('class_activities:manage')
            ? { label: t('classActivities.createActivity'), icon: Plus, onClick: () => setShowCreateDialog(true) }
            : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('classActivities.searchActivities')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 rounded-lg"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px] h-10 rounded-lg">
            <GraduationCap className="h-4 w-4 mr-2 flex-shrink-0" />
            <SelectValue placeholder={t('classActivities.filterByClass')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('classActivities.allClasses')}</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['all', ...ACTIVITY_TYPES] as Array<'all' | ActivityType>).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
            className={`flex-shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              typeFilter === type
                ? 'bg-primary text-primary-foreground'
                : 'border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {type === 'all' ? t('common.all', 'All') : t(getTypeLabelKey(type))}
          </button>
        ))}
      </div>

      {/* Mobile activity cards */}
      <div className="sm:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-card p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{t('classActivities.failedToFetch')}</p>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setIsError(false); fetchActivities(); }}>
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center space-y-2">
            <Award className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium text-foreground">{t('classActivities.noActivities')}</p>
            <p className="text-sm text-muted-foreground">{t('classActivities.noActivitiesDesc')}</p>
            {(hasPermission('class_activities:create') || hasPermission('class_activities:manage')) && (
              <Button size="sm" className="mt-2 rounded-lg" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                {t('classActivities.createActivity')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border bg-card shadow-card p-4 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                onClick={() => viewActivity(activity)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-snug truncate">{activity.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{activity.activity_id}</p>
                      </div>
                      {hasPermission('class_activities:manage') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg flex-shrink-0 -mt-1 -mr-1 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive gap-2"
                              onClick={(e) => { e.stopPropagation(); setActivityToDelete(activity); }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${typeColorMap[(activity.activity_type || 'other') as ActivityType] || typeColorMap.other}`}>
                        {t(getTypeLabelKey(activity.activity_type || 'other'))}
                      </span>
                      <span className="text-xs text-muted-foreground">{activity.class_name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(activity.marks_count / Math.max(activity.total_students, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    {activity.marks_count}/{activity.total_students}
                  </span>
                  <Badge variant="outline" className="rounded-md font-mono text-xs flex-shrink-0">
                    {activity.total_marks}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <DataTable
          data={filteredActivities}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={viewActivity}
          emptyIcon={Award}
          emptyTitle={t('classActivities.noActivities')}
          emptyDescription={t('classActivities.noActivitiesDesc')}
          isError={isError}
          onRetry={() => { setIsError(false); fetchActivities(); }}
          emptyAction={
            hasPermission('class_activities:create') || hasPermission('class_activities:manage')
              ? { label: t('classActivities.createActivity'), icon: Plus, onClick: () => setShowCreateDialog(true) }
              : undefined
          }
        />
      </div>

      {/* Create Activity Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('classActivities.createNewActivity')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {nextId && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground">{t('classActivities.activityId')}</p>
                <p className="font-mono text-primary font-medium">{nextId}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('classActivities.activityName')} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('classActivities.midtermExample')}
                className="rounded-lg h-10"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('classActivities.activityType')} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.activity_type}
                onValueChange={(v) => setFormData({ ...formData, activity_type: v as ActivityType })}
              >
                <SelectTrigger className="rounded-lg h-10">
                  <SelectValue placeholder={t('classActivities.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {t(getTypeLabelKey(type))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('classActivities.class')} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => {
                  const selected = classes.find((c) => c.id === value);
                  setFormData({ ...formData, class_id: value, level: selected?.level || '' });
                  fetchNextId(value);
                }}
              >
                <SelectTrigger className="rounded-lg h-10">
                  <SelectValue placeholder={t('classActivities.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('classActivities.date')} <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="rounded-lg h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('classActivities.totalMarks')} <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.total_marks}
                  onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                  placeholder={t('classActivities.marksExample')}
                  className="rounded-lg h-10"
                />
              </div>
            </div>

            {formData.level && (
              <div className="space-y-2">
                <Label>{t('classActivities.level')}</Label>
                <Input value={formData.level} disabled className="rounded-lg h-10 capitalize" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-lg">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateActivity}
              className="bg-primary hover:bg-primary/90 rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('classActivities.createActivity')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={!!activityToDelete} onOpenChange={(open) => !open && setActivityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('classActivities.deleteActivity')}</AlertDialogTitle>
            <AlertDialogDescription>
              {activityToDelete && activityToDelete.marks_count > 0
                ? t('classActivities.deleteWarning', { count: activityToDelete.marks_count })
                : t('classActivities.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActivity}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

