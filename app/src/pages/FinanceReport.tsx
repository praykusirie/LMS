import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Search,
  Loader2,
  CreditCard,
  FileText,
  TrendingUp,
  Banknote,
  Eye,
  Trash2,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

interface Invoice {
  id: string;
  invoice_number: string;
  student_name: string;
  student_code: string;
  class_name: string;
  academic_year: string;
  year_group: string;
  invoice_date: string;
  total_amount: number;
  total_paid: number;
  balance: number;
  status: string;
  is_new_student: boolean;
  is_boarder: boolean;
}

interface InvoiceDetail extends Invoice {
  sibling_discount_percent: number;
  tuition_amount: number;
  discount_amount: number;
  net_tuition: number;
  term1_amount: number;
  term2_amount: number;
  term3_amount: number;
  notes: string;
  line_items: Array<{ fee_name: string; amount: number }>;
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference: string;
    notes: string;
  }>;
}

interface ReportSummary {
  invoice_count: number;
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
}

export function FinanceReport() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [academicYear, setAcademicYear] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearGroupFilter, setYearGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [viewInvoice, setViewInvoice] = useState<InvoiceDetail | null>(null);
  const [paymentSheet, setPaymentSheet] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0] || '',
  );
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchData();
  }, [academicYear, statusFilter]);

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/fee-structures/academic-years/list');
      const years = res.data || [];
      setAcademicYears(years);
      if (years.length > 0) setAcademicYear(years[0]);
    } catch {
      // silent
    }
  };

  const fetchData = async () => {
    if (!academicYear) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ academic_year: academicYear });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const [invoicesRes, summaryRes] = await Promise.all([
        api.get(`/invoices?${params}`),
        api.get(`/invoices/report/summary?academic_year=${encodeURIComponent(academicYear)}`),
      ]);

      setInvoices(invoicesRes.data || []);
      setSummary(summaryRes.data || null);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (yearGroupFilter !== 'all') {
      list = list.filter((inv) => inv.year_group === yearGroupFilter);
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inv) =>
        inv.student_name.toLowerCase().includes(q) ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.student_code || '').toLowerCase().includes(q),
    );
  }, [invoices, yearGroupFilter, searchQuery]);

  const yearGroups = useMemo(
    () => [...new Set(invoices.map((inv) => inv.year_group).filter(Boolean))].sort(),
    [invoices],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-TZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(Number(amount));

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      unpaid: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {t(`finance.${status}`)}
      </Badge>
    );
  };

  const exportCsv = () => {
    const headers = ['Invoice #', 'Student', 'Code', 'Class', 'Year Group', 'Academic Year', 'Date', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number,
      inv.student_name,
      inv.student_code,
      inv.class_name,
      inv.year_group,
      inv.academic_year,
      new Date(inv.invoice_date).toLocaleDateString(),
      inv.total_amount,
      inv.total_paid,
      inv.balance,
      inv.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const handleViewInvoice = async (id: string) => {
    try {
      setIsActionLoading(true);
      const res = await api.get(`/invoices/${id}`);
      setViewInvoice(res.data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentSheet || !paymentAmount) return;
    try {
      setIsActionLoading(true);
      await api.post(`/invoices/${paymentSheet}/payments`, {
        amount: Number(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: paymentRef || undefined,
      });
      toast.success(t('finance.paymentRecorded'));
      setPaymentSheet(null);
      setPaymentAmount('');
      setPaymentRef('');
      fetchData();
    } catch {
      toast.error(t('finance.paymentError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      setIsActionLoading(true);
      await api.delete(`/invoices/${deleteDialog}`);
      toast.success(t('finance.deleted'));
      setDeleteDialog(null);
      fetchData();
    } catch {
      toast.error(t('finance.deleteError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const summaryCards = summary
    ? [
        {
          label: t('finance.totalInvoiced'),
          value: `TZS ${formatCurrency(summary.total_invoiced)}`,
          icon: FileText,
          color: 'bg-primary/10 text-primary',
        },
        {
          label: t('finance.totalCollected'),
          value: `TZS ${formatCurrency(summary.total_collected)}`,
          icon: Banknote,
          color: 'bg-green-light text-green',
        },
        {
          label: t('finance.totalOutstanding'),
          value: `TZS ${formatCurrency(summary.total_outstanding)}`,
          icon: TrendingUp,
          color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        },
        {
          label: t('finance.invoiceCount'),
          value: String(summary.invoice_count),
          icon: CreditCard,
          color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        },
      ]
    : [];

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={t('finance.financeReport')}
          description={t('finance.financeReportSubtitle')}
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={exportPdf}>
                <FileDown className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
            </div>
          }
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{t('finance.financeReport')} — {academicYear}</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                  <p className="text-sm font-semibold truncate">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status counts */}
      {summary && (
        <div className="flex flex-wrap items-center gap-3 text-sm print:hidden">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary inline-block" />
            <span className="text-muted-foreground">{t('finance.paid')}:</span>
            <span className="font-medium">{summary.paid_count}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-secondary-foreground/40 inline-block" />
            <span className="text-muted-foreground">{t('finance.partial')}:</span>
            <span className="font-medium">{summary.partial_count}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
            <span className="text-muted-foreground">{t('finance.unpaid')}:</span>
            <span className="font-medium">{summary.unpaid_count}</span>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder={t('finance.filterByYear')} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('finance.allStatuses')}</SelectItem>
            <SelectItem value="unpaid">{t('finance.unpaid')}</SelectItem>
            <SelectItem value="partial">{t('finance.partial')}</SelectItem>
            <SelectItem value="paid">{t('finance.paid')}</SelectItem>
          </SelectContent>
        </Select>

        {yearGroups.length > 0 && (
          <Select value={yearGroupFilter} onValueChange={setYearGroupFilter}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="All Year Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Year Groups</SelectItem>
              {yearGroups.map((yg) => (
                <SelectItem key={yg} value={yg}>{yg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {t('finance.noInvoices')}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.invoiceNumber')}</TableHead>
                    <TableHead>{t('finance.student')}</TableHead>
                    <TableHead>{t('finance.class')}</TableHead>
                    <TableHead className="text-right">{t('finance.totalAmount')}</TableHead>
                    <TableHead className="text-right">{t('finance.totalPaid')}</TableHead>
                    <TableHead className="text-right">{t('finance.balance')}</TableHead>
                    <TableHead>{t('finance.status')}</TableHead>
                    <TableHead className="print:hidden">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{inv.student_name}</p>
                          <p className="text-xs text-muted-foreground">{inv.student_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{inv.class_name}</p>
                          <p className="text-xs text-muted-foreground">{inv.year_group}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">TZS {formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell className="text-right">TZS {formatCurrency(inv.total_paid)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={inv.balance > 0 ? 'text-orange-600' : 'text-green-600'}>
                          TZS {formatCurrency(inv.balance)}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell className="print:hidden">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(inv.id)} disabled={isActionLoading}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {inv.status !== 'paid' && hasPermission('finance:edit') && (
                            <Button variant="ghost" size="icon" onClick={() => setPaymentSheet(inv.id)}>
                              <Banknote className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('finance:edit') && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(inv.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="block md:hidden divide-y divide-border">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{inv.invoice_number}</span>
                        {statusBadge(inv.status)}
                      </div>
                      <p className="text-sm text-foreground mt-1">{inv.student_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.class_name} · {inv.year_group}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">TZS {formatCurrency(inv.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-medium text-green-600">TZS {formatCurrency(inv.total_paid)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className={`font-medium ${inv.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            TZS {formatCurrency(inv.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleViewInvoice(inv.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inv.status !== 'paid' && hasPermission('finance:edit') && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setPaymentSheet(inv.id)}>
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── View Invoice Dialog ── */}
      <Dialog open={viewInvoice !== null} onOpenChange={(open) => { if (!open) setViewInvoice(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><strong>{t('finance.student')}:</strong> {viewInvoice.student_name}</p>
                <p><strong>{t('finance.class')}:</strong> {viewInvoice.class_name}</p>
                <p><strong>{t('finance.academicYear')}:</strong> {viewInvoice.academic_year}</p>
                <p><strong>{t('finance.invoiceDate')}:</strong> {new Date(viewInvoice.invoice_date).toLocaleDateString()}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                {viewInvoice.line_items.map((li, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{li.fee_name}</span>
                    <span className={li.amount < 0 ? 'text-red-500' : ''}>
                      {li.amount < 0 ? '-' : ''}TZS {formatCurrency(Math.abs(li.amount))}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>{t('finance.totalFee')}</span>
                  <span>TZS {formatCurrency(viewInvoice.total_amount)}</span>
                </div>
              </div>

              <div className={`grid gap-3 text-sm ${Number(viewInvoice.term3_amount) === 0 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">{t('finance.term1')}</p>
                  <p className="font-semibold">TZS {formatCurrency(viewInvoice.term1_amount)}</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">{t('finance.term2')}</p>
                  <p className="font-semibold">TZS {formatCurrency(viewInvoice.term2_amount)}</p>
                </div>
                {Number(viewInvoice.term3_amount) > 0 && (
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <p className="text-xs text-muted-foreground">{t('finance.term3')}</p>
                    <p className="font-semibold">TZS {formatCurrency(viewInvoice.term3_amount)}</p>
                  </div>
                )}
              </div>

              {viewInvoice.payments.length > 0 && (
                <>
                  <Separator />
                  <h4 className="text-sm font-semibold">Payments</h4>
                  <div className="space-y-2">
                    {viewInvoice.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm bg-muted/30 p-2 rounded">
                        <div>
                          <p>{new Date(p.payment_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.payment_method}{p.reference ? ` — ${p.reference}` : ''}</p>
                        </div>
                        <span className="font-medium text-green-600">TZS {formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold text-sm">
                    <span>{t('finance.balance')}</span>
                    <span className={Number(viewInvoice.balance) > 0 ? 'text-orange-600' : 'text-green-600'}>
                      TZS {formatCurrency(viewInvoice.balance)}
                    </span>
                  </div>
                </>
              )}

              <div className="pt-2 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={async () => { await generateInvoicePdf(viewInvoice); }}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('finance.downloadPdf')}
                </Button>
                {viewInvoice.status !== 'paid' && hasPermission('finance:edit') && (
                  <Button className="flex-1" onClick={() => { setViewInvoice(null); setPaymentSheet(viewInvoice.id); }}>
                    <Banknote className="h-4 w-4 mr-1" />
                    {t('finance.recordPayment')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Sheet ── */}
      <Sheet open={paymentSheet !== null} onOpenChange={(open) => { if (!open) setPaymentSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-lg sm:mx-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>{t('finance.recordPayment')}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>{t('finance.paymentAmount')}</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="text-lg h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.paymentDate')}</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.paymentMethod')}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                    <SelectItem value="bank_transfer">{t('finance.bankTransfer')}</SelectItem>
                    <SelectItem value="mobile_money">{t('finance.mobileMoney')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('finance.reference')}</Label>
              <Input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Receipt/Reference #"
              />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPaymentSheet(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleRecordPayment}
              disabled={isActionLoading || !paymentAmount}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('finance.recordPayment')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={deleteDialog !== null} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteInvoice')}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isActionLoading}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
