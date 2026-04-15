import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Banknote,
  Check,
  ChevronsUpDown,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { generateInvoicePdf } from '@/lib/invoice-pdf';

interface Student {
  id: string;
  name: string;
  student_id?: string;
  admission_number?: string;
  class_name?: string;
}

interface FeeStructure {
  id: string;
  academic_year: string;
  year_group: string;
  level: string;
  tuition_amount: number;
  total_term_fee: number;
  term1_percent: number;
  term2_percent: number;
  term3_percent: number;
  books_fee: number;
  cambridge_exam_fee: number;
  hostel_fee: number;
}

interface OtherCharge {
  id: string;
  fee_name: string;
  amount: number;
  fee_type: string;
}

interface LineItem {
  fee_name: string;
  amount: number;
}

interface InvoiceResponse {
  id: string;
  invoice_number: string;
  student_name: string;
  student_code: string;
  class_name: string;
  academic_year: string;
  year_group: string;
  invoice_date: string;
  is_new_student: boolean;
  is_boarder: boolean;
  total_amount: number;
  total_paid: number;
  balance: number;
  term1_amount: number;
  term2_amount: number;
  term3_amount: number;
  line_items: LineItem[];
}

export function CreateInvoice() {
  const { t } = useTranslation();

  // Reference data
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [studentComboOpen, setStudentComboOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0] || '',
  );
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [isBoarder, setIsBoarder] = useState(false);
  const [siblingDiscount, setSiblingDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Created invoice
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceResponse | null>(null);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, yearsRes] = await Promise.all([
        api.get('/students'),
        api.get('/fee-structures/academic-years/list'),
      ]);
      setStudents(
        (studentsRes.data || []).filter((s: any) => s.is_active !== false),
      );
      const years = yearsRes.data || [];
      setAcademicYears(years);
      if (years.length > 0) {
        setAcademicYear(years[0]);
      }
    } catch {
      toast.error('Failed to load reference data');
    } finally {
      setIsLoading(false);
    }
  };

  // When academic year changes, fetch fee structures and other charges
  useEffect(() => {
    if (!academicYear) return;
    const fetchFees = async () => {
      try {
        const [fsRes, ocRes] = await Promise.all([
          api.get(`/fee-structures?academic_year=${encodeURIComponent(academicYear)}`),
          api.get(`/fee-structures/other-charges/list?academic_year=${encodeURIComponent(academicYear)}`),
        ]);
        setFeeStructures(fsRes.data || []);
        setOtherCharges(ocRes.data || []);
      } catch {
        toast.error('Failed to load fee structures');
      }
    };
    fetchFees();
  }, [academicYear]);

  // Auto-select year group from student's class
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId],
  );

  useEffect(() => {
    if (selectedStudent?.class_name) {
      // Try to match the class_name to a year_group in fee structures
      const match = feeStructures.find(
        (fs) =>
          fs.year_group.toLowerCase() ===
          selectedStudent.class_name?.toLowerCase(),
      );
      if (match) {
        setYearGroup(match.year_group);
      }
    }
  }, [selectedStudent, feeStructures]);

  // Available year groups from fee structures
  const yearGroups = useMemo(
    () => feeStructures.map((fs) => fs.year_group),
    [feeStructures],
  );

  // Selected fee structure
  const selectedFee = useMemo(
    () => feeStructures.find((fs) => fs.year_group === yearGroup),
    [feeStructures, yearGroup],
  );

  // ── Calculate preview line items ──
  const previewLineItems = useMemo(() => {
    if (!selectedFee) return [];

    const items: LineItem[] = [];
    const discountPct = Number(siblingDiscount) || 0;
    const tuition = Number(selectedFee.total_term_fee);
    const discount = Math.round((tuition * discountPct) / 100);
    const netTuition = tuition - discount;

    items.push({ fee_name: 'Tuition Fee', amount: netTuition });

    if (discount > 0) {
      items.push({ fee_name: 'Sibling Discount', amount: -discount });
    }

    if (isNewStudent) {
      for (const charge of otherCharges.filter((c) => c.fee_type === 'new_student')) {
        items.push({ fee_name: charge.fee_name, amount: Number(charge.amount) });
      }
    }

    for (const charge of otherCharges.filter((c) => c.fee_type === 'annual')) {
      items.push({ fee_name: charge.fee_name, amount: Number(charge.amount) });
    }

    if (Number(selectedFee.books_fee) > 0) {
      items.push({ fee_name: 'Books Fee', amount: Number(selectedFee.books_fee) });
    }

    if (Number(selectedFee.cambridge_exam_fee) > 0) {
      items.push({ fee_name: 'Cambridge Exam Fees', amount: Number(selectedFee.cambridge_exam_fee) });
    }

    if (isBoarder && Number(selectedFee.hostel_fee) > 0) {
      items.push({ fee_name: 'Hostel Fee', amount: Number(selectedFee.hostel_fee) });
    }

    // Apply overrides
    return items.map((li) => {
      if (overrides[li.fee_name] !== undefined && overrides[li.fee_name] !== '') {
        return { ...li, amount: Number(overrides[li.fee_name]) };
      }
      return li;
    });
  }, [selectedFee, siblingDiscount, isNewStudent, isBoarder, otherCharges, overrides]);

  const totalAmount = useMemo(
    () => previewLineItems.reduce((sum, li) => sum + li.amount, 0),
    [previewLineItems],
  );

  const termBreakdown = useMemo(() => {
    if (!selectedFee) return { term1: 0, term2: 0, term3: 0 };
    const t1 = Math.round((totalAmount * Number(selectedFee.term1_percent)) / 100);
    const t3 = Math.round((totalAmount * Number(selectedFee.term3_percent)) / 100);
    const t2 = totalAmount - t1 - t3;
    return { term1: t1, term2: t2, term3: t3 };
  }, [selectedFee, totalAmount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast.error(t('finance.selectStudent'));
      return;
    }
    if (!academicYear || !yearGroup) {
      toast.error('Please select academic year and year group');
      return;
    }

    try {
      setIsSubmitting(true);

      const lineItemOverrides = Object.entries(overrides)
        .filter(([, v]) => v !== '')
        .map(([fee_name, amount]) => ({ fee_name, amount: Number(amount) }));

      const res = await api.post('/invoices', {
        student_id: selectedStudentId,
        academic_year: academicYear,
        year_group: yearGroup,
        is_new_student: isNewStudent,
        is_boarder: isBoarder,
        sibling_discount_percent: Number(siblingDiscount),
        invoice_date: invoiceDate,
        notes: notes || undefined,
        line_item_overrides: lineItemOverrides.length > 0 ? lineItemOverrides : undefined,
      });

      setCreatedInvoice(res.data);
      toast.success(t('finance.invoiceCreated'));
    } catch {
      toast.error(t('finance.invoiceError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewInvoice = () => {
    setCreatedInvoice(null);
    setSelectedStudentId('');
    setYearGroup('');
    setIsNewStudent(false);
    setIsBoarder(false);
    setSiblingDiscount('0');
    setNotes('');
    setOverrides({});
    setOverridesOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Success state: show created invoice ──
  if (createdInvoice) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('finance.createInvoice')}</h1>
            <p className="text-muted-foreground">{t('finance.invoiceCreated')}</p>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateInvoicePdf(createdInvoice)}>
            <Download className="h-4 w-4 mr-1" />
            {t('finance.downloadPdf')}
          </Button>
          <Button onClick={handleNewInvoice}>{t('finance.createInvoice')}</Button>
        </div>
        </div>

        <div className="bg-card rounded-xl border p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">{createdInvoice.invoice_number}</p>
              <p className="text-sm text-muted-foreground">
                {createdInvoice.student_name} — {createdInvoice.class_name}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {createdInvoice.line_items.map((li, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{li.fee_name}</span>
                <span className={li.amount < 0 ? 'text-red-500' : ''}>
                  {li.amount < 0 ? '-' : ''}TZS {formatCurrency(Math.abs(li.amount))}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{t('finance.totalFee')}</span>
              <span>TZS {formatCurrency(createdInvoice.total_amount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">{t('finance.term1')}</p>
              <p className="font-semibold">TZS {formatCurrency(createdInvoice.term1_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">{t('finance.term2')}</p>
              <p className="font-semibold">TZS {formatCurrency(createdInvoice.term2_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">{t('finance.term3')}</p>
              <p className="font-semibold">TZS {formatCurrency(createdInvoice.term3_amount)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Form state ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          {t('finance.createInvoice')}
        </h1>
        <p className="text-muted-foreground">{t('finance.createInvoiceSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label>{t('finance.selectStudent')}</Label>
              <Popover open={studentComboOpen} onOpenChange={setStudentComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedStudent
                      ? `${selectedStudent.name} (${selectedStudent.student_id || selectedStudent.admission_number || ''})`
                      : t('finance.searchStudent')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('finance.searchStudent')} />
                    <CommandList>
                      <CommandEmpty>{t('finance.noStudentFound')}</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={`${student.name} ${student.student_id || ''} ${student.admission_number || ''}`}
                            onSelect={() => {
                              setSelectedStudentId(student.id);
                              setStudentComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedStudentId === student.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.student_id || student.admission_number} — {student.class_name}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <Label>{t('finance.academicYear')}</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Group */}
            <div className="space-y-2">
              <Label>{t('finance.yearGroup')}</Label>
              <Select value={yearGroup} onValueChange={setYearGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearGroups.map((yg) => (
                    <SelectItem key={yg} value={yg}>{yg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label>{t('finance.invoiceDate')}</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <Label htmlFor="new-student">{t('finance.newStudent')}</Label>
              <Switch
                id="new-student"
                checked={isNewStudent}
                onCheckedChange={setIsNewStudent}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="boarder">{t('finance.boarder')}</Label>
              <Switch
                id="boarder"
                checked={isBoarder}
                onCheckedChange={setIsBoarder}
              />
            </div>

            {/* Sibling Discount */}
            <div className="space-y-2">
              <Label>{t('finance.siblingDiscount')}</Label>
              <Select value={siblingDiscount} onValueChange={setSiblingDiscount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('finance.noDiscount')}</SelectItem>
                  <SelectItem value="10">{t('finance.secondChild')}</SelectItem>
                  <SelectItem value="12.5">{t('finance.thirdChild')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('finance.notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20"
              />
            </div>
          </div>

          {/* Overrides */}
          {previewLineItems.length > 0 && (
            <Collapsible open={overridesOpen} onOpenChange={setOverridesOpen}>
              <div className="bg-card rounded-xl border">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto"
                  >
                    <span className="font-medium">{t('finance.overrideAmounts')}</span>
                    {overridesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-3">
                    {previewLineItems
                      .filter((li) => li.fee_name !== 'Sibling Discount')
                      .map((li) => (
                        <div key={li.fee_name} className="flex items-center gap-3">
                          <Label className="flex-1 text-sm">{li.fee_name}</Label>
                          <Input
                            type="number"
                            className="w-40"
                            placeholder={formatCurrency(li.amount)}
                            value={overrides[li.fee_name] ?? ''}
                            onChange={(e) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [li.fee_name]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>

        {/* ── Right: Preview ── */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 sticky top-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              {t('finance.invoicePreview')}
            </h2>

            {selectedStudent && (
              <div className="mb-4 text-sm">
                <p className="font-medium">{selectedStudent.name}</p>
                <p className="text-muted-foreground">
                  {selectedStudent.class_name} — {academicYear}
                </p>
              </div>
            )}

            {previewLineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Select a year group to see the fee breakdown
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {previewLineItems.map((li, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{li.fee_name}</span>
                      <span className={li.amount < 0 ? 'text-red-500' : ''}>
                        {li.amount < 0 ? '-' : ''}TZS{' '}
                        {formatCurrency(Math.abs(li.amount))}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('finance.totalFee')}</span>
                  <span>TZS {formatCurrency(totalAmount)}</span>
                </div>

                <Separator className="my-4" />

                <h3 className="text-sm font-medium mb-3">
                  {t('finance.termBreakdown')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t('finance.term1')}
                    </p>
                    <p className="font-semibold text-sm">
                      TZS {formatCurrency(termBreakdown.term1)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t('finance.term2')}
                    </p>
                    <p className="font-semibold text-sm">
                      TZS {formatCurrency(termBreakdown.term2)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t('finance.term3')}
                    </p>
                    <p className="font-semibold text-sm">
                      TZS {formatCurrency(termBreakdown.term3)}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isSubmitting || !selectedStudentId}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('finance.generateInvoice')
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
