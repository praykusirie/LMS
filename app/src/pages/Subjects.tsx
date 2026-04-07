import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  BookMarked,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui-custom';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  bookCount: number;
  isActive: boolean;
  createdAt: string;
}

const initialSubjects: Subject[] = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH', description: 'Mathematical studies', bookCount: 180, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub2', name: 'English', code: 'ENG', description: 'English language and literature', bookCount: 220, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub3', name: 'Science', code: 'SCI', description: 'General science studies', bookCount: 150, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub4', name: 'History', code: 'HIST', description: 'Historical studies', bookCount: 95, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub5', name: 'Geography', code: 'GEO', description: 'Geographical studies', bookCount: 75, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub6', name: 'Physics', code: 'PHY', description: 'Physics studies', bookCount: 120, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub7', name: 'Chemistry', code: 'CHEM', description: 'Chemistry studies', bookCount: 110, isActive: true, createdAt: '2024-01-01' },
  { id: 'sub8', name: 'Biology', code: 'BIO', description: 'Biology studies', bookCount: 130, isActive: true, createdAt: '2024-01-01' },
];

export function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subjects, searchQuery]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateId = () => `sub${Date.now()}`;

  const handleAdd = () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Subject name is required');
      return;
    }

    const newSubject: Subject = {
      id: generateId(),
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      bookCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setSubjects([...subjects, newSubject]);
    setShowAddDialog(false);
    setFormData({ name: '', code: '', description: '' });
    showNotification('success', 'Subject added successfully');
  };

  const handleEdit = () => {
    if (!selectedSubject || !formData.name.trim()) {
      showNotification('error', 'Subject name is required');
      return;
    }

    setSubjects(subjects.map(s => 
      s.id === selectedSubject.id 
        ? { ...s, name: formData.name.trim(), code: formData.code.trim().toUpperCase(), description: formData.description.trim() }
        : s
    ));
    setShowEditDialog(false);
    setSelectedSubject(null);
    setFormData({ name: '', code: '', description: '' });
    showNotification('success', 'Subject updated successfully');
  };

  const handleDelete = () => {
    if (!selectedSubject) return;

    setSubjects(subjects.filter(s => s.id !== selectedSubject.id));
    setShowDeleteDialog(false);
    setSelectedSubject(null);
    showNotification('success', 'Subject deleted successfully');
  };

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({ name: subject.name, code: subject.code, description: subject.description });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {notification.message}
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage academic subjects for book classification
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', code: '', description: '' });
            setShowAddDialog(true);
          }}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.length}</p>
              <p className="text-sm text-muted-foreground">Total Subjects</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.filter(s => s.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active Subjects</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subjects.reduce((sum, s) => sum + s.bookCount, 0)}</p>
              <p className="text-sm text-muted-foreground">Total Books</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="No subjects found"
            description="Add your first subject to get started."
            actionLabel="Add Subject"
            onAction={() => setShowAddDialog(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Books
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr 
                    key={subject.id} 
                    className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                          <BookMarked className="h-5 w-5 text-navy" />
                        </div>
                        <span className="font-medium text-foreground">{subject.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
                        {subject.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {subject.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {subject.bookCount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subject.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {subject.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(subject)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Name *</Label>
              <Input
                placeholder="e.g., Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Code</Label>
              <Input
                placeholder="e.g., MATH"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Mathematical studies"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-navy hover:bg-navy/90 rounded-xl">
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Name *</Label>
              <Input
                placeholder="e.g., Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Code</Label>
              <Input
                placeholder="e.g., MATH"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Mathematical studies"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-navy hover:bg-navy/90 rounded-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedSubject?.name}</span>? 
              This action cannot be undone.
            </p>
            {selectedSubject && selectedSubject.bookCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This subject has {selectedSubject.bookCount} books assigned.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive" className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
