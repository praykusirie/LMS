import { useEffect, useState } from 'react';
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

interface ClassItem {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
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
    level: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchClasses(), isEdit ? fetchTeacher() : fetchNextTeacherId()]).finally(() => setIsLoading(false));
  }, [teacherId]);

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
      level: (data as any).level || '',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        gender: formData.gender,
        is_homeroom_teacher: formData.is_homeroom_teacher,
        homeroom_class_id: formData.is_homeroom_teacher ? formData.homeroom_class_id : null,
        level: isAdmin ? (formData.level || null) : userLevel,
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

      <div className="max-w-2xl rounded-[20px] bg-card p-6 shadow-card-sm space-y-5">
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
                {classes.map((classItem) => (
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
          <Select
            value={isAdmin ? formData.level : (userLevel || '')}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, level: value }))}
            disabled={isViewMode || !isAdmin}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={isAdmin ? t('teachers.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : 'No level')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">{t('teachers.primaryLevel')}</SelectItem>
              <SelectItem value="secondary">{t('teachers.secondaryLevel')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate('/teachers')} className="rounded-xl">
            {isViewMode ? t('common.back') : t('common.cancel')}
          </Button>
          {isViewMode ? (
            <Button onClick={() => navigate(`/teachers/${teacherId}`)} className="bg-navy hover:bg-navy/90 rounded-xl">
              <Edit2 className="h-4 w-4 mr-2" />
              {t('teachers.editTeacher')}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving} className="bg-navy hover:bg-navy/90 rounded-xl">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEdit ? t('common.save') : t('teachers.createTeacher')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
