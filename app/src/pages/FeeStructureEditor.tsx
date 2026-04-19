import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Settings, Loader2, Plus, Save, Trash2 } from 'lucide-react';
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
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

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

export function FeeStructureEditor() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);
  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New year dialog
  const [newYearDialog, setNewYearDialog] = useState(false);
  const [newYearValue, setNewYearValue] = useState('');

  // New other charge dialog
  const [newChargeDialog, setNewChargeDialog] = useState(false);
  const [newCharge, setNewCharge] = useState<OtherCharge>({
    academic_year: '',
    fee_name: '',
    amount: '',
    fee_type: 'annual',
    min_level: '',
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (academicYear) fetchFeeData();
  }, [academicYear]);

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
    }
  };

  const updateFeeRow = (index: number, field: keyof FeeRow, value: string) => {
    setFeeRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addFeeRow = () => {
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
      // Delete from server
      api.delete(`/fee-structures/${row.id}`).catch(() => {
        toast.error('Failed to delete');
      });
    }
    setFeeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOtherCharge = (index: number, field: keyof OtherCharge, value: string) => {
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
    setOtherCharges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Save fee structures via bulk upsert
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

      // Save other charges individually (upsert via PUT or POST)
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
      fetchFeeData(); // Refresh to get IDs
    } catch {
      toast.error(t('finance.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateYear = () => {
    if (!newYearValue || academicYears.includes(newYearValue)) return;
    setAcademicYears((prev) => [newYearValue, ...prev]);
    setAcademicYear(newYearValue);
    setFeeRows([]);
    setOtherCharges([]);
    setNewYearDialog(false);
    setNewYearValue('');
  };

  const handleAddCharge = () => {
    if (!newCharge.fee_name) return;
    setOtherCharges((prev) => [
      ...prev,
      { ...newCharge, academic_year: academicYear },
    ]);
    setNewChargeDialog(false);
    setNewCharge({ academic_year: '', fee_name: '', amount: '', fee_type: 'annual', min_level: '' });
  };

  if (isLoading && !academicYear) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('finance.feeStructure')}
          </h1>
          <p className="text-muted-foreground">
            {t('finance.feeStructureSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('finance:manage_fees') && (
          <Button variant="outline" onClick={() => setNewYearDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Year
          </Button>
          )}
          {hasPermission('finance:manage_fees') && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {t('finance.saveAll')}
          </Button>
          )}
        </div>
      </div>

      {/* Academic Year Selector */}
      <div className="flex items-center gap-3">
        <Label>{t('finance.academicYear')}</Label>
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fee Structures Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold">{t('finance.tuition')} & {t('finance.feeStructure')}</h2>
          {hasPermission('finance:manage_fees') && (
          <Button variant="outline" size="sm" onClick={addFeeRow}>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">{t('finance.yearGroup')}</TableHead>
                  <TableHead className="min-w-[120px]">Level</TableHead>
                  <TableHead className="min-w-[130px]">{t('finance.tuition')} (One-time)</TableHead>
                  <TableHead className="min-w-[130px]">{t('finance.tuition')} (Terms)</TableHead>
                  <TableHead className="min-w-[60px]">T1%</TableHead>
                  <TableHead className="min-w-[60px]">T2%</TableHead>
                  <TableHead className="min-w-[60px]">T3%</TableHead>
                  <TableHead className="min-w-[110px]">{t('finance.books')}</TableHead>
                  <TableHead className="min-w-[110px]">{t('finance.cambridge')}</TableHead>
                  <TableHead className="min-w-[110px]">{t('finance.hostel')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeRows.map((row, idx) => (
                  <TableRow key={row.id || idx}>
                    <TableCell>
                      <Input
                        value={row.year_group}
                        onChange={(e) => updateFeeRow(idx, 'year_group', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.level}
                        onValueChange={(v) => updateFeeRow(idx, 'level', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.tuition_amount}
                        onChange={(e) => updateFeeRow(idx, 'tuition_amount', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.total_term_fee}
                        onChange={(e) => updateFeeRow(idx, 'total_term_fee', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.term1_percent}
                        onChange={(e) => updateFeeRow(idx, 'term1_percent', e.target.value)}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.term2_percent}
                        onChange={(e) => updateFeeRow(idx, 'term2_percent', e.target.value)}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.term3_percent}
                        onChange={(e) => updateFeeRow(idx, 'term3_percent', e.target.value)}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.books_fee}
                        onChange={(e) => updateFeeRow(idx, 'books_fee', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.cambridge_exam_fee}
                        onChange={(e) => updateFeeRow(idx, 'cambridge_exam_fee', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hostel_fee}
                        onChange={(e) => updateFeeRow(idx, 'hostel_fee', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      {hasPermission('finance:manage_fees') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFeeRow(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {feeRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No fee structures. Click "Add" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Other Charges Section */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold">{t('finance.otherCharges')}</h2>
          {hasPermission('finance:manage_fees') && (
          <Button variant="outline" size="sm" onClick={() => setNewChargeDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('common.add')}
          </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('finance.feeName')}</TableHead>
              <TableHead>{t('finance.amount')}</TableHead>
              <TableHead>{t('finance.feeType')}</TableHead>
              <TableHead>Applies From</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {otherCharges.map((charge, idx) => (
              <TableRow key={charge.id || idx}>
                <TableCell>
                  <Input
                    value={charge.fee_name}
                    onChange={(e) => updateOtherCharge(idx, 'fee_name', e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={charge.amount}
                    onChange={(e) => updateOtherCharge(idx, 'amount', e.target.value)}
                    className="h-8 w-40"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={charge.fee_type}
                    onValueChange={(v) => updateOtherCharge(idx, 'fee_type', v)}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={charge.min_level}
                    onValueChange={(v) => updateOtherCharge(idx, 'min_level', v)}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      {MIN_LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value || '_all'} value={opt.value || ' '}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {hasPermission('finance:manage_fees') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeOtherCharge(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {otherCharges.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No other charges. Click "Add" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Academic Year Dialog */}
      <Dialog open={newYearDialog} onOpenChange={setNewYearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Academic Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('finance.academicYear')}</Label>
            <Input
              value={newYearValue}
              onChange={(e) => setNewYearValue(e.target.value)}
              placeholder="2026/2027"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewYearDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateYear} disabled={!newYearValue}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Other Charge Dialog */}
      <Dialog open={newChargeDialog} onOpenChange={setNewChargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('finance.feeName')}</Label>
              <Input
                value={newCharge.fee_name}
                onChange={(e) =>
                  setNewCharge((prev) => ({ ...prev, fee_name: e.target.value }))
                }
                placeholder="e.g. Uniform Fee"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.amount')}</Label>
              <Input
                type="number"
                value={newCharge.amount}
                onChange={(e) =>
                  setNewCharge((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.feeType')}</Label>
              <Select
                value={newCharge.fee_type}
                onValueChange={(v) =>
                  setNewCharge((prev) => ({ ...prev, fee_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Applies From</Label>
              <Select
                value={newCharge.min_level}
                onValueChange={(v) =>
                  setNewCharge((prev) => ({ ...prev, min_level: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  {MIN_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || ' '}>
                      {opt.label}
                    </SelectItem>
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
    </motion.div>
  );
}
