import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Users,
  ShieldBan,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { authClient } from '@/lib/auth-client';
import api from '@/lib/api';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  level: string | null;
  gender: 'male' | 'female';
  banned: boolean | null;
  is_homeroom_teacher: boolean;
  homeroom_class_id: string | null;
  createdAt: Date;
}

interface EditFormData {
  name: string;
  gender: 'male' | 'female';
  role: string;
  level: string;
  newPassword: string;
  is_homeroom_teacher: boolean;
  homeroom_class_id: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export function UserMaster() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'male' as 'male' | 'female',
    role: 'user',
    level: '',
    is_homeroom_teacher: false,
    homeroom_class_id: '',
  });
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: '',
    gender: 'male',
    role: 'user',
    level: '',
    newPassword: '',
    is_homeroom_teacher: false,
    homeroom_class_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('users.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) return;
    
    setIsSubmitting(true);
    try {
      const response = await authClient.admin.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as "user" | "admin",
        data: {
          gender: formData.gender,
          level: formData.role === 'librarian' ? formData.level || null : null,
          isHomeroomTeacher: formData.role === 'teacher' ? formData.is_homeroom_teacher : false,
          homeroomClassId: formData.role === 'teacher' && formData.is_homeroom_teacher ? formData.homeroom_class_id || null : null,
        },
      });
      
      if (response.data) {
        await fetchUsers();
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success(t('users.createSuccess'));
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error?.message || t('users.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      // Update name, gender, role via direct DB route
      await api.put(`/users/${selectedUser.id}`, {
        name: editFormData.name,
        gender: editFormData.gender,
        role: editFormData.role,
        level: editFormData.role === 'librarian' ? editFormData.level || null : null,
        is_homeroom_teacher: editFormData.role === 'teacher' ? editFormData.is_homeroom_teacher : false,
        homeroom_class_id: editFormData.role === 'teacher' && editFormData.is_homeroom_teacher ? editFormData.homeroom_class_id || null : null,
      });

      // Update password if provided (via better-auth admin API)
      if (editFormData.newPassword) {
        await authClient.admin.setUserPassword({
          userId: selectedUser.id,
          newPassword: editFormData.newPassword,
        });
      }
      
      await fetchUsers();
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast.success(t('users.updateSuccess'));
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('users.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await authClient.admin.removeUser({
        userId: selectedUser.id,
      });
      
      await fetchUsers();
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success(t('users.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('users.failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async (user: User) => {
    try {
      if (user.banned) {
        await authClient.admin.unbanUser({ userId: user.id });
      } else {
        await authClient.admin.banUser({ userId: user.id });
      }
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling ban status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      gender: 'male',
      role: 'user',
      level: '',
      is_homeroom_teacher: false,
      homeroom_class_id: '',
    });
    setShowPassword(false);
    setShowEditPassword(false);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      gender: user.gender || 'male',
      role: user.role || 'user',
      level: user.level || '',
      newPassword: '',
      is_homeroom_teacher: user.is_homeroom_teacher || false,
      homeroom_class_id: user.homeroom_class_id || '',
    });
    setShowEditPassword(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'librarian':
        return 'default';
      case 'teacher':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const columns: DataTableColumn<User>[] = useMemo(() => [
    {
      key: 'name',
      header: t('common.name'),
      sortable: true,
      getValue: (row) => row.name,
      render: (user) => (
        <div className="flex items-center gap-3">
          <PersonAvatar name={user.name} gender={user.gender || 'male'} className="h-10 w-10" />
          <span className="font-medium text-foreground">{user.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('users.email'),
      sortable: true,
      getValue: (row) => row.email,
      render: (user) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{user.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('users.role'),
      sortable: true,
      getValue: (row) => row.role || 'user',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
            <Shield className="h-3 w-3 mr-1" />
            {user.role || 'user'}
          </Badge>
          {user.level && (
            <Badge variant="outline" className="text-xs capitalize">
              {user.level}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortable: true,
      getValue: (row) => row.banned ? t('users.banned') : t('users.active'),
      render: (user) => (
        <Badge variant={user.banned ? 'destructive' : 'outline'}>
          {user.banned ? t('users.banned') : t('users.active')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('common.createdAt'),
      sortable: true,
      getValue: (row) => String(row.createdAt),
      render: (user) => (
        <span className="text-muted-foreground text-xs">
          {new Date(user.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {hasPermission('users:edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(user)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          )}
          {hasPermission('users:edit') && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 text-muted-foreground ${user.banned ? 'hover:text-green-600' : 'hover:text-amber-600'}`}
            onClick={() => handleBanUser(user)}
            title={user.banned ? t('users.unbanUser') : t('users.banUser')}
          >
            {user.banned ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
          </Button>
          )}
          {hasPermission('users:delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={() => openDeleteDialog(user)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          )}
        </div>
      ),
    },
  ], [t]);

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
          <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('users.subtitle')}
          </p>
        </div>
        {hasPermission('users:create') && (
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('users.addUser')}
        </Button>
        )}
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
            placeholder={t('users.searchUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <DataTable
          data={filteredUsers}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/users/${row.id}`)}
          emptyIcon={Users}
          emptyTitle={t('users.noUsers')}
          emptyDescription={t('users.noUsersDesc')}
        />
      </motion.div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('users.createNewUser')}</DialogTitle>
            <DialogDescription>
              {t('users.createUserDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('users.fullName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('users.enterFullName')}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t('users.gender')}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('users.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('common.male')}</SelectItem>
                    <SelectItem value="female">{t('common.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('users.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('users.enterEmail')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('users.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('users.enterPassword')}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('users.role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value, level: '' })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'librarian' && (
              <div className="space-y-2">
                <Label htmlFor="level">{t('users.level')}</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('users.selectLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">{t('users.primaryLevel')}</SelectItem>
                    <SelectItem value="secondary">{t('users.secondaryLevel')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}            {formData.role === 'teacher' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-homeroom"
                    checked={formData.is_homeroom_teacher}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_homeroom_teacher: !!checked, homeroom_class_id: checked ? formData.homeroom_class_id : '' })}
                  />
                  <Label htmlFor="create-homeroom">{t('users.isHomeroomTeacher')}</Label>
                </div>
                {formData.is_homeroom_teacher && (
                  <div className="space-y-2">
                    <Label>{t('users.homeroomClass')}</Label>
                    <Select
                      value={formData.homeroom_class_id}
                      onValueChange={(value) => setFormData({ ...formData, homeroom_class_id: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t('users.selectClass')} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={isSubmitting || (formData.role === 'librarian' && !formData.level)}
              className="bg-navy hover:bg-navy/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {t('users.createUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
            <DialogDescription>
              {t('users.editUserDesc', { name: selectedUser?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.name')}</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder={t('users.enterFullName')}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.gender')}</Label>
                <Select
                  value={editFormData.gender}
                  onValueChange={(value: 'male' | 'female') => setEditFormData({ ...editFormData, gender: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('users.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('common.male')}</SelectItem>
                    <SelectItem value="female">{t('common.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value, level: '' })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editFormData.role === 'librarian' && (
              <div className="space-y-2">
                <Label>{t('users.level')}</Label>
                <Select
                  value={editFormData.level}
                  onValueChange={(value) => setEditFormData({ ...editFormData, level: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('users.selectLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">{t('users.primaryLevel')}</SelectItem>
                    <SelectItem value="secondary">{t('users.secondaryLevel')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {editFormData.role === 'teacher' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-homeroom"
                    checked={editFormData.is_homeroom_teacher}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_homeroom_teacher: !!checked, homeroom_class_id: checked ? editFormData.homeroom_class_id : '' })}
                  />
                  <Label htmlFor="edit-homeroom">{t('users.isHomeroomTeacher')}</Label>
                </div>
                {editFormData.is_homeroom_teacher && (
                  <div className="space-y-2">
                    <Label>{t('users.homeroomClass')}</Label>
                    <Select
                      value={editFormData.homeroom_class_id}
                      onValueChange={(value) => setEditFormData({ ...editFormData, homeroom_class_id: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t('users.selectClass')} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label>{t('users.newPassword')} <span className="text-muted-foreground text-xs">({t('users.leaveBlankPassword')})</span></Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                  placeholder={t('users.enterNewPassword')}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleEditUser} 
              disabled={isSubmitting}
              className="bg-navy hover:bg-navy/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('users.deleteUser')}</DialogTitle>
            <DialogDescription>
              {t('users.deleteConfirmMessage', { name: selectedUser?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('users.deleteUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
