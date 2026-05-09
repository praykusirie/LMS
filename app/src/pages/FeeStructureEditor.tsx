import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
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
import { Table } from '@/components/ui/table';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

interface FeeRow {
  id?: string;
  academic_year: string;
  year_group: string;
  level: string;
  tuition_amount: string;
  total_term_fee: string;
  term1_percent: string;
  term2_percent: string;
  term3_percent: string;
  books_fee: string;
  cambridge_exam_fee: string;
  hostel_fee: string;
}

interface OtherCharge {
  id?: string;
  academic_year: string;
  fee_name: string;
  amount: string;
  fee_type: string;
  min_level: string;
}

const LEVEL_OPTIONS = [
  { value: 'pre_primary', label: 'Pre-Primary' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'advanced', label: 'Advanced' },
];

const FEE_TYPE_OPTIONS = [
  { value: 'new_student', label: 'New Student' },
  { value: 'annual', label: 'Annual' },
  { value: 'optional', label: 'Optional' },
];

const MIN_LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'pre_primary', label: 'Pre-Primary+' },
  { value: 'primary', label: 'Primary+' },
  { value: 'secondary', label: 'Secondary+' },
  { value: 'advanced', label: 'Advanced Only' },
];

const LEVEL_BADGE_COLORS: Record<string, string> = {
  pre_primary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  advanced: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function FeeStructureEditor() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);
  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Year switch confirm
  const [pendingYear, setPendingYear] = useState<string | null>(null);
  const [switchYearDialog, setSwitchYearDialog] = useState(false);

  // Mobile row edit Sheet
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editRowDraft, setEditRowDraft] = useState<FeeRow | null>(null);

  // New year dialog
  const [newYearDialog, setNewYearDialog] = useState(false);
  const [newYearValue, setNewYearValue] = useState('');
  const [copyFromYear, setCopyFromYear] = useState('');

  // New other charge dialog
  const [newChargeDialog, setNewChargeDialog] = useState(false);
  const [newCharge, setNewCharge] = useState<OtherCharge>({
    academic_year: '',
    fee_name: '',
    amount: '',
    fee_type: 'annual',
    min_level: '',
  });

  // Per-row term % validation
  const termErrors = useMemo<Record<number, string>>(() => {
    const errors: Record<number, string> = {};
    feeRows.forEach((row, idx) => {
      const sum = Number(row.term1_percent) + Number(row.term2_percent) + Number(row.term3_percent);
      if (Math.round(sum) !== 100) {
        errors[idx] = `${Math.round(sum)}%`;
      }
    });
    return errors;
  }, [feeRows]);

  const hasTermErrors = Object.keys(termErrors).length > 0;

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (academicYear) fetchFeeData();
  }, [academicYear]);

  // Warn on page leave when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/fee-structures/academic-years/list');
      const years = res.data || [];
      setAcademicYears(years);
      if (years.length > 0) setAcademicYear(years[0]);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeeData = async () => {
    try {
      setIsLoading(true);
      const [fsRes, ocRes] = await Promise.all([
        api.get(`/fee-structures?academic_year=${encodeURIComponent(academicYear)}`),
        api.get(`/fee-structures/other-charges/list?academic_year=${encodeURIComponent(academicYear)}`),
      ]);

      setFeeRows(
        (fsRes.data || []).map((row: any) => ({
          id: row.id,
          academic_year: row.academic_year,
          year_group: row.year_group,
          level: row.level,
          tuition_amount: String(row.tuition_amount),
          total_term_fee: String(row.total_term_fee),
          term1_percent: String(row.term1_percent),
          term2_percent: String(row.term2_percent),
          term3_percent: String(row.term3_percent),
          books_fee: String(row.books_fee),
          cambridge_exam_fee: String(row.cambridge_exam_fee),
          hostel_fee: String(row.hostel_fee),
        })),
      );

      setOtherCharges(
        (ocRes.data || []).map((row: any) => ({
          id: row.id,
          academic_year: row.academic_year,
          fee_name: row.fee_name,
          amount: String(row.amount),
          fee_type: row.fee_type,
          min_level: row.min_level || '',
        })),
      );
    } catch {
      toast.error('Failed to load fee data');
    } finally {
      setIsLoading(false);
      setIsDirty(false);
    }
  };

  const updateFeeRow = (index: number, field: keyof FeeRow, value: string) => {
    setIsDirty(true);
    setFeeRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addFeeRow = () => {
    setIsDirty(true);
    setFeeRows((prev) => [
      ...prev,
      {
        academic_year: academicYear,
        year_group: '',
        level: 'primary',
        tuition_amount: '0',
        total_term_fee: '0',
        term1_percent: '50',
        term2_percent: '35',
        term3_percent: '15',
        books_fee: '0',
        cambridge_exam_fee: '0',
        hostel_fee: '0',
      },
    ]);
  };

  const removeFeeRow = (index: number) => {
    const row = feeRows[index];
    if (row.id) {
      api.delete(`/fee-structures/${row.id}`).catch(() => {
        toast.error('Failed to delete');
      });
    }
    setIsDirty(true);
    setFeeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOtherCharge = (index: number, field: keyof OtherCharge, value: string) => {
    setIsDirty(true);
    setOtherCharges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeOtherCharge = async (index: number) => {
    const charge = otherCharges[index];
    if (charge.id) {
      try {
        await api.delete(`/fee-structures/other-charges/${charge.id}`);
      } catch {
        toast.error('Failed to delete charge');
        return;
      }
    }
    setIsDirty(true);
    setOtherCharges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (hasTermErrors) {
      toast.error('Fix term percentage errors before saving (must total 100%)');
      return;
    }
    try {
      setIsSaving(true);

      const items = feeRows
        .filter((r) => r.year_group)
        .map((r) => ({
          academic_year: r.academic_year,
          year_group: r.year_group,
          level: r.level,
          tuition_amount: Number(r.tuition_amount) || 0,
          total_term_fee: Number(r.total_term_fee) || 0,
          term1_percent: Number(r.term1_percent) || 0,
          term2_percent: Number(r.term2_percent) || 0,
          term3_percent: Number(r.term3_percent) || 0,
          books_fee: Number(r.books_fee) || 0,
          cambridge_exam_fee: Number(r.cambridge_exam_fee) || 0,
          hostel_fee: Number(r.hostel_fee) || 0,
        }));

      if (items.length > 0) {
        await api.post('/fee-structures/bulk', { items });
      }

      for (const charge of otherCharges) {
        if (charge.id) {
          await api.put(`/fee-structures/other-charges/${charge.id}`, {
            fee_name: charge.fee_name,
            amount: Number(charge.amount) || 0,
            fee_type: charge.fee_type,
            min_level: charge.min_level || null,
          });
        } else if (charge.fee_name) {
          await api.post('/fee-structures/other-charges', {
            academic_year: academicYear,
            fee_name: charge.fee_name,
            amount: Number(charge.amount) || 0,
            fee_type: charge.fee_type,
            min_level: charge.min_level || null,
          });
        }
      }

      toast.success(t('finance.saved'));
      fetchFeeData();
    } catch {
      toast.error(t('finance.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleYearChange = (year: string) => {
    if (isDirty) {
      setPendingYear(year);
      setSwitchYearDialog(true);
    } else {
      setAcademicYear(year);
    }
  };

  const confirmYearSwitch = () => {
    if (pendingYear) {
      setAcademicYear(pendingYear);
      setPendingYear(null);
    }
    setSwitchYearDialog(false);
    setIsDirty(false);
  };

  const handleCreateYear = async () => {
    if (!newYearValue || academicYears.includes(newYearValue)) return;

    let copiedRows: FeeRow[] = [];
    if (copyFromYear) {
      try {
        const res = await api.get(`/fee-structures?academic_year=${encodeURIComponent(copyFromYear)}`);
        copiedRows = (res.data || []).map((row: any) => ({
          academic_year: newYearValue,
          year_group: row.year_group,
          level: row.level,
          tuition_amount: String(row.tuition_amount),
          total_term_fee: String(row.total_term_fee),
          term1_percent: String(row.term1_percent),
          term2_percent: String(row.term2_percent),
          term3_percent: String(row.term3_percent),
          books_fee: String(row.books_fee),
          cambridge_exam_fee: String(row.cambridge_exam_fee),
          hostel_fee: String(row.hostel_fee),
          // no id — these are new rows
        }));
      } catch {
        toast.error('Failed to copy fee structure');
      }
    }

    setAcademicYears((prev) => [newYearValue, ...prev]);
    setAcademicYear(newYearValue);
    setFeeRows(copiedRows);
    setOtherCharges([]);
    setNewYearDialog(false);
    setNewYearValue('');
    setCopyFromYear('');
    if (copiedRows.length > 0) setIsDirty(true);
  };

  const handleAddCharge = () => {
    if (!newCharge.fee_name) return;
    setIsDirty(true);
    setOtherCharges((prev) => [
      ...prev,
      { ...newCharge, academic_year: academicYear },
    ]);
    setNewChargeDialog(false);
    setNewCharge({ academic_year: '', fee_name: '', amount: '', fee_type: 'annual', min_level: '' });
  };

  // Mobile row sheet helpers
  const openEditRow = (idx: number) => {
    setEditingRowIndex(idx);
    setEditRowDraft({ ...feeRows[idx] });
  };

  const updateEditDraft = (field: keyof FeeRow, value: string) => {
    setEditRowDraft((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const saveEditRow = () => {
    if (editingRowIndex === null || !editRowDraft) return;
    setFeeRows((prev) => {
      const updated = [...prev];
      updated[editingRowIndex] = editRowDraft;
      return updated;
    });
    setIsDirty(true);
    setEditingRowIndex(null);
    setEditRowDraft(null);
  };

  const editDraftTermSum = editRowDraft
    ? Math.round(Number(editRowDraft.term1_percent) + Number(editRowDraft.term2_percent) + Number(editRowDraft.term3_percent))
    : 100;

  if (isLoading && !academicYear) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canManage = hasPermission('finance:manage_fees');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.feeStructure')}
        description={t('finance.feeStructureSubtitle')}
        secondaryActions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setNewYearDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Year
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || hasTermErrors}
                className="rounded-xl"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {t('finance.saveAll')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
              onClick={handleSave}
              disabled={isSaving || hasTermErrors}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Save Now</span>
            </Button>
          )}
        </div>
      )}

      {/* Academic Year Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{t('finance.academicYear')}</span>
        <Select value={academicYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Fee Structures Section ── */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold">{t('finance.tuition')} &amp; {t('finance.feeStructure')}</h2>
          {canManage && (
            <Button variant="outline" size="sm" className="rounded-lg" onClick={addFeeRow}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Desktop table — ≥lg */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[120px]">{t('finance.yearGroup')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[130px]">Level</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[130px]">Tuition (One-time)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[130px]">Tuition (Terms)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[90px]">T1%</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[90px]">T2%</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[90px]">T3%</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[110px]">{t('finance.books')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[110px]">{t('finance.cambridge')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[110px]">{t('finance.hostel')}</th>
                    <th className="w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map((row, idx) => (
                    <tr key={row.id || idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2">
                        <Input value={row.year_group} onChange={(e) => updateFeeRow(idx, 'year_group', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <Select value={row.level} onValueChange={(v) => updateFeeRow(idx, 'level', v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LEVEL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.tuition_amount} onChange={(e) => updateFeeRow(idx, 'tuition_amount', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.total_term_fee} onChange={(e) => updateFeeRow(idx, 'total_term_fee', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <Input type="number" value={row.term1_percent} onChange={(e) => updateFeeRow(idx, 'term1_percent', e.target.value)} className={cn('h-8 w-16', termErrors[idx] && 'border-red-500')} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.term2_percent} onChange={(e) => updateFeeRow(idx, 'term2_percent', e.target.value)} className={cn('h-8 w-16', termErrors[idx] && 'border-red-500')} />
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <Input type="number" value={row.term3_percent} onChange={(e) => updateFeeRow(idx, 'term3_percent', e.target.value)} className={cn('h-8 w-16', termErrors[idx] && 'border-red-500')} />
                          {termErrors[idx] && (
                            <p className="text-xs text-red-500 mt-0.5 whitespace-nowrap">= {termErrors[idx]}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.books_fee} onChange={(e) => updateFeeRow(idx, 'books_fee', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.cambridge_exam_fee} onChange={(e) => updateFeeRow(idx, 'cambridge_exam_fee', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={row.hostel_fee} onChange={(e) => updateFeeRow(idx, 'hostel_fee', e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFeeRow(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {feeRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                        No fee structures for this year. Click &ldquo;Add&rdquo; to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — <lg */}
            <div className="block lg:hidden divide-y divide-border">
              {feeRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No fee structures. Tap &ldquo;Add&rdquo; to create one.
                </div>
              ) : (
                feeRows.map((row, idx) => (
                  <div key={row.id || idx} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{row.year_group || <span className="text-muted-foreground italic">Unnamed</span>}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', LEVEL_BADGE_COLORS[row.level] ?? 'bg-secondary text-muted-foreground')}>
                            {LEVEL_OPTIONS.find(l => l.value === row.level)?.label ?? row.level}
                          </span>
                          {termErrors[idx] && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              T%={termErrors[idx]}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Terms: <span className="text-foreground font-medium">{Number(row.total_term_fee).toLocaleString()}</span></span>
                          <span>One-time: <span className="text-foreground font-medium">{Number(row.tuition_amount).toLocaleString()}</span></span>
                          <span>T1: {row.term1_percent}% · T2: {row.term2_percent}% · T3: {row.term3_percent}%</span>
                          {Number(row.books_fee) > 0 && <span>Books: {Number(row.books_fee).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEditRow(idx)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeFeeRow(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {!canManage && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Other Charges Section ── */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold">{t('finance.otherCharges')}</h2>
          {canManage && (
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setNewChargeDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">{t('finance.feeName')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">{t('finance.amount')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">{t('finance.feeType')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Applies From</th>
                <th className="w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {otherCharges.map((charge, idx) => (
                <tr key={charge.id || idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2">
                    <Input value={charge.fee_name} onChange={(e) => updateOtherCharge(idx, 'fee_name', e.target.value)} className="h-8" />
                  </td>
                  <td className="px-4 py-2">
                    <Input type="number" value={charge.amount} onChange={(e) => updateOtherCharge(idx, 'amount', e.target.value)} className="h-8 w-40" />
                  </td>
                  <td className="px-4 py-2">
                    <Select value={charge.fee_type} onValueChange={(v) => updateOtherCharge(idx, 'fee_type', v)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FEE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <Select value={charge.min_level} onValueChange={(v) => updateOtherCharge(idx, 'min_level', v)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue placeholder="All Levels" /></SelectTrigger>
                      <SelectContent>
                        {MIN_LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || '_all'} value={opt.value || ' '}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOtherCharge(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {otherCharges.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                    No other charges. Click &ldquo;Add&rdquo; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Mobile other charges */}
        <div className="block sm:hidden divide-y divide-border">
          {otherCharges.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No other charges. Tap &ldquo;Add&rdquo; to create one.
            </div>
          ) : (
            otherCharges.map((charge, idx) => (
              <div key={charge.id || idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{charge.fee_name || <span className="text-muted-foreground italic">Unnamed</span>}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {FEE_TYPE_OPTIONS.find(o => o.value === charge.fee_type)?.label} ·{' '}
                      {MIN_LEVEL_OPTIONS.find(o => o.value === charge.min_level)?.label ?? 'All Levels'}
                    </p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeOtherCharge(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('finance.feeName')}</Label>
                    <Input value={charge.fee_name} onChange={(e) => updateOtherCharge(idx, 'fee_name', e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('finance.amount')}</Label>
                    <Input type="number" value={charge.amount} onChange={(e) => updateOtherCharge(idx, 'amount', e.target.value)} className="h-9" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Mobile Row Edit Sheet ── */}
      <Sheet open={editingRowIndex !== null} onOpenChange={(open) => { if (!open) { setEditingRowIndex(null); setEditRowDraft(null); } }}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Edit Fee Row</SheetTitle>
            {editRowDraft && (
              <p className="text-sm text-muted-foreground">{editRowDraft.year_group || 'New row'}</p>
            )}
          </SheetHeader>
          {editRowDraft && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>{t('finance.yearGroup')}</Label>
                  <Input value={editRowDraft.year_group} onChange={(e) => updateEditDraft('year_group', e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Level</Label>
                  <Select value={editRowDraft.level} onValueChange={(v) => updateEditDraft('level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tuition (One-time)</Label>
                  <Input type="number" value={editRowDraft.tuition_amount} onChange={(e) => updateEditDraft('tuition_amount', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tuition (Terms)</Label>
                  <Input type="number" value={editRowDraft.total_term_fee} onChange={(e) => updateEditDraft('total_term_fee', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Term 1 %</Label>
                  <Input type="number" value={editRowDraft.term1_percent} onChange={(e) => updateEditDraft('term1_percent', e.target.value)} className={editDraftTermSum !== 100 ? 'border-red-500' : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>Term 2 %</Label>
                  <Input type="number" value={editRowDraft.term2_percent} onChange={(e) => updateEditDraft('term2_percent', e.target.value)} className={editDraftTermSum !== 100 ? 'border-red-500' : ''} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Term 3 %</Label>
                  <Input type="number" value={editRowDraft.term3_percent} onChange={(e) => updateEditDraft('term3_percent', e.target.value)} className={editDraftTermSum !== 100 ? 'border-red-500' : ''} />
                  {editDraftTermSum !== 100 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      T1+T2+T3 = {editDraftTermSum}% (must equal 100%)
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('finance.books')}</Label>
                  <Input type="number" value={editRowDraft.books_fee} onChange={(e) => updateEditDraft('books_fee', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('finance.cambridge')}</Label>
                  <Input type="number" value={editRowDraft.cambridge_exam_fee} onChange={(e) => updateEditDraft('cambridge_exam_fee', e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>{t('finance.hostel')}</Label>
                  <Input type="number" value={editRowDraft.hostel_fee} onChange={(e) => updateEditDraft('hostel_fee', e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setEditingRowIndex(null); setEditRowDraft(null); }}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1 rounded-xl" onClick={saveEditRow} disabled={editDraftTermSum !== 100}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── New Academic Year Dialog ── */}
      <Dialog open={newYearDialog} onOpenChange={setNewYearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Academic Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('finance.academicYear')}</Label>
              <Input
                value={newYearValue}
                onChange={(e) => setNewYearValue(e.target.value)}
                placeholder="2026/2027"
              />
            </div>
            {academicYears.length > 0 && (
              <div className="space-y-2">
                <Label>Copy fee structure from</Label>
                <Select value={copyFromYear} onValueChange={setCopyFromYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start fresh (empty)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Start fresh (empty)</SelectItem>
                    {academicYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Copies all year-group rows as a starting point. You can edit and save after.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewYearDialog(false); setNewYearValue(''); setCopyFromYear(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateYear} disabled={!newYearValue || academicYears.includes(newYearValue)}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Other Charge Dialog ── */}
      <Dialog open={newChargeDialog} onOpenChange={setNewChargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('finance.feeName')}</Label>
              <Input
                value={newCharge.fee_name}
                onChange={(e) => setNewCharge((prev) => ({ ...prev, fee_name: e.target.value }))}
                placeholder="e.g. Uniform Fee"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.amount')}</Label>
              <Input
                type="number"
                value={newCharge.amount}
                onChange={(e) => setNewCharge((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.feeType')}</Label>
              <Select value={newCharge.fee_type} onValueChange={(v) => setNewCharge((prev) => ({ ...prev, fee_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Applies From</Label>
              <Select value={newCharge.min_level} onValueChange={(v) => setNewCharge((prev) => ({ ...prev, min_level: v }))}>
                <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
                <SelectContent>
                  {MIN_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || ' '}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChargeDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCharge} disabled={!newCharge.fee_name}>
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Year Switch ── */}
      <AlertDialog open={switchYearDialog} onOpenChange={setSwitchYearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes for <strong>{academicYear}</strong>. Switching years will discard them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSwitchYearDialog(false); setPendingYear(null); }}>
              Stay &amp; Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmYearSwitch}>
              Discard &amp; Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

