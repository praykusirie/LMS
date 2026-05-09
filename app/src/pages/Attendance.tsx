import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Save,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

interface ClassItem {
  id: string;
  name: string;
  level?: string | null;
}

interface Student {
  id: string;
  name: string;
  student_id: string;
  admission_number?: string;
  avatar?: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'excused';
}

interface ExistingRecord {
  student_id: string;
  status: 'present' | 'absent' | 'excused';
  student_name: string;
  admission_number?: string;
}

const Attendance = () => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Map<string, 'present' | 'absent' | 'excused'>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [homeroomClassId, setHomeroomClassId] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'homeroom' | 'levels'>('levels');

  // Fetch classes (admin) or homeroom class (teacher)
  useEffect(() => {
    const init = async () => {
      if (isAdmin) {
        try {
          const { data } = await api.get('/classes');
          setClasses(data);
        } catch {
          toast.error(t('attendance.fetchClassesError', 'Failed to load classes'));
        }
      } else {
        try {
          const { data } = await api.get('/attendance/my-classes');
          const teacherClasses: ClassItem[] = data.classes || [];
          setAttendanceMode(data.mode === 'homeroom' ? 'homeroom' : 'levels');
          setClasses(teacherClasses);

          if (data.mode === 'homeroom' && teacherClasses[0]) {
            setHomeroomClassId(teacherClasses[0].id);
            setSelectedClassId(teacherClasses[0].id);
          } else {
            setHomeroomClassId(null);
            setSelectedClassId((prev) => (
              teacherClasses.some((classItem) => classItem.id === prev)
                ? prev
                : teacherClasses.length === 1
                  ? teacherClasses[0].id
                  : ''
            ));
          }
        } catch {
          toast.error(t('attendance.fetchClassesError', 'Failed to load classes'));
        }
      }
    };
    init();
  }, [isAdmin]);

  // Load students and existing attendance when class/date change
  useEffect(() => {
    if (!selectedClassId || !selectedDate) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data: studentsData } = await api.get('/students', { params: { class_id: selectedClassId } });
        setStudents(studentsData);

        // Check for existing attendance
        const { data: existingData } = await api.get(`/attendance?class_id=${selectedClassId}&date=${selectedDate}`);

        if (existingData.length > 0) {
          setIsExisting(true);
          const existing = new Map<string, 'present' | 'absent' | 'excused'>();
          existingData.forEach((r: ExistingRecord) => {
            existing.set(r.student_id, r.status);
          });
          setRecords(existing);
        } else {
          setIsExisting(false);
          // Default all to present
          const defaults = new Map<string, 'present' | 'absent' | 'excused'>();
          studentsData.forEach((s: Student) => {
            defaults.set(s.id, 'present');
          });
          setRecords(defaults);
        }
      } catch {
        toast.error(t('attendance.fetchStudentsError', 'Failed to load students'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedClassId, selectedDate]);

  const setStatus = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setRecords(prev => {
      const next = new Map(prev);
      next.set(studentId, status);
      return next;
    });
  };

  const markAll = (status: 'present' | 'absent' | 'excused') => {
    const next = new Map<string, 'present' | 'absent' | 'excused'>();
    students.forEach(s => next.set(s.id, status));
    setRecords(next);
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedDate || records.size === 0) return;

    setIsSaving(true);
    try {
      const attendanceRecords: AttendanceRecord[] = [];
      records.forEach((status, student_id) => {
        attendanceRecords.push({ student_id, status });
      });

      await api.post('/attendance', {
        class_id: selectedClassId,
        date: selectedDate,
        records: attendanceRecords,
      });

      setIsExisting(true);
      toast.success(t('attendance.saved'));
    } catch {
      toast.error(t('attendance.saveError', 'Failed to save attendance'));
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Array.from(records.values()).filter(s => s === 'present').length;
  const absentCount = Array.from(records.values()).filter(s => s === 'absent').length;
  const excusedCount = Array.from(records.values()).filter(s => s === 'excused').length;

  const canSelectClass = isAdmin || attendanceMode !== 'homeroom';

  const segmentConfig = {
    present: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      abbrev: 'P',
      label: t('attendance.present'),
      active: 'bg-green-600 text-white',
      rowBorder: 'border-l-green-500',
      rowBg: 'bg-green-50/40 dark:bg-green-950/20',
    },
    absent: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      abbrev: 'A',
      label: t('attendance.absent'),
      active: 'bg-red-600 text-white',
      rowBorder: 'border-l-red-500',
      rowBg: 'bg-red-50/40 dark:bg-red-950/20',
    },
    excused: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      abbrev: 'E',
      label: t('attendance.excused'),
      active: 'bg-amber-500 text-white',
      rowBorder: 'border-l-amber-400',
      rowBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    },
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        title={t('attendance.title')}
        description={t('attendance.subtitle')}
      />

      {/* Controls card: date + class + mark-all in one surface */}
      <div className="rounded-xl border bg-card shadow-card p-4 space-y-4">
        {/* Row 1: Date + Class selectors */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('attendance.selectDate')}</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="rounded-lg h-9 w-[160px] text-sm"
            />
          </div>
          {canSelectClass ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('attendance.selectClass')}</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-lg h-9 w-[200px] text-sm">
                  <SelectValue placeholder={t('attendance.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            homeroomClassId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('attendance.selectClass')}</Label>
                <div className="px-3 h-9 flex items-center rounded-lg border bg-muted text-sm font-medium">
                  {classes[0]?.name || '—'}
                </div>
              </div>
            )
          )}
        </div>

        {/* Row 2: Mark All — visible once students are loaded */}
        {selectedClassId && students.length > 0 && hasPermission('attendance:manage') && (
          <div className="flex items-center gap-2 flex-wrap border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">{t('attendance.markAll', 'Mark all')}:</span>
            <button
              type="button"
              onClick={() => markAll('present')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-green-300 text-green-700 dark:text-green-400 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('attendance.present')}
            </button>
            <button
              type="button"
              onClick={() => markAll('absent')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-red-300 text-red-600 dark:text-red-400 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              {t('attendance.absent')}
            </button>
            <button
              type="button"
              onClick={() => markAll('excused')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-amber-300 text-amber-600 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {t('attendance.excused')}
            </button>
          </div>
        )}
      </div>

      {/* Student list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedClassId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <ClipboardCheck className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">{t('attendance.selectClass')}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">{t('attendance.noStudents')}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          {/* Column header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
            <span className="text-xs font-medium text-muted-foreground">{t('attendance.studentName')}</span>
            <span className="text-xs font-medium text-muted-foreground">{t('attendance.status', 'Status')}</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {students.map((student) => {
              const status = records.get(student.id) || 'present';
              const cfg = segmentConfig[status];
              return (
                <div
                  key={student.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 border-l-4 transition-colors ${cfg.rowBorder} ${cfg.rowBg}`}
                >
                  {/* Student info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <IdentityAvatar
                      name={student.name}
                      className="h-9 w-9 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.student_id}</p>
                    </div>
                  </div>

                  {/* Segmented toggle */}
                  <div className="flex-shrink-0 flex rounded-lg border divide-x overflow-hidden">
                    {(['present', 'absent', 'excused'] as const).map(s => {
                      const c = segmentConfig[s];
                      const isActive = status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => hasPermission('attendance:manage') && setStatus(student.id, s)}
                          disabled={!hasPermission('attendance:manage')}
                          aria-label={c.label}
                          aria-pressed={isActive}
                          className={`h-9 px-2.5 sm:px-3.5 flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isActive
                              ? c.active
                              : 'bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          {c.icon}
                          <span className="sm:hidden">{c.abbrev}</span>
                          <span className="hidden sm:inline">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky bottom save bar */}
      {selectedClassId && students.length > 0 && hasPermission('attendance:manage') && (
        <div className="sticky bottom-0 z-10 -mx-4 md:-mx-8 border-t bg-card/95 backdrop-blur-sm px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {presentCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {absentCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              {excusedCount}
            </span>
            <span className="text-xs text-muted-foreground">/ {students.length}</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isExisting ? t('attendance.updateAttendance') : t('attendance.save')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Attendance;
