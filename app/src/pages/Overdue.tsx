import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, CheckCircle, AlertTriangle, Search, BookKey } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui-custom';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OverdueRecord {
  id: number;
  bookTitle: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  borrowDate: string;
  dueDate: string;
}

export function Overdue() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [records, setRecords] = useState<OverdueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [returnTarget, setReturnTarget] = useState<OverdueRecord | null>(null);

  const fetchOverdueRecords = async () => {
    try {
      setLoading(true);
      setIsError(false);
      const response = await api.get('/borrow-records?status=overdue');
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch overdue records:', error);
      setIsError(true);
      toast.error(t('overdue.fetchError', 'Failed to load overdue records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueRecords();
  }, []);

  const handleReturn = async (id: number) => {
    try {
      await api.patch(`/borrow-records/${id}/return`);
      toast.success(t('overdue.returnSuccess', 'Book returned successfully'));
      setReturnTarget(null);
      fetchOverdueRecords();
    } catch (error) {
      console.error('Failed to return book:', error);
      toast.error(t('overdue.returnError', 'Failed to process return'));
    }
  };

  const handleSendReminder = async (id: number, type: 'email' | 'sms') => {
    if (type === 'sms') {
      toast.info(t('overdue.smsNotConfigured', 'SMS gateway not configured yet.'));
      return;
    }

    try {
      await api.post(`/borrow-records/${id}/remind`);
      toast.success(t('overdue.reminderSent', 'Email reminder sent to student.'));
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error(t('overdue.reminderError', 'Failed to send reminder.'));
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(
      (record) =>
        record.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.studentName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const columns: DataTableColumn<OverdueRecord>[] = useMemo(() => [
    {
      key: 'bookTitle',
      header: t('overdue.book', 'Book Title'),
      sortable: true,
      getValue: (row) => row.bookTitle,
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
            <BookKey className="h-5 w-5 text-destructive" />
          </div>
          <span className="font-medium text-foreground">{record.bookTitle}</span>
        </div>
      ),
    },
    {
      key: 'studentName',
      header: t('overdue.student', 'Student'),
      sortable: true,
      getValue: (row) => row.studentName,
    },
    {
      key: 'dueDate',
      header: t('overdue.dueDate', 'Due Date'),
      sortable: true,
      getValue: (row) => row.dueDate,
      render: (record) => (
        <span className="text-muted-foreground">
          {format(new Date(record.dueDate), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'daysLate',
      header: t('overdue.daysLate', 'Days Late'),
      sortable: true,
      getValue: (row) => differenceInDays(new Date(), new Date(row.dueDate)),
      render: (record) => {
        const daysLate = differenceInDays(new Date(), new Date(record.dueDate));
        return (
          <Badge variant="destructive" className="flex w-fit items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {daysLate} {t('overdue.days', 'days')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: t('overdue.actions', 'Actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      render: (record) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {hasPermission('library:remind') && (
            <TooltipProvider>
              <div className="inline-flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminder(record.id, 'email')}
                      disabled={!record.studentEmail}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t('overdue.email', 'Email')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {record.studentEmail 
                      ? t('overdue.sendEmail', 'Send Email Reminder')
                      : t('overdue.noEmail', 'No Email Address')}
                  </TooltipContent>
                </Tooltip>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  SMS
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                </span>
              </div>
            </TooltipProvider>
          )}

          {hasPermission('library:manage') && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setReturnTarget(record)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('overdue.markReturned', 'Return')}
            </Button>
          )}
        </div>
      ),
    },
  ], [hasPermission, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('overdue.title', 'Overdue Books')}
        description={t('overdue.subtitle', 'Manage and remind students about overdue library resources.')}
      />

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('overdue.search', 'Search by book or student name...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading', 'Loading...')}</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('overdue.emptyTitle', 'No Overdue Books')}</p>
        ) : (
          filteredRecords.map((record) => {
            const daysLate = differenceInDays(new Date(), new Date(record.dueDate));
            return (
              <div key={record.id} className="p-4 bg-card border rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookKey className="h-4 w-4 text-destructive shrink-0" />
                    <p className="font-medium text-sm truncate">{record.bookTitle}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {daysLate}d late
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{record.studentName}</p>
                <p className="text-xs text-muted-foreground">{t('overdue.dueDate', 'Due')}: {format(new Date(record.dueDate), 'MMM dd, yyyy')}</p>
                <div className="flex items-center gap-2 pt-1">
                  {hasPermission('library:remind') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => handleSendReminder(record.id, 'email')}
                      disabled={!record.studentEmail}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    SMS
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                  </span>
                  {hasPermission('library:manage') && (
                    <Button
                      size="sm"
                      className="h-8 rounded-lg ml-auto"
                      onClick={() => setReturnTarget(record)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      {t('overdue.markReturned', 'Return')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filteredRecords}
          columns={columns}
          isLoading={loading}
          getRowId={(row) => row.id.toString()}
          emptyIcon={AlertTriangle}
          emptyTitle={t('overdue.emptyTitle', 'No Overdue Books')}
          emptyDescription={t('overdue.emptyDesc', 'There are no overdue library books at the moment.')}
          isError={isError}
          onRetry={() => { setIsError(false); fetchOverdueRecords(); }}
        />
      </div>

      {/* Return confirmation dialog */}
      <AlertDialog open={!!returnTarget} onOpenChange={(open) => { if (!open) setReturnTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('overdue.confirmReturn', 'Mark as Returned?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {returnTarget && (
                <>"{returnTarget.bookTitle}" — {returnTarget.studentName}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => returnTarget && handleReturn(returnTarget.id)}>
              {t('overdue.markReturned', 'Return')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

