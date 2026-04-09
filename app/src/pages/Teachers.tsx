import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Plus, School, Loader2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { usePermissions } from '@/lib/permissions';

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  gender: 'male' | 'female';
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
  homeroom_class_name?: string | null;
  created_at: string;
}

const API_BASE = 'http://localhost:8080/api';

export function Teachers() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/teachers`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    try {
      const response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchTeachers();
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.teacher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (teacher.homeroom_class_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage teachers and homeroom assignments</p>
        </div>
        {hasPermission('teachers:create') && (
          <Button onClick={() => navigate('/add-teacher')} className="bg-navy hover:bg-navy/90">
            <Plus className="h-4 w-4 mr-2" />
            Add New Teacher
          </Button>
        )}
      </div>

      <div className="rounded-[20px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="mb-6 max-w-sm">
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Teacher ID</TableHead>
                <TableHead>Homeroom</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    No teachers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={teacher.name} gender={teacher.gender || 'male'} className="h-10 w-10" />
                        <span className="font-medium">{teacher.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{teacher.teacher_id}</TableCell>
                    <TableCell>
                      {teacher.is_homeroom_teacher ? (
                        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                          <BadgeCheck className="mr-1 h-3 w-3" />
                          {teacher.homeroom_class_name || 'Assigned'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(teacher.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission('teachers:edit') && (
                            <DropdownMenuItem onClick={() => navigate(`/teachers/${teacher.id}`)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {hasPermission('teachers:delete') && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(teacher.id)}>
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
