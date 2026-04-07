import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Save
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

export function Settings() {
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

  const handleSave = () => {
    // Simulate saving settings
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your library system preferences
        </p>
      </motion.div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="general" className="rounded-lg">
            <SettingsIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-lg">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
              <CardHeader>
                <CardTitle>Library Information</CardTitle>
                <CardDescription>Basic details about your library</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Library Name</Label>
                  <Input
                    value={generalSettings.libraryName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, libraryName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
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
            <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
              <CardHeader>
                <CardTitle>Borrowing Rules</CardTitle>
                <CardDescription>Configure borrowing limits and penalties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Borrow Limit</Label>
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
                    <Label>Loan Period (days)</Label>
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
                    <Label>Penalty Rate (TSH/day)</Label>
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
            <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'emailReminders', label: 'Email Reminders', description: 'Send reminder emails for due books' },
                  { key: 'smsReminders', label: 'SMS Reminders', description: 'Send SMS reminders to students' },
                  { key: 'overdueAlerts', label: 'Overdue Alerts', description: 'Get notified when books become overdue' },
                  { key: 'newBookAlerts', label: 'New Book Alerts', description: 'Notify students about new arrivals' },
                  { key: 'systemUpdates', label: 'System Updates', description: 'Receive system maintenance notifications' }
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
            <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/40">
                  <div>
                    <p className="font-medium text-sm">Auto Logout</p>
                    <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
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
                    <Label>Logout Timeout (minutes)</Label>
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
                    <p className="font-medium text-sm">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Require 2FA for login</p>
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
            <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
              <CardHeader>
                <CardTitle>Data Backup</CardTitle>
                <CardDescription>Backup and restore your library data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">Last Backup</p>
                  <p className="text-xs text-muted-foreground">Never</p>
                </div>
                <div className="flex gap-3">
                  <Button className="bg-navy hover:bg-navy/90 rounded-xl">
                    <Database className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Mail className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>
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
        <Button onClick={handleSave} className="bg-navy hover:bg-navy/90 rounded-xl h-11 px-6">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
}
