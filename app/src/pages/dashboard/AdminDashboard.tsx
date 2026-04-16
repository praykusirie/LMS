import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibrarianDashboard } from './LibrarianDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { AccountantDashboard } from './AccountantDashboard';
import { useTranslation } from 'react-i18next';

export function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.adminDashboard', 'Admin Dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.adminSubtitle', 'Complete overview of all departments')}</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="library">{t('dashboard.library', 'Library')}</TabsTrigger>
          <TabsTrigger value="teaching">{t('dashboard.teaching', 'Teaching')}</TabsTrigger>
          <TabsTrigger value="finance">{t('dashboard.finance', 'Finance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <LibrarianDashboard />
        </TabsContent>
        <TabsContent value="teaching" className="mt-6">
          <TeacherDashboard />
        </TabsContent>
        <TabsContent value="finance" className="mt-6">
          <AccountantDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
