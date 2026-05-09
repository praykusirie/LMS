import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  FileSpreadsheet,
  Trophy,
  Award,
  Loader2,
  TrendingUp,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui-custom';

interface ClassItem {
  id: string;
  name: string;
  short_code: string;
}

interface Activity {
  id: string;
  name: string;
  activityId: string;
  totalMarks: number;
  date: string;
}

interface StudentResult {
  id: string;
  name: string;
  student_id: string;
  avatar: string | null;
  activities: {
    activityId: string;
    activityName: string;
    marksObtained: number | null;
    totalMarks: number;
    percentage: number | null;
  }[];
  totalObtained: number;
  totalPossible: number;
  average: number;
  percentage: number;
  grade: string;
  completedActivities: number;
  totalActivities: number;
  position: number;
}

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A*': return 'bg-emerald-600 text-white';
    case 'A': return 'bg-green-600 text-white';
    case 'B': return 'bg-blue-600 text-white';
    case 'C': return 'bg-amber-500 text-white';
    case 'D': return 'bg-orange-500 text-white';
    case 'E': return 'bg-red-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getPositionStyle = (position: number): string => {
  if (position === 1) return 'bg-yellow-400 text-yellow-900';
  if (position === 2) return 'bg-gray-300 text-gray-800';
  if (position === 3) return 'bg-amber-600 text-white';
  return 'bg-secondary text-muted-foreground';
};

export function Results() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [summary, setSummary] = useState({
    totalActivities: 0,
    totalStudents: 0,
    classAverage: 0,
    classGrade: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchResults();
    }
  }, [selectedClass, period]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = { class_id: selectedClass };
      if (period !== 'all') {
        const today = new Date();
        const from = new Date(today);
        if (period === 'week') from.setDate(today.getDate() - 7);
        else from.setDate(today.getDate() - 30);
        params.date_from = from.toISOString().split('T')[0];
        params.date_to = today.toISOString().split('T')[0];
      }
      const { data } = await api.get('/results', { params });
      setActivities(data.activities);
      setStudents(data.students);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error(t('results.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedClass) {
      toast.error(t('results.selectClassFirst'));
      return;
    }

    setIsExporting(true);
    try {
      const response = await api.get('/results/export', {
        params: { class_id: selectedClass },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `results_${classes.find(c => c.id === selectedClass)?.name || 'class'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('results.exportSuccess'));
    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error(t('results.failedToExport'));
    } finally {
      setIsExporting(false);
    }
  };

  // Build dynamic columns
  const columns: DataTableColumn<StudentResult>[] = useMemo(() => {
    const baseColumns: DataTableColumn<StudentResult>[] = [
      {
        key: 'position',
        header: t('results.position'),
        sortable: true,
        render: (student) => (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionStyle(student.position)}`}>
            {student.position}
          </div>
        ),
      },
      {
        key: 'name',
        header: t('results.student'),
        sortable: true,
        render: (student) => (
          <div className="flex items-center gap-3">
            <IdentityAvatar name={student.name} className="h-9 w-9" />
            <div>
              <div className="font-medium text-foreground">{student.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{student.student_id}</div>
            </div>
          </div>
        ),
      },
    ];

    // Add activity columns
    const activityColumns: DataTableColumn<StudentResult>[] = activities.map(activity => ({
      key: `activity_${activity.id}`,
      header: activity.name,
      sortable: true,
      render: (student) => {
        const result = student.activities.find(a => a.activityId === activity.id);
        if (!result || result.marksObtained === null) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="text-right">
            <span className="font-medium">{result.marksObtained}</span>
            <span className="text-xs text-muted-foreground">/{result.totalMarks}</span>
            <div className="text-xs text-muted-foreground">
              {Math.round((result.marksObtained / result.totalMarks) * 100)}%
            </div>
          </div>
        );
      },
    }));

    const summaryColumns: DataTableColumn<StudentResult>[] = [
      {
        key: 'average',
        header: t('results.average'),
        sortable: true,
        render: (student) => (
          <div className="text-right">
            <span className="font-bold text-primary">{Math.round(student.percentage)}%</span>
            <div className="text-xs text-muted-foreground">
              {student.totalObtained}/{student.totalPossible}
            </div>
          </div>
        ),
      },
      {
        key: 'grade',
        header: t('results.grade'),
        sortable: true,
        render: (student) => (
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold ${getGradeColor(student.grade)}`}>
            {student.grade}
          </div>
        ),
      },
      {
        key: 'progress',
        header: t('results.progress'),
        render: (student) => (
          <div className="w-20">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${(student.completedActivities / student.totalActivities) * 100}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-center">
              {student.completedActivities}/{student.totalActivities}
            </div>
          </div>
        ),
      },
    ];

    return [...baseColumns, ...activityColumns, ...summaryColumns];
  }, [activities, t]);

  const periodOptions = [
    { value: 'week', label: t('results.weekFilter') },
    { value: 'month', label: t('results.monthFilter') },
    { value: 'all', label: t('results.allTime') },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('results.title')}
        description={t('results.viewAndExport')}
        action={
          selectedClass && students.length > 0
            ? {
                label: t('results.exportToExcel'),
                icon: FileSpreadsheet,
                onClick: handleExport,
                disabled: isExporting,
              }
            : undefined
        }
      />

      {/* Controls card: class selector + period filter */}
      <div className="rounded-xl border bg-card shadow-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <Label className="text-xs font-medium text-muted-foreground">{t('results.selectClass')}</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="rounded-lg h-10 w-full sm:w-[280px]">
                <GraduationCap className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t('results.chooseClass')} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('results.period')}</Label>
            <div className="flex rounded-lg border overflow-hidden divide-x h-10">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 text-xs font-medium transition-colors ${
                    period === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {selectedClass && !isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-card rounded-xl border shadow-card flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('results.totalActivities')}</p>
              <p className="text-xl font-bold tabular-nums">{summary.totalActivities}</p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border shadow-card flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('results.totalStudents')}</p>
              <p className="text-xl font-bold tabular-nums">{summary.totalStudents}</p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border shadow-card flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('results.classAverage')}</p>
              <p className="text-xl font-bold tabular-nums">{Math.round(summary.classAverage)}%</p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border shadow-card flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getGradeColor(summary.classGrade)}`}>
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('results.classGrade')}</p>
              <p className="text-xl font-bold">{summary.classGrade || 'â€”'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile student cards (hidden lg+) */}
      {selectedClass && !isLoading && students.length > 0 && (
        <div className="lg:hidden rounded-xl border bg-card shadow-card overflow-hidden">
          {/* Column header */}
          <div className="flex items-center px-4 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <span className="w-8 text-center">#</span>
            <span className="flex-1 ml-3">{t('results.student')}</span>
            <span className="w-14 text-right">{t('results.average')}</span>
            <span className="w-10 text-right ml-2">{t('results.grade')}</span>
            <span className="w-6" />
          </div>

          <div className="divide-y">
            {students.map((student) => {
              const isExpanded = expandedStudent === student.id;
              return (
                <div key={student.id}>
                  <button
                    type="button"
                    className="w-full flex items-center px-4 py-3 gap-2 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                  >
                    {/* Position badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getPositionStyle(student.position)}`}>
                      {student.position}
                    </div>
                    {/* Avatar + name */}
                    <IdentityAvatar name={student.name} className="h-8 w-8 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.student_id}</p>
                    </div>
                    {/* Avg % */}
                    <span className="w-14 text-right font-bold text-primary text-sm tabular-nums">
                      {Math.round(student.percentage)}%
                    </span>
                    {/* Grade badge */}
                    <div className={`w-9 h-9 ml-2 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeColor(student.grade)}`}>
                      {student.grade}
                    </div>
                    {/* Expand chevron */}
                    <div className="w-6 flex justify-end flex-shrink-0">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded per-activity rows */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1.5 bg-muted/20">
                      {student.activities.map((act) => {
                        const pct = act.marksObtained !== null && act.totalMarks > 0
                          ? Math.round((act.marksObtained / act.totalMarks) * 100)
                          : null;
                        return (
                          <div key={act.activityId} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                            <p className="text-xs text-muted-foreground flex-1 truncate pr-4">{act.activityName}</p>
                            <div className="flex items-center gap-2 text-xs tabular-nums">
                              {act.marksObtained !== null ? (
                                <>
                                  <span className="font-medium">{act.marksObtained}/{act.totalMarks}</span>
                                  {pct !== null && (
                                    <span className={`font-medium ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {pct}%
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">â€”</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1 text-xs font-medium">
                        <span className="text-muted-foreground">{t('results.progress')}</span>
                        <span>{student.completedActivities}/{student.totalActivities}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop DataTable (hidden below lg) */}
      {selectedClass && (
        <div className="hidden lg:block rounded-xl bg-card shadow-card overflow-hidden border">
          <DataTable
            data={students}
            columns={columns}
            isLoading={isLoading}
            getRowId={(row) => row.id}
            emptyIcon={Trophy}
            emptyTitle={t('results.noResults')}
            emptyDescription={
              activities.length === 0
                ? t('results.noActivitiesDesc')
                : t('results.noMarksDesc')
            }
          />
        </div>
      )}

      {/* Loading on mobile when class is selected */}
      {selectedClass && isLoading && (
        <div className="lg:hidden flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state: no class selected */}
      {!selectedClass && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <GraduationCap className="h-14 w-14 mb-4 opacity-40" />
          <p className="text-sm">{t('results.selectClassToView')}</p>
        </div>
      )}
    </div>
  );
}

