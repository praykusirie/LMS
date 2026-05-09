import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Users,
  ActivitySquare,
  BarChart3,
  School,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { usePermissions } from '@/lib/permissions';
import { type SchoolLevel, normalizeAssignedLevels } from '@/lib/teacher-levels';
import api from '@/lib/api';
import { toast } from 'sonner';

// ────────────────────────────────── types ─────────────────────────────────── //

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  level?: SchoolLevel | null;
  assigned_levels?: SchoolLevel[];
  is_homeroom_teacher: boolean;
  homeroom_class_name?: string | null;
  created_at: string;
}

interface TeacherStats {
  total_students: number;
  total_activities: number;
  avg_score: number;
}

interface ActivityRow {
  id: string;
  activity_id: string;
  name: string;
  date: string;
  total_marks: number;
  class_name: string;
  marks_entered: number;
}

interface OverviewData {
  teacher: Teacher;
  stats: TeacherStats;
  activities: ActivityRow[];
}

// ──────────────────────────────── component ───────────────────────────────── //

export function TeacherDetail() {
  const { t } = useTranslation();
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (teacherId) fetchOverview();
  }, [teacherId]);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<OverviewData>(`/teachers/${teacherId}/overview`);
      setOverview(data);
    } catch (error) {
      console.error('Error fetching teacher overview:', error);
      toast.error(t('teachers.failedToLoad', 'Failed to load teacher details'));
      navigate('/teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const columns: DataTableColumn<ActivityRow>[] = [
    {
      key: 'activity_id',
      header: t('classActivities.activityId', 'ID'),
      sortable: true,
      getValue: (row) => row.activity_id,
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.activity_id}</span>
      ),
    },
    {
      key: 'name',
      header: t('classActivities.activityName', 'Activity Name'),
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'class_name',
      header: t('classActivities.class', 'Class'),
      sortable: true,
      getValue: (row) => row.class_name,
    },
    {
      key: 'date',
      header: t('classActivities.date', 'Date'),
      sortable: true,
      getValue: (row) => row.date,
      render: (row) => (
        <span>{new Date(row.date).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'total_marks',
      header: t('classActivities.totalMarks', 'Total Marks'),
      sortable: true,
      getValue: (row) => row.total_marks,
      render: (row) => <span className="font-semibold">{row.total_marks}</span>,
    },
    {
      key: 'marks_entered',
      header: t('classActivities.marksEntered', 'Marks Entered'),
      sortable: true,
      getValue: (row) => row.marks_entered,
      render: (row) => (
        <Badge
          variant={row.marks_entered > 0 ? 'default' : 'secondary'}
          className="font-semibold"
        >
          {row.marks_entered}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const { teacher, stats, activities } = overview;
  const levels = normalizeAssignedLevels(teacher.assigned_levels, teacher.level ?? null);

  const statsCards = [
    {
      title: t('teachers.totalStudents', 'Students'),
      value: stats.total_students,
      icon: Users,
      color: 'navy' as const,
      delay: 0.1,
    },
    {
      title: t('teachers.totalActivities', 'Activities Created'),
      value: stats.total_activities,
      icon: ActivitySquare,
      color: 'green' as const,
      delay: 0.18,
    },
    {
      title: t('teachers.avgScore', 'Avg. Score (%)'),
      value: `${stats.avg_score ?? 0}%`,
      icon: BarChart3,
      color: 'amber' as const,
      delay: 0.26,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teachers')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        {hasPermission('teachers:edit') && (
          <Button
            onClick={() => navigate(`/teachers/${teacher.id}`)}
            className="bg-primary hover:bg-primary/90 rounded-xl h-10 gap-2"
          >
            <Edit2 className="h-4 w-4" />
            {t('common.edit', 'Edit')}
          </Button>
        )}
      </div>

      {/* Profile card */}
      <div>
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <PersonAvatar
              name={teacher.name}
              gender={teacher.gender}
              className="h-20 w-20 text-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{teacher.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{teacher.teacher_id}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {/* Gender badge */}
                <Badge
                  variant="secondary"
                  className={
                    teacher.gender === 'female'
                      ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }
                >
                  {t(`common.${teacher.gender}`, teacher.gender === 'female' ? 'Female' : 'Male')}
                </Badge>

                {/* Level badges */}
                {levels.map((lvl) => (
                  <Badge
                    key={lvl}
                    className={
                      lvl === 'primary'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    }
                  >
                    <School className="h-3 w-3 mr-1" />
                    {t(`teachers.level_${lvl}`, lvl.charAt(0).toUpperCase() + lvl.slice(1))}
                  </Badge>
                ))}

                {/* Homeroom badge */}
                {teacher.is_homeroom_teacher && teacher.homeroom_class_name && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Home className="h-3 w-3 mr-1" />
                    {t('teachers.homeroom', 'Homeroom')}: {teacher.homeroom_class_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((s) => (
          <div key={s.title} className="rounded-lg bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
                <h3 className="mt-2 text-2xl font-bold text-foreground">{s.value}</h3>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activities */}
      <div>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t('teachers.recentActivities', 'Recent Activities')}
          </h2>
          <DataTable<ActivityRow>
            data={activities}
            columns={columns}
            getRowId={(row) => row.id}
            emptyTitle={t('classActivities.noActivities', 'No activities found')}
          />
        </Card>
      </div>
    </div>
  );
}

