import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/permissions';

interface ClassItem {
  id: string;
  name: string;
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

  // Fetch classes (admin) or homeroom class (teacher)
  useEffect(() => {
    const init = async () => {
      if (isAdmin) {
        try {
          const { data } = await api.get('/classes');
          setClasses(data);
        } catch {
          toast.error(t('common.error'));
        }
      } else {
        try {
          const { data } = await api.get('/attendance/my-class');
          if (data.class_id) {
            setHomeroomClassId(data.class_id);
            setSelectedClassId(data.class_id);
            setClasses([{ id: data.class_id, name: data.class_name }]);
          }
        } catch {
          toast.error(t('common.error'));
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
        // Fetch students in this class
        const { data: studentsData } = await api.get('/students');
        const classStudents = studentsData.filter((s: any) => s.class_id === selectedClassId && s.is_active !== false);
        setStudents(classStudents);

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
          classStudents.forEach((s: Student) => {
            defaults.set(s.id, 'present');
          });
          setRecords(defaults);
        }
      } catch {
        toast.error(t('common.error'));
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
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Array.from(records.values()).filter(s => s === 'present').length;
  const absentCount = Array.from(records.values()).filter(s => s === 'absent').length;
  const excusedCount = Array.from(records.values()).filter(s => s === 'excused').length;

  const statusColors = {
    present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    excused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  };

  const statusIcons = {
    present: <CheckCircle2 className="h-4 w-4" />,
    absent: <XCircle className="h-4 w-4" />,
    excused: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('attendance.title')}</h1>
          <p className="text-muted-foreground">{t('attendance.subtitle')}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>{t('attendance.selectDate')}</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-xl w-[180px]"
          />
        </div>
        {isAdmin ? (
          <div className="space-y-2">
            <Label>{t('attendance.selectClass')}</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="rounded-xl w-[200px]">
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
            <div className="space-y-2">
              <Label>{t('attendance.selectClass')}</Label>
              <div className="px-3 py-2 rounded-xl border bg-muted text-sm font-medium">
                {classes[0]?.name || '—'}
              </div>
            </div>
          )
        )}
      </div>

      {/* Summary badges */}
      {selectedClassId && students.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className={statusColors.present}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('attendance.presentCount', { count: presentCount })}
          </Badge>
          <Badge variant="outline" className={statusColors.absent}>
            <XCircle className="h-3 w-3 mr-1" />
            {t('attendance.absentCount', { count: absentCount })}
          </Badge>
          <Badge variant="outline" className={statusColors.excused}>
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('attendance.excusedCount', { count: excusedCount })}
          </Badge>
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {t('attendance.summary')}: {students.length}
          </Badge>
        </div>
      )}

      {/* Mark All Buttons */}
      {selectedClassId && students.length > 0 && hasPermission('attendance:manage') && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => markAll('present')} className="text-green-700 border-green-300">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {t('attendance.markAll')} {t('attendance.present')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => markAll('absent')} className="text-red-700 border-red-300">
            <XCircle className="h-4 w-4 mr-1" />
            {t('attendance.markAll')} {t('attendance.absent')}
          </Button>
        </div>
      )}

      {/* Student List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedClassId ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('attendance.selectClass')}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('attendance.noStudents')}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-2 p-3 border-b font-medium text-sm text-muted-foreground">
            <div>{t('attendance.studentName')}</div>
            <div className="hidden sm:block text-center">{t('attendance.present')}</div>
            <div className="hidden sm:block text-center">{t('attendance.absent')}</div>
            <div className="hidden sm:block text-center">{t('attendance.excused')}</div>
          </div>
          {students.map((student, idx) => {
            const status = records.get(student.id) || 'present';
            return (
              <div
                key={student.id}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-2 p-3 items-center ${
                  idx < students.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.student_id}</p>
                  </div>
                </div>
                {/* Mobile: toggle buttons inline */}
                <div className="flex gap-1 sm:contents">
                  <button
                    type="button"
                    onClick={() => setStatus(student.id, 'present')}
                    className={`rounded-lg px-2 py-1 text-xs font-medium border transition-colors ${
                      status === 'present' ? statusColors.present : 'bg-muted/50 text-muted-foreground border-transparent'
                    }`}
                    disabled={!hasPermission('attendance:manage')}
                  >
                    {statusIcons.present}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(student.id, 'absent')}
                    className={`rounded-lg px-2 py-1 text-xs font-medium border transition-colors ${
                      status === 'absent' ? statusColors.absent : 'bg-muted/50 text-muted-foreground border-transparent'
                    }`}
                    disabled={!hasPermission('attendance:manage')}
                  >
                    {statusIcons.absent}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(student.id, 'excused')}
                    className={`rounded-lg px-2 py-1 text-xs font-medium border transition-colors ${
                      status === 'excused' ? statusColors.excused : 'bg-muted/50 text-muted-foreground border-transparent'
                    }`}
                    disabled={!hasPermission('attendance:manage')}
                  >
                    {statusIcons.excused}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {selectedClassId && students.length > 0 && hasPermission('attendance:manage') && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-navy hover:bg-navy/90"
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
    </motion.div>
  );
};

export default Attendance;
