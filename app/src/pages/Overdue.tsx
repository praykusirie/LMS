import { useState, useMemo } from 'react';
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

export function Overdue() {
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
    return days * 1000; // TSH 1,000 per day
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
          <h1 className="text-2xl font-bold text-foreground">Overdue Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage overdue books and send reminders
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-red">{overdueRecords.length}</p>
            <p className="text-xs text-muted-foreground">Total Overdue</p>
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
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-light flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueRecords.length}</p>
              <p className="text-sm text-muted-foreground">Overdue Books</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-light flex items-center justify-center">
              <User className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(overdueRecords.map(r => r.studentId)).size}
              </p>
              <p className="text-sm text-muted-foreground">Students Affected</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-navy-light flex items-center justify-center">
              <Clock className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                TSH {overdueRecords.reduce((sum, r) => sum + getTotalPenalty(r.dueDate), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Penalties</p>
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
          placeholder="Search by student or book..."
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
        className="rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        {filteredOverdue.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No overdue books"
            description="All books are returned on time. Great job!"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Student
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Book
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Days Overdue
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Penalty
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
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
                          {daysOverdue} days
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-red">TSH {penalty.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSendReminder(record)}
                            className="rounded-lg"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Remind
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleClearOverdue(record.id)}
                            className="rounded-lg bg-green hover:bg-green/90"
                          >
                            Clear
                          </Button>
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
            <DialogTitle>Send Reminder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedOverdue && (
              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">{selectedOverdue.studentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedOverdue.bookTitle}</p>
                  <p className="text-xs text-red mt-1">
                    {getDaysOverdue(selectedOverdue.dueDate)} days overdue
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Reminder Method</p>
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
                      Email
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
                      SMS
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-light rounded-xl">
                  <p className="text-xs text-amber">
                    This will send a reminder to the student about their overdue book and any applicable penalties.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={confirmSendReminder} className="bg-navy hover:bg-navy/90 rounded-xl">
              Send Reminder
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
            <h3 className="text-lg font-semibold text-foreground">Reminder Sent!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              The reminder has been sent successfully.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full bg-navy hover:bg-navy/90 rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

