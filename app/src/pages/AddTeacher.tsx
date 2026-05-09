import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import {
  SCHOOL_LEVELS,
  type SchoolLevel,
  filterClassesByLevels,
  normalizeAssignedLevels,
  primaryAssignedLevel,
  toggleAssignedLevel,
} from '@/lib/teacher-levels';

interface ClassItem {
  id: string;
  name: string;
  level?: SchoolLevel | null;
}

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
  level?: SchoolLevel | null;
  assigned_levels?: SchoolLevel[];
}

export function AddTeacher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get('mode') === 'view';
  const isEdit = Boolean(teacherId);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [nextTeacherId, setNextTeacherId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    is_homeroom_teacher: false,
    homeroom_class_id: '',
    assigned_levels: [] as SchoolLevel[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveAssignedLevels = useMemo(
    () => normalizeAssignedLevels(formData.assigned_levels, isAdmin ? null : userLevel),
    [formData.assigned_levels, isAdmin, userLevel],
  );
  const availableHomeroomClasses = useMemo(
    () => filterClassesByLevels(classes, effectiveAssignedLevels),
    [classes, effectiveAssignedLevels],
  );

  useEffect(() => {
    Promise.all([fetchClasses(), isEdit ? fetchTeacher() : fetchNextTeacherId()]).finally(() => setIsLoading(false));
  }, [teacherId]);

  useEffect(() => {
    if (
      formData.is_homeroom_teacher &&
      formData.homeroom_class_id &&
      !availableHomeroomClasses.some((classItem) => classItem.id === formData.homeroom_class_id)
    ) {
      setFormData((prev) => ({ ...prev, homeroom_class_id: '' }));
    }
  }, [availableHomeroomClasses, formData.homeroom_class_id, formData.is_homeroom_teacher]);

  const fetchClasses = async () => {
    const { data } = await api.get('/classes');
    setClasses(data);
  };

  const fetchNextTeacherId = async () => {
    const { data } = await api.get('/teachers/next-id');
    setNextTeacherId(data.nextId);
  };

  const fetchTeacher = async () => {
    const { data } = await api.get<Teacher>(`/teachers/${teacherId}`);
    setNextTeacherId(data.teacher_id);
    setFormData({
      name: data.name,
      gender: data.gender || 'male',
      is_homeroom_teacher: data.is_homeroom_teacher,
      homeroom_class_id: data.homeroom_class_id || '',
      assigned_levels: normalizeAssignedLevels(data.assigned_levels, data.level || null),
    });
  };

  const handleSave = async () => {
    const assignedLevels = effectiveAssignedLevels;
    if (!formData.name.trim()) return;
    if (assignedLevels.length === 0) {
      toast.error(t('teachers.selectLevel'));
      return;
    }
    if (formData.is_homeroom_teacher && !formData.homeroom_class_id) {
      toast.error(t('teachers.selectClass'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        gender: formData.gender,
        is_homeroom_teacher: formData.is_homeroom_teacher,
        homeroom_class_id: formData.is_homeroom_teacher ? formData.homeroom_class_id : null,
        level: primaryAssignedLevel(assignedLevels),
        assigned_levels: assignedLevels,
      };

      if (isEdit) {
        await api.put(`/teachers/${teacherId}`, payload);
      } else {
        await api.post('/teachers', payload);
      }
      toast.success(isEdit ? t('teachers.updateSuccess') : t('teachers.addSuccess'));
      navigate('/teachers');
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      toast.error(error?.message || t('teachers.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teachers')} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isViewMode ? t('teachers.teacherDetails') : isEdit ? t('teachers.editTeacher') : t('teachers.addTeacher')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('teachers.manageDetails')}</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg bg-card p-6 shadow-card-sm space-y-5">
        <div className="space-y-2">
          <Label>{t('teachers.teacherId')}</Label>
          <Input value={nextTeacherId} disabled className="rounded-xl bg-muted font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('teachers.teacherName')}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('teachers.enterName')}
              className="rounded-xl"
              disabled={isViewMode}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('teachers.gender')}</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: 'male' | 'female') => setFormData((prev) => ({ ...prev, gender: value }))}
              disabled={isViewMode}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t('teachers.selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('common.male')}</SelectItem>
                <SelectItem value="female">{t('common.female')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_homeroom_teacher"
            checked={formData.is_homeroom_teacher}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                is_homeroom_teacher: checked === true,
                homeroom_class_id: checked === true ? prev.homeroom_class_id : '',
              }))
            }
            disabled={isViewMode}
          />
          <Label htmlFor="is_homeroom_teacher">{t('teachers.homeroomTeacher')}</Label>
        </div>

        {formData.is_homeroom_teacher && (
          <div className="space-y-2">
            <Label>{t('students.class')}</Label>
            <Select
              value={formData.homeroom_class_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, homeroom_class_id: value }))}
              disabled={isViewMode}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t('teachers.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                {availableHomeroomClasses.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('teachers.level')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCHOOL_LEVELS.map((level) => (
              <label
                key={level}
                className="flex items-center gap-3 rounded-xl border bg-background px-3 py-3 text-sm"
              >
                <Checkbox
                  checked={effectiveAssignedLevels.includes(level)}
                  onCheckedChange={(checked) => {
                    if (!isAdmin) return;
                    setFormData((prev) => ({
                      ...prev,
                      assigned_levels: toggleAssignedLevel(prev.assigned_levels, level, checked === true),
                    }));
                  }}
                  disabled={isViewMode || !isAdmin}
                />
                <span>{level === 'primary' ? t('teachers.primaryLevel') : t('teachers.secondaryLevel')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate('/teachers')} className="rounded-xl">
            {isViewMode ? t('common.back') : t('common.cancel')}
          </Button>
          {isViewMode ? (
            <Button onClick={() => navigate(`/teachers/${teacherId}`)} className="bg-primary hover:bg-primary/90 rounded-xl">
              <Edit2 className="h-4 w-4 mr-2" />
              {t('teachers.editTeacher')}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || effectiveAssignedLevels.length === 0 || (formData.is_homeroom_teacher && !formData.homeroom_class_id)}
              className="bg-primary hover:bg-primary/90 rounded-xl"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEdit ? t('common.save') : t('teachers.createTeacher')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
