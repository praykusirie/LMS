import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Save,
  Palette,
  Sun,
  Moon,
  Monitor,
  Languages,
  User,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme, type Theme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [generalSettings, setGeneralSettings] = useState({
    libraryName: 'School Library',
    email: 'library@school.edu',
    phone: '+1 234 567 890',
    address: '123 School Street, City, Country',
    borrowLimit: '3',
    loanPeriod: '14',
    penaltyRate: '1'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailReminders: true,
    smsReminders: false,
    overdueAlerts: true,
    newBookAlerts: true,
    systemUpdates: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    autoLogout: true,
    logoutTimeout: '30',
    twoFactorAuth: false
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message || t('auth.changePasswordError'));
      } else {
        toast.success(t('auth.passwordChanged'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error(t('auth.changePasswordError'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = () => {
    // Simulate saving settings
    alert(t('settings.saveSuccess'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.subtitle')}
        </p>
      </motion.div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="general" className="rounded-lg">
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            <Bell className="h-4 w-4 mr-2" />
            {t('settings.notifications')}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">
            <Shield className="h-4 w-4 mr-2" />
            {t('settings.security')}
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-lg">
            <Database className="h-4 w-4 mr-2" />
            {t('settings.backup')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">
            <Palette className="h-4 w-4 mr-2" />
            {t('settings.appearance')}
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg">
            <User className="h-4 w-4 mr-2" />
            {t('settings.account')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.libraryInfo')}</CardTitle>
                <CardDescription>{t('settings.libraryInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.libraryName')}</Label>
                  <Input
                    value={generalSettings.libraryName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, libraryName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.email')}</Label>
                    <Input
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.phone')}</Label>
                    <Input
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.address')}</Label>
                  <Input
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.borrowingRules')}</CardTitle>
                <CardDescription>{t('settings.borrowingRulesDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.borrowLimit')}</Label>
                    <Select 
                      value={generalSettings.borrowLimit} 
                      onValueChange={(value) => setGeneralSettings({ ...generalSettings, borrowLimit: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 book</SelectItem>
                        <SelectItem value="2">2 books</SelectItem>
                        <SelectItem value="3">3 books</SelectItem>
                        <SelectItem value="5">5 books</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.loanPeriod')}</Label>
                    <Select 
                      value={generalSettings.loanPeriod} 
                      onValueChange={(value) => setGeneralSettings({ ...generalSettings, loanPeriod: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="21">21 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.penaltyRate')}</Label>
                    <Input
                      type="number"
                      value={generalSettings.penaltyRate}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, penaltyRate: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.notificationPrefs')}</CardTitle>
                <CardDescription>{t('settings.notificationPrefsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'emailReminders', label: t('settings.emailReminders'), description: t('settings.emailRemindersDesc') },
                  { key: 'smsReminders', label: t('settings.smsReminders'), description: t('settings.smsRemindersDesc') },
                  { key: 'overdueAlerts', label: t('settings.overdueAlerts'), description: t('settings.overdueAlertsDesc') },
                  { key: 'newBookAlerts', label: t('settings.newBookAlerts'), description: t('settings.newBookAlertsDesc') },
                  { key: 'systemUpdates', label: t('settings.systemUpdates'), description: t('settings.systemUpdatesDesc') }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.securitySettings')}</CardTitle>
                <CardDescription>{t('settings.securitySettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/40">
                  <div>
                    <p className="font-medium text-sm">{t('settings.autoLogout')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.autoLogoutDesc')}</p>
                  </div>
                  <Switch
                    checked={securitySettings.autoLogout}
                    onCheckedChange={(checked) => 
                      setSecuritySettings({ ...securitySettings, autoLogout: checked })
                    }
                  />
                </div>
                {securitySettings.autoLogout && (
                  <div className="space-y-2">
                    <Label>{t('settings.logoutTimeout')}</Label>
                    <Select 
                      value={securitySettings.logoutTimeout} 
                      onValueChange={(value) => setSecuritySettings({ ...securitySettings, logoutTimeout: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-border/40">
                  <div>
                    <p className="font-medium text-sm">{t('settings.twoFactorAuth')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.twoFactorAuthDesc')}</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => 
                      setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.dataBackup')}</CardTitle>
                <CardDescription>{t('settings.dataBackupDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">{t('settings.lastBackup')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.never')}</p>
                </div>
                <div className="flex gap-3">
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl">
                    <Database className="h-4 w-4 mr-2" />
                    {t('settings.createBackup')}
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Mail className="h-4 w-4 mr-2" />
                    {t('settings.restoreBackup')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.theme')}</CardTitle>
                <CardDescription>{t('settings.themeDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'light' as Theme, icon: Sun, label: t('settings.light') },
                    { value: 'dark' as Theme, icon: Moon, label: t('settings.dark') },
                    { value: 'system' as Theme, icon: Monitor, label: t('settings.system') },
                  ]).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                        theme === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${theme === value ? 'text-primary' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>{t('settings.language')}</CardTitle>
                    <CardDescription>{t('settings.languageDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  value={i18n.language}
                  onValueChange={(value) => changeLanguage(value)}
                >
                  <SelectTrigger className="rounded-xl w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Kiswahili</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-lg shadow-card border-0">
              <CardHeader>
                <CardTitle>{t('settings.changePassword')}</CardTitle>
                <CardDescription>{t('settings.changePasswordDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>{t('auth.currentPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 pl-10 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 rounded-xl"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('auth.passwordRequirements')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 pl-10 rounded-xl"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 rounded-xl h-11"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? t('auth.updating') : t('settings.changePassword')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex justify-end"
      >
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 rounded-xl h-11 px-6">
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </motion.div>
    </div>
  );
}


