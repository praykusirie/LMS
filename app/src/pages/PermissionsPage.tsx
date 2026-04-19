import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Key, 
  Search, 
  Loader2,
  Shield,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  assigned: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface GroupedPermissions {
  [module: string]: Permission[];
}

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  roles: 'Role Management',
  permissions: 'Permission Management',
  books: 'Book Management',
  students: 'Student Management',
  borrow: 'Borrow/Return',
  overdue: 'Overdue Management',
  reports: 'Reports',
  settings: 'Settings',
  master: 'Master Data',
};

export function PermissionsPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPermissions, setOriginalPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(t('permissions.failedToFetchRoles'));
    }
  };

  const fetchPermissions = async (roleId: string) => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/permissions/role/${roleId}`);
      setPermissions(data);
      setOriginalPermissions(data.filter((p: Permission) => p.assigned).map((p: Permission) => p.id));
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error(t('permissions.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setPermissions(prev => 
      prev.map(p => 
        p.id === permissionId ? { ...p, assigned: !p.assigned } : p
      )
    );
    
    const newAssigned = permissions
      .map(p => p.id === permissionId ? { ...p, assigned: !p.assigned } : p)
      .filter(p => p.assigned)
      .map(p => p.id);
    
    const changed = JSON.stringify(newAssigned.sort()) !== JSON.stringify(originalPermissions.sort());
    setHasChanges(changed);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    setIsSaving(true);
    try {
      const assignedPermissions = permissions.filter(p => p.assigned).map(p => p.id);
      await api.put(`/permissions/role/${selectedRole}`, { permissionIds: assignedPermissions });
      setOriginalPermissions(assignedPermissions);
      setHasChanges(false);
      toast.success(t('permissions.saveSuccess'));
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(t('permissions.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (module: string, select: boolean) => {
    setPermissions(prev =>
      prev.map(p => 
        p.module === module ? { ...p, assigned: select } : p
      )
    );
    setHasChanges(true);
  };

  const groupedPermissions: GroupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.module;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as GroupedPermissions);

  const filteredModules = Object.keys(groupedPermissions).filter(module => {
    if (!searchQuery) return true;
    const moduleLabel = moduleLabels[module] || module;
    const hasMatchingPermission = groupedPermissions[module].some(
      p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return moduleLabel.toLowerCase().includes(searchQuery.toLowerCase()) || hasMatchingPermission;
  });

  const getModuleStats = (module: string) => {
    const modulePermissions = groupedPermissions[module] || [];
    const assigned = modulePermissions.filter(p => p.assigned).length;
    return { assigned, total: modulePermissions.length };
  };

  const selectedRoleName = roles.find(r => r.id === selectedRole)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('permissions.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('permissions.subtitle')}
          </p>
        </div>
        <Button 
          onClick={handleSavePermissions}
          disabled={!hasChanges || isSaving}
          className="bg-navy hover:bg-navy/90"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('common.save')}
        </Button>
      </div>

      <div className="rounded-[20px] bg-card p-6 shadow-card-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="w-full sm:w-64">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="rounded-xl">
                <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t('permissions.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('permissions.searchPermissions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              {t('permissions.unsavedChanges')}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={filteredModules} className="space-y-2">
            {filteredModules.map((module) => {
              const stats = getModuleStats(module);
              const allSelected = stats.assigned === stats.total;
              
              return (
                <AccordionItem 
                  key={module} 
                  value={module}
                  className="border rounded-xl px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {moduleLabels[module] || module}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {stats.assigned}/{stats.total}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-end gap-2 mb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll(module, true)}
                          disabled={allSelected}
                          className="text-xs"
                        >
                          {t('common.selectAll')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll(module, false)}
                          disabled={stats.assigned === 0}
                          className="text-xs"
                        >
                          {t('common.clearAll')}
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">{t('permissions.allow')}</TableHead>
                            <TableHead>{t('permissions.permission')}</TableHead>
                            <TableHead>{t('permissions.description')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedPermissions[module].map((permission) => (
                            <TableRow key={permission.id}>
                              <TableCell>
                                <Checkbox
                                  checked={permission.assigned}
                                  onCheckedChange={() => handlePermissionToggle(permission.id)}
                                  disabled={selectedRoleName === 'admin'}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {permission.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {permission.description || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {selectedRoleName === 'admin' && (
          <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">
            <Shield className="h-4 w-4 inline mr-2" />
            {t('permissions.adminFullAccess')}
          </div>
        )}
      </div>
    </div>
  );
}
