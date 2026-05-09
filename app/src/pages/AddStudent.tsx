import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Upload, 
  UserPlus, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';

interface ClassItem {
  id: string;
  name: string;
}

export function AddStudent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  // Classes from master
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [nextId, setNextId] = useState<string>('');

  // Form state
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

  // Bulk import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLevel, setBulkLevel] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors?: string[] } | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchNextId();
    if (!isAdmin && userLevel) {
      setFormData(prev => ({ ...prev, level: userLevel }));
      setBulkLevel(userLevel);
    }
  }, [isAdmin, userLevel]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchNextId = async () => {
    try {
      const { data } = await api.get('/students/next-id');
      setNextId(data.nextId);
    } catch (error) {
      console.error('Error fetching next ID:', error);
    }
  };

  const getEffectiveLevel = () => {
    if (isAdmin) return formData.level || null;
    return userLevel;
  };

  const generateAvatar = (name: string, gender: string) => {
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&gender=${gender}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.first_name || !formData.last_name || !formData.class_id) {
      setErrorMessage(t('students.fillRequired'));
      return;
    }
    if (isAdmin && !formData.level) {
      setErrorMessage(t('students.levelRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      const avatar = generateAvatar(fullName, formData.gender);

      await api.post('/students', {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: fullName,
        class_id: formData.class_id,
        gender: formData.gender,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        dob: formData.dob || null,
        nationality: formData.nationality.trim() || null,
        parent_email: formData.parent_email.trim() || null,
        parent_phone: formData.parent_phone.trim() || null,
        address: formData.address.trim() || null,
        avatar,
        level: getEffectiveLevel(),
      });

      setSuccessMessage(t('students.registeredSuccessId', { id: nextId }));
      toast.success(t('students.registerSuccess'));
      
      // Reset form and get next ID
      setFormData({
        first_name: '',
        last_name: '',
        class_id: '',
        gender: 'male',
        email: '',
        phone: '',
        dob: '',
        nationality: '',
        parent_email: '',
        parent_phone: '',
        address: '',
        level: isAdmin ? '' : (userLevel || ''),
      });
      fetchNextId();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || t('students.failedToRegister'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setErrorMessage(t('students.uploadError'));
      return;
    }

    setBulkFile(file);
    setImportResult(null);
    setErrorMessage('');
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setImportResult(null);

    try {
      const effectiveLevel = isAdmin ? bulkLevel : (userLevel || '');
      if (isAdmin && !effectiveLevel) {
        setErrorMessage(t('students.levelRequiredBulk'));
        setIsSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.append('file', bulkFile);
      if (effectiveLevel) fd.append('level', effectiveLevel);

      const { data } = await api.post('/students/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(data);
      if (data.imported > 0) {
        setSuccessMessage(t('students.successfullyImported', { imported: data.imported, total: data.total }));
        toast.success(t('students.importedCount', { count: data.imported }));
      }
      if (data.skipped > 0 && data.imported === 0) {
        setErrorMessage(t('students.allRowsSkipped', { count: data.skipped }));
      }
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || t('students.failedToImport'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'StudentID,FirstName,LastName,DOB,Nationality,Gender,ParentEmail,Class\nLMSSTD00001,John,Doe,05/08/2022,Tanzanian,Male,parent@email.com,Grade 10';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderLevelSelect = () => (
    <div className="space-y-2">
      <Label>{t('students.level')} <span className="text-red-500">*</span></Label>
      <Select
        value={isAdmin ? formData.level : (userLevel || '')}
        onValueChange={(value) => setFormData({ ...formData, level: value })}
        disabled={!isAdmin}
      >
        <SelectTrigger className="rounded-xl h-11">
          <SelectValue placeholder={isAdmin ? t('students.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : 'No level')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">{t('students.primaryLevel')}</SelectItem>
          <SelectItem value="secondary">{t('students.secondaryLevel')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/students')}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('students.registerStudent')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('students.addSubtitle')}
          </p>
        </div>
      </div>
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-lg bg-card p-6 shadow-card">
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-12">
            <TabsTrigger value="individual" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-2" />
              {t('students.individualRegistration')}
            </TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('students.bulkImportExcel')}
            </TabsTrigger>
          </TabsList>

          {/* Individual Registration Tab */}
          <TabsContent value="individual" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Next ID Display */}
              <div className="p-4 bg-primary/5 rounded-xl">
                <p className="text-sm text-primary">
                  <strong>{t('students.nextStudentId')}</strong> <span className="font-mono text-primary font-bold">{nextId || t('common.loading')}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('students.autoAssignId')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.firstName')} <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder={t('students.enterFirstName')}
                    className="rounded-xl h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('students.lastName')} <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder={t('students.enterLastName')}
                    className="rounded-xl h-11"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.class')} <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.class_id} 
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={t('students.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('students.gender')} <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={t('students.selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('common.male')}</SelectItem>
                      <SelectItem value="female">{t('common.female')}</SelectItem>
                      <SelectItem value="other">{t('common.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.dateOfBirth')}</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('students.nationality')}</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="e.g., Tanzanian"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.studentEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('students.enterStudentEmail')}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('students.studentPhone')}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('students.enterStudentPhone')}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.parentEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    placeholder={t('students.enterParentEmail')}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('students.parentPhoneLabel')}</Label>
                  <Input
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    placeholder={t('students.enterParentPhone')}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('students.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('students.enterAddress')}
                  className="rounded-xl h-11"
                />
              </div>

              {renderLevelSelect()}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/students')}
                  className="rounded-xl h-11"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 rounded-xl h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('students.registering')}</> : t('students.registerStudent')}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="mt-0">
            <div className="space-y-6">
              {/* File Format Info */}
              <div className="p-4 bg-secondary/50 rounded-xl">
                <h3 className="font-medium text-sm mb-2">{t('students.supportedFormats')}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('students.formatDescription')}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">StudentID (optional)</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg">FirstName *</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg">LastName *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">DOB</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Nationality</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg">Gender *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">ParentEmail</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg">Class *</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('students.downloadTemplate')}
                </Button>
              </div>

              {/* Level for bulk */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>{t('students.level')} <span className="text-red-500">*</span></Label>
                  <Select
                    value={bulkLevel}
                    onValueChange={(value) => setBulkLevel(value)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={t('students.selectLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{t('students.primaryLevel')}</SelectItem>
                      <SelectItem value="secondary">{t('students.secondaryLevel')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* File Upload */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {bulkFile ? bulkFile.name : t('students.clickToUpload')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('students.supportedFileTypes')}
                </p>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <h3 className="font-medium text-sm">{t('students.importResults')}</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-600">{t('students.imported')}: {importResult.imported}</span>
                    <span className="text-amber-600">{t('students.skipped')}: {importResult.skipped}</span>
                    <span className="text-muted-foreground">{t('students.totalRows')}: {importResult.total}</span>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-[150px] overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bulkFile && (
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setBulkFile(null);
                      setImportResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded-xl h-11"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('common.clear')}
                  </Button>
                  <Button 
                    onClick={handleBulkUpload}
                    className="bg-primary hover:bg-primary/90 rounded-xl h-11"
                    disabled={isSubmitting || (isAdmin && !bulkLevel)}
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('students.importing')}</> : t('students.importStudents')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

