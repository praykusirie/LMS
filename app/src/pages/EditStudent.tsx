import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
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
import { PageHeader } from '@/components/ui-custom';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';

interface ClassItem {
  id: string;
  name: string;
}

export function EditStudent() {
  const { t } = useTranslation();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    class_id: '',
    gender: 'male' as 'male' | 'female' | 'other',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    parent_email: '',
    parent_phone: '',
    address: '',
    level: '',
  });

  useEffect(() => {
    fetchClasses();
    if (studentId) fetchStudent();
  }, [studentId]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudent = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/students/${studentId}`);
      setStudentName(data.name);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        class_id: data.class_id || '',
        gender: data.gender || 'male',
        email: data.email || '',
        phone: data.phone || '',
        dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
        nationality: data.nationality || '',
        parent_email: data.parent_email || '',
        parent_phone: data.parent_phone || '',
        address: data.address || '',
        level: data.level || userLevel || '',
      });
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error(t('students.failedToLoadDetails'));
      navigate('/students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setIsSubmitting(true);
    try {
      await api.put(`/students/${studentId}`, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        class_id: formData.class_id || null,
        gender: formData.gender,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        dob: formData.dob || null,
        nationality: formData.nationality.trim() || null,
        parent_email: formData.parent_email.trim() || null,
        parent_phone: formData.parent_phone.trim() || null,
        address: formData.address.trim() || null,
        level: isAdmin ? (formData.level || null) : (userLevel || null),
      });
      toast.success(t('students.updateSuccess'));
      navigate(`/students/${studentId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('students.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.editStudent')}
        description={studentName}
        action={{
          label: t('common.back'),
          icon: ArrowLeft,
          onClick: () => navigate(`/students/${studentId}`),
        }}
      />

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('students.firstName')} <span className="text-destructive">*</span></Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder={t('students.enterFirstName')}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('students.lastName')} <span className="text-destructive">*</span></Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder={t('students.enterLastName')}
                className="h-11 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Class + Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('students.class')}</Label>
              <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={t('students.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('students.gender')}</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v as 'male' | 'female' | 'other' })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('common.male')}</SelectItem>
                  <SelectItem value="female">{t('common.female')}</SelectItem>
                  <SelectItem value="other">{t('common.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DOB + Nationality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">{t('students.dateOfBirth')}</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">{t('students.nationality')}</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="e.g., Tanzanian"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('students.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('students.enterEmail')}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('students.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('students.enterPhone')}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Parent Email + Parent Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parent_email">{t('students.parentEmail')}</Label>
              <Input
                id="parent_email"
                type="email"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                placeholder={t('students.enterParentEmail')}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_phone">{t('students.parentPhoneLabel')}</Label>
              <Input
                id="parent_phone"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder={t('students.enterParentPhone')}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Level (admin only) */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>{t('students.level')}</Label>
              <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                <SelectTrigger className="h-11 rounded-xl w-full md:w-[200px]">
                  <SelectValue placeholder={t('students.selectLevel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('students.primary')}</SelectItem>
                  <SelectItem value="secondary">{t('students.secondary')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">{t('students.address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('students.enterAddress')}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-11"
            onClick={() => navigate(`/students/${studentId}`)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 rounded-xl h-11"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
