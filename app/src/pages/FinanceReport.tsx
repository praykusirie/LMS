import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Search,
  Loader2,
  CreditCard,
  FileText,
  TrendingUp,
  Banknote,
  Eye,
  Trash2,
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
  DialogFooter,
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
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { usePermissions } from '@/lib/permissions';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [viewInvoice, setViewInvoice] = useState<InvoiceDetail | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
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
    if (!searchQuery) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.student_name.toLowerCase().includes(q) ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.student_code || '').toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

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
    if (!paymentDialog || !paymentAmount) return;
    try {
      setIsActionLoading(true);
      await api.post(`/invoices/${paymentDialog}/payments`, {
        amount: Number(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: paymentRef || undefined,
      });
      toast.success(t('finance.paymentRecorded'));
      setPaymentDialog(null);
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
          color: 'bg-blue-100 text-blue-600',
        },
        {
          label: t('finance.totalCollected'),
          value: `TZS ${formatCurrency(summary.total_collected)}`,
          icon: Banknote,
          color: 'bg-green-100 text-green-600',
        },
        {
          label: t('finance.totalOutstanding'),
          value: `TZS ${formatCurrency(summary.total_outstanding)}`,
          icon: TrendingUp,
          color: 'bg-orange-100 text-orange-600',
        },
        {
          label: t('finance.invoiceCount'),
          value: String(summary.invoice_count),
          icon: CreditCard,
          color: 'bg-purple-100 text-purple-600',
        },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          {t('finance.financeReport')}
        </h1>
        <p className="text-muted-foreground">
          {t('finance.financeReportSubtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-semibold">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('finance.filterByYear')} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('finance.allStatuses')}</SelectItem>
            <SelectItem value="unpaid">{t('finance.unpaid')}</SelectItem>
            <SelectItem value="partial">{t('finance.partial')}</SelectItem>
            <SelectItem value="paid">{t('finance.paid')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
          <div className="text-center py-16 text-muted-foreground">
            {t('finance.noInvoices')}
          </div>
        ) : (
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
                <TableHead>{t('common.actions')}</TableHead>
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
                  <TableCell>{inv.class_name}</TableCell>
                  <TableCell className="text-right">
                    TZS {formatCurrency(inv.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    TZS {formatCurrency(inv.total_paid)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    TZS {formatCurrency(inv.balance)}
                  </TableCell>
                  <TableCell>{statusBadge(inv.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewInvoice(inv.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inv.status !== 'paid' && hasPermission('finance:edit') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPaymentDialog(inv.id)}
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('finance:edit') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog(inv.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Invoice Dialog */}
      <Dialog
        open={viewInvoice !== null}
        onOpenChange={(open) => { if (!open) setViewInvoice(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="text-sm">
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
                          <p className="text-xs text-muted-foreground">{p.payment_method} {p.reference ? `â€” ${p.reference}` : ''}</p>
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

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => { await generateInvoicePdf(viewInvoice); }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {t('finance.downloadPdf')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={paymentDialog !== null}
        onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.recordPayment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('finance.paymentAmount')}</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.paymentDate')}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('finance.bankTransfer')}</SelectItem>
                  <SelectItem value="mobile_money">{t('finance.mobileMoney')}</SelectItem>
                </SelectContent>
              </Select>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isActionLoading || !paymentAmount}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('finance.recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteInvoice')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('finance.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isActionLoading}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
