import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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

const API_BASE = 'http://localhost:8080/api';

export function AddTeacher() {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const isEdit = Boolean(teacherId);

  const [nextTeacherId, setNextTeacherId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    is_homeroom_teacher: false,
    homeroom_class_id: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchClasses(), isEdit ? fetchTeacher() : fetchNextTeacherId()]).finally(() => setIsLoading(false));
  }, [teacherId]);

  const fetchClasses = async () => {
    const response = await fetch(`${API_BASE}/classes`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setClasses(data);
    }
  };

  const fetchNextTeacherId = async () => {
    const response = await fetch(`${API_BASE}/teachers/next-id`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setNextTeacherId(data.nextId);
    }
  };

  const fetchTeacher = async () => {
    const response = await fetch(`${API_BASE}/teachers/${teacherId}`, { credentials: 'include' });
    if (response.ok) {
      const data: Teacher = await response.json();
      setNextTeacherId(data.teacher_id);
      setFormData({
        name: data.name,
        gender: data.gender || 'male',
        is_homeroom_teacher: data.is_homeroom_teacher,
        homeroom_class_id: data.homeroom_class_id || '',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/teachers${isEdit ? `/${teacherId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          gender: formData.gender,
          is_homeroom_teacher: formData.is_homeroom_teacher,
          homeroom_class_id: formData.is_homeroom_teacher ? formData.homeroom_class_id : null,
        }),
      });

      if (response.ok) {
        navigate('/teachers');
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
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
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? 'Edit Teacher' : 'Add Teacher'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage teacher details</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-[20px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-5">
        <div className="space-y-2">
          <Label>Teacher ID</Label>
          <Input value={nextTeacherId} disabled className="rounded-xl bg-muted font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teacher Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter teacher name"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: 'male' | 'female') => setFormData((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
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
          />
          <Label htmlFor="is_homeroom_teacher">Homeroom Teacher</Label>
        </div>

        {formData.is_homeroom_teacher && (
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={formData.homeroom_class_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, homeroom_class_id: value }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select class" />
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

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate('/teachers')} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-navy hover:bg-navy/90 rounded-xl">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Teacher'}
          </Button>
        </div>
      </div>
    </div>
  );
}
