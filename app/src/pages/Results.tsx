import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  GraduationCap,
  FileSpreadsheet,
  Trophy,
  Award,
  Loader2,
  TrendingUp,
  Users,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { LazyBookCover } from '@/components/shared/LazyBookCover';
import { Label } from '@/components/ui/label';

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

const generateAvatar = (name: string) => {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A*': return 'bg-emerald-500 text-white';
    case 'A': return 'bg-green-50 dark:bg-green-950/300 text-white';
    case 'B': return 'bg-blue-50 dark:bg-blue-950/300 text-white';
    case 'C': return 'bg-yellow-500 text-white';
    case 'D': return 'bg-orange-500 text-white';
    case 'E': return 'bg-red-400 text-white';
    default: return 'bg-gray-400 text-white';
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
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [summary, setSummary] = useState({
    totalActivities: 0,
    totalStudents: 0,
    classAverage: 0,
    classGrade: ''
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchResults();
    }
  }, [selectedClass]);

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
      const { data } = await api.get('/results', {
        params: { class_id: selectedClass }
      });
      
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
            <LazyBookCover
              src={student.avatar}
              fallbackSrc={generateAvatar(student.name)}
              alt={student.name}
              containerClassName="h-10 w-10 rounded-full"
            />
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
            <span className="font-bold text-navy">{student.percentage}%</span>
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
                className="h-full bg-navy rounded-full"
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
  }, [activities]);

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
          <h1 className="text-2xl font-bold text-foreground">{t('results.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('results.viewAndExport')}
          </p>
        </div>
        <Button 
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 rounded-xl h-11"
          disabled={isExporting || !selectedClass || students.length === 0}
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          {t('results.exportToExcel')}
        </Button>
      </motion.div>

      {/* Class Selector */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center gap-4 p-4 bg-card rounded-[20px] shadow-card"
      >
        <div className="h-12 w-12 rounded-xl bg-navy/10 flex items-center justify-center">
          <GraduationCap className="h-6 w-6 text-navy" />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">{t('results.selectClass')}</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[300px] rounded-xl h-11 mt-1">
              <SelectValue placeholder={t('results.chooseClass')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </motion.div>

      {/* Summary Cards */}
      {selectedClass && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="p-4 bg-card rounded-[20px] shadow-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('results.totalActivities')}</p>
                <p className="text-xl font-bold">{summary.totalActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-[20px] shadow-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('results.totalStudents')}</p>
                <p className="text-xl font-bold">{summary.totalStudents}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-[20px] shadow-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('results.classAverage')}</p>
                <p className="text-xl font-bold">{summary.classAverage}%</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-[20px] shadow-card">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${getGradeColor(summary.classGrade)}`}>
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('results.classGrade')}</p>
                <p className="text-xl font-bold">{summary.classGrade || '-'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Table */}
      {selectedClass && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-[20px] bg-card p-6 shadow-card"
        >
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
        </motion.div>
      )}

      {!selectedClass && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-muted-foreground"
        >
          <GraduationCap className="h-16 w-16 mb-4" />
          <p className="text-lg">{t('results.selectClassToView')}</p>
        </motion.div>
      )}
    </div>
  );
}
