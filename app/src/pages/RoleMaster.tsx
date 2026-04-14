import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Search, 
  Edit2, 
  Trash2, 
  Plus,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';

interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export function RoleMaster() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/roles');
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(t('roles.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/roles', formData);
      await fetchRoles();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success(t('roles.createSuccess'));
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error?.message || t('roles.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !formData.name) return;
    
    setIsSubmitting(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, formData);
      await fetchRoles();
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      resetForm();
      toast.success(t('roles.updateSuccess'));
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(t('roles.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    setIsSubmitting(true);
    try {
      await api.delete(`/roles/${selectedRole.id}`);
      await fetchRoles();
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      toast.success(t('roles.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(t('roles.failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  const isSystemRole = (roleName: string) => {
    return ['admin', 'user'].includes(roleName.toLowerCase());
  };

  const columns: DataTableColumn<Role>[] = useMemo(() => [
    {
      key: 'name',
      header: t('roles.roleName'),
      sortable: true,
      getValue: (row) => row.name,
      render: (role) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
            <Shield className="h-5 w-5 text-navy" />
          </div>
          <span className="font-medium text-foreground capitalize">{role.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('roles.description'),
      sortable: true,
      getValue: (row) => row.description,
      render: (role) => (
        <span className="text-muted-foreground max-w-[300px] truncate block">{role.description || '-'}</span>
      ),
    },
    {
      key: 'type',
      header: t('roles.type'),
      sortable: true,
      getValue: (row) => isSystemRole(row.name) ? t('roles.system') : t('roles.custom'),
      render: (role) => (
        <Badge variant={isSystemRole(role.name) ? 'secondary' : 'outline'}>
          {isSystemRole(role.name) ? t('roles.system') : t('roles.custom')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('roles.created'),
      sortable: true,
      getValue: (row) => row.created_at,
      render: (role) => (
        <span className="text-muted-foreground text-xs">
          {new Date(role.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (role) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEditDialog(role)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {!isSystemRole(role.name) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              onClick={() => openDeleteDialog(role)}
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
          <h1 className="text-2xl font-bold text-foreground">{t('roles.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('roles.subtitle')}
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-navy hover:bg-navy/90 rounded-xl h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('roles.addRole')}
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
            placeholder={t('roles.searchRoles')}
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
          data={filteredRoles}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={Shield}
          emptyTitle={t('roles.noRoles')}
          emptyDescription={t('roles.noRolesDesc')}
        />
      </motion.div>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('roles.createNewRole')}</DialogTitle>
            <DialogDescription>
              {t('roles.createRoleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('roles.roleName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder={t('roles.roleNamePlaceholder')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('roles.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('roles.descriptionPlaceholder')}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateRole} 
              disabled={isSubmitting || !formData.name}
              className="bg-navy hover:bg-navy/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('roles.createRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('roles.editRole')}</DialogTitle>
            <DialogDescription>
              {t('roles.editRoleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('roles.roleName')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder={t('roles.roleNamePlaceholder')}
                className="rounded-xl"
                disabled={!!(selectedRole && isSystemRole(selectedRole.name))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('roles.description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('roles.descriptionPlaceholder')}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleEditRole} 
              disabled={isSubmitting || !formData.name}
              className="bg-navy hover:bg-navy/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('roles.deleteRole')}</DialogTitle>
            <DialogDescription>
              {t('roles.deleteConfirmMessage', { name: selectedRole?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRole}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('roles.deleteRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
