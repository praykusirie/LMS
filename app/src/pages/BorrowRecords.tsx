import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui-custom';

interface BorrowRecord {
  id: string;
  book_title: string;
  student_name: string;
  student_code?: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  current_status: 'borrowed' | 'overdue' | 'returned';
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  borrowed: { variant: 'secondary', label: 'Borrowed' },
  overdue: { variant: 'destructive', label: 'Overdue' },
  returned: { variant: 'outline', label: 'Returned' },
};

export function BorrowRecords() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'borrowed' | 'overdue' | 'returned'>('all');

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get('/borrow-records', {
        params: statusFilter !== 'all' ? { status: statusFilter } : undefined,
      });
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to fetch borrow records:', error);
      setIsError(true);
      toast.error('Failed to load borrow records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.book_title?.toLowerCase().includes(q) ||
        r.student_name?.toLowerCase().includes(q) ||
        r.student_code?.toLowerCase().includes(q),
    );
  }, [records, search]);

  const columns: DataTableColumn<BorrowRecord>[] = useMemo(() => [
    {
      key: 'book_title',
      header: 'Book',
      sortable: true,
      getValue: (row) => row.book_title,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">{row.book_title}</span>
        </div>
      ),
    },
    {
      key: 'student_name',
      header: 'Student',
      sortable: true,
      getValue: (row) => row.student_name,
      render: (row) => (
        <div>
          <p className="text-sm">{row.student_name}</p>
          {row.student_code && (
            <p className="text-xs text-muted-foreground">{row.student_code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'current_status',
      header: 'Status',
      render: (row) => {
        const s = STATUS_BADGE[row.current_status] ?? STATUS_BADGE['borrowed'];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'borrow_date',
      header: 'Borrowed',
      sortable: true,
      getValue: (row) => row.borrow_date,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.borrow_date), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      getValue: (row) => row.due_date,
      render: (row) => {
        const isOverdue = row.current_status === 'overdue';
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {format(new Date(row.due_date), 'MMM dd, yyyy')}
          </span>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrow Records"
        description="Full history of all book borrowing activity."
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by book or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="rounded-xl h-11 w-full sm:w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="borrowed">Borrowed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No borrow records found.</p>
        ) : (
          filtered.map((record) => {
            const s = STATUS_BADGE[record.current_status] ?? STATUS_BADGE['borrowed'];
            const isOverdue = record.current_status === 'overdue';
            return (
              <div key={record.id} className="p-4 bg-card border rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-medium text-sm truncate">{record.book_title}</p>
                  </div>
                  <Badge variant={s.variant} className="shrink-0 text-xs">{s.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{record.student_name}{record.student_code ? ` · ${record.student_code}` : ''}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Borrowed: {format(new Date(record.borrow_date), 'MMM dd, yyyy')}</span>
                  <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                    Due: {format(new Date(record.due_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <DataTable
          data={filtered}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => { setIsError(false); fetchRecords(); }}
          getRowId={(row) => row.id}
          emptyIcon={BookOpen}
          emptyTitle="No Borrow Records"
          emptyDescription="No borrow records match the current filters."
        />
      </div>
    </div>
  );
}
