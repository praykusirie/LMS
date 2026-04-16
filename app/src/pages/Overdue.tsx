import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Mail, 
  MessageSquare, 
  Clock, 
  User,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui-custom';
import { borrowRecords as mockBorrowRecords, students } from '@/data/mockData';
import type { BorrowRecord } from '@/types';
import { usePermissions } from '@/lib/permissions';

export function Overdue() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>(mockBorrowRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedOverdue, setSelectedOverdue] = useState<BorrowRecord | null>(null);
  const [reminderType, setReminderType] = useState<'email' | 'sms'>('email');

  const overdueRecords = useMemo(() => {
    return borrowRecords.filter(r => r.status === 'overdue');
  }, [borrowRecords]);

  const filteredOverdue = useMemo(() => {
    return overdueRecords.filter(record => 
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.bookTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [overdueRecords, searchQuery]);

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTotalPenalty = (dueDate: string) => {
    const days = getDaysOverdue(dueDate);
    return days * 1000; // TZS 1,000 per day
  };

  const handleSendReminder = (record: BorrowRecord) => {
    setSelectedOverdue(record);
    setShowReminderDialog(true);
  };

  const confirmSendReminder = () => {
    // Simulate sending reminder
    setShowReminderDialog(false);
    setShowSuccessDialog(true);
    setSelectedOverdue(null);
  };

  const handleClearOverdue = (recordId: string) => {
    setBorrowRecords(records => 
      records.map(r => r.id === recordId ? { ...r, status: 'returned' } : r)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('overdue.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('overdue.manageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-red">{overdueRecords.length}</p>
            <p className="text-xs text-muted-foreground">{t('overdue.totalOverdue')}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-light flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueRecords.length}</p>
              <p className="text-sm text-muted-foreground">{t('overdue.overdueBooks')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-light flex items-center justify-center">
              <User className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(overdueRecords.map(r => r.studentId)).size}
              </p>
              <p className="text-sm text-muted-foreground">{t('overdue.studentsAffected')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-navy-light flex items-center justify-center">
              <Clock className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                TZS {overdueRecords.reduce((sum, r) => sum + getTotalPenalty(r.dueDate), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t('overdue.totalPenalties')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('overdue.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 pl-10 rounded-xl"
        />
      </motion.div>

      {/* Overdue List */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-[20px] bg-card shadow-card overflow-hidden"
      >
        {filteredOverdue.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={t('overdue.noOverdue')}
            description={t('overdue.noOverdueDesc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.student')}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.book')}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.dueDate')}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.daysOverdue')}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.penalty')}
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('overdue.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOverdue.map((record) => {
                  const daysOverdue = getDaysOverdue(record.dueDate);
                  const penalty = getTotalPenalty(record.dueDate);
                  const student = students.find(s => s.id === record.studentId);
                  
                  return (
                    <tr 
                      key={record.id} 
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student?.avatar} alt={record.studentName} />
                            <AvatarFallback className="bg-red text-white text-xs">
                              {record.studentName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{record.studentName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-foreground">{record.bookTitle}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(record.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-light text-red">
                          {daysOverdue} {t('overdue.days')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-red">TZS {penalty.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('overdue:manage') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSendReminder(record)}
                            className="rounded-lg"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            {t('overdue.remind')}
                          </Button>
                          )}
                          {hasPermission('overdue:manage') && (
                          <Button 
                            size="sm" 
                            onClick={() => handleClearOverdue(record.id)}
                            className="rounded-lg bg-green hover:bg-green/90"
                          >
                            {t('overdue.clear')}
                          </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('overdue.sendReminder')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedOverdue && (
              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">{selectedOverdue.studentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedOverdue.bookTitle}</p>
                  <p className="text-xs text-red mt-1">
                    {getDaysOverdue(selectedOverdue.dueDate)} {t('overdue.daysOverdueText')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('overdue.reminderMethod')}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReminderType('email')}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        reminderType === 'email' 
                          ? 'border-navy bg-navy-light text-navy' 
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      {t('overdue.email')}
                    </button>
                    <button
                      onClick={() => setReminderType('sms')}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        reminderType === 'sms' 
                          ? 'border-navy bg-navy-light text-navy' 
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t('overdue.sms')}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-light rounded-xl">
                  <p className="text-xs text-amber">
                    {t('overdue.reminderNote')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmSendReminder} className="bg-navy hover:bg-navy/90 rounded-xl">
              {t('overdue.sendReminder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-[20px] max-w-md">
          <div className="py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t('overdue.reminderSent')}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t('overdue.reminderSentDesc')}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full bg-navy hover:bg-navy/90 rounded-xl">
              {t('overdue.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

