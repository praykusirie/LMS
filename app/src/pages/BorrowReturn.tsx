import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  Search,
  RotateCcw,
  Check,
  ChevronsUpDown,
  Loader2,
  Camera,
  Keyboard,
  ScanBarcode,
} from 'lucide-react';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

interface BorrowReturnProps {
  mode?: 'borrow' | 'return' | 'both';
}

interface BookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string;
  available: number;
  is_active?: boolean;
}

interface StudentRecord {
  id: string;
  name: string;
  student_id?: string;
  admission_number?: string;
  class_name?: string;
  avatar?: string;
  is_active?: boolean;
}

interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  lateDays?: number;
  penalty?: number;
}

export function BorrowReturn({ mode = 'both' }: BorrowReturnProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Issue form state
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);
  const [bookComboboxOpen, setBookComboboxOpen] = useState(false);
  
  // Scan state
  const [showScanner, setShowScanner] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');
  const [isbnLookupLoading, setIsbnLookupLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isbnInputRef = useRef<HTMLInputElement>(null);
  
  // Return form state
  const [returnSearch, setReturnSearch] = useState('');
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(null);
  
  // Dialogs
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    setDueDate(defaultDueDate.toISOString().split('T')[0] || '');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [booksRes, studentsRes, borrowRes] = await Promise.all([
        api.get('/books'),
        api.get('/students'),
        api.get('/borrow-records?status=active'),
      ]);

      const mappedBooks: BookRecord[] = (booksRes.data || [])
        .filter((book: any) => book.is_active !== false)
        .map((book: any) => ({
          id: book.id,
          title: book.title,
          author: book.author || 'Unknown',
          isbn: book.isbn || '',
          available: Number(book.available || 0),
          is_active: book.is_active,
        }));

      const mappedStudents: StudentRecord[] = (studentsRes.data || [])
        .filter((student: any) => student.is_active !== false)
        .map((student: any) => ({
          id: student.id,
          name: student.name,
          student_id: student.student_id,
          admission_number: student.admission_number,
          class_name: student.class_name,
          avatar: student.avatar,
          is_active: student.is_active,
        }));

      const mappedBorrows: BorrowRecord[] = (borrowRes.data || []).map((record: any) => ({
        id: record.id,
        bookId: record.book_id,
        bookTitle: record.book_title,
        studentId: record.student_id,
        studentName: record.student_name,
        studentCode: record.student_code || '',
        borrowDate: record.borrow_date,
        dueDate: record.due_date,
        returnDate: record.return_date,
        status: record.current_status,
        lateDays: record.late_days,
        penalty: record.penalty,
      }));

      setBooks(mappedBooks);
      setStudents(mappedStudents);
      setBorrowRecords(mappedBorrows);
    } catch (error) {
      console.error('Error fetching borrow/return data:', error);
      toast.error(t('borrowReturn.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const activeBorrows = useMemo(() => {
    return borrowRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue');
  }, [borrowRecords]);

  const filteredBorrows = useMemo(() => {
    return activeBorrows.filter(borrow => 
      borrow.studentName.toLowerCase().includes(returnSearch.toLowerCase()) ||
      borrow.bookTitle.toLowerCase().includes(returnSearch.toLowerCase())
    );
  }, [activeBorrows, returnSearch]);

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const selectedBookData = books.find(b => b.id === selectedBook);

  const handleIsbnLookup = useCallback(async (isbn: string) => {
    const trimmed = isbn.trim();
    if (!trimmed) return;

    setScanMessage(null);
    setIsbnLookupLoading(true);

    // Try local lookup first (fast path — books are already fetched)
    const localMatch = books.find(b => b.isbn === trimmed && b.available > 0);
    if (localMatch) {
      setSelectedBook(localMatch.id);
      setScanMessage({ type: 'success', text: t('borrowReturn.foundBook', { title: localMatch.title }) });
      setIsbnInput('');
      setShowScanner(false);
      setIsbnLookupLoading(false);
      return;
    }

    // Fall back to API (handles edge cases where local data might be stale)
    try {
      const res = await api.get(`/books/isbn/${encodeURIComponent(trimmed)}`);
      const results = res.data || [];
      const available = results.filter((b: any) => b.is_active !== false && Number(b.available) > 0);
      if (available.length > 0) {
        // If the book exists in our local list, select it; otherwise use the first API result
        const match = books.find(b => b.id === available[0].id) || {
          id: available[0].id,
          title: available[0].title,
          author: available[0].author || 'Unknown',
          isbn: available[0].isbn || '',
          available: Number(available[0].available || 0),
        };
        if (!books.find(b => b.id === match.id)) {
          setBooks(prev => [...prev, match]);
        }
        setSelectedBook(match.id);
        setScanMessage({ type: 'success', text: t('borrowReturn.foundBook', { title: match.title }) });
      } else if (results.length > 0) {
        setScanMessage({ type: 'error', text: t('borrowReturn.bookFoundNoAvailable') });
      } else {
        setScanMessage({ type: 'error', text: t('borrowReturn.noBookFoundIsbn', { isbn: trimmed }) });
      }
    } catch {
      // Check if it was a local-only match with no availability
      const localAny = books.find(b => b.isbn === trimmed);
      if (localAny) {
        setScanMessage({ type: 'error', text: t('borrowReturn.bookFoundNoAvailable') });
      } else {
        setScanMessage({ type: 'error', text: t('borrowReturn.noBookFoundIsbn', { isbn: trimmed }) });
      }
    } finally {
      setIsbnInput('');
      setShowScanner(false);
      setIsbnLookupLoading(false);
    }
  }, [books]);

  const handleIsbnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleIsbnLookup(isbnInput);
    }
  };

  const handleIssueBook = () => {
    setErrorMessage('');
    
    if (!selectedStudent || !selectedBook || !dueDate) {
      setErrorMessage(t('borrowReturn.fillAllFields'));
      return;
    }

    const book = books.find(b => b.id === selectedBook);
    const student = students.find(s => s.id === selectedStudent);

    if (!book || !student) return;

    if (book.available <= 0) {
      setErrorMessage(t('borrowReturn.bookOutOfStock'));
      return;
    }

    // Check student borrow limit (max 3 books)
    const studentBorrows = borrowRecords.filter(r => r.studentId === selectedStudent && (r.status === 'borrowed' || r.status === 'overdue'));
    if (studentBorrows.length >= 3) {
      setErrorMessage(t('borrowReturn.maxBorrowLimitReached'));
      return;
    }

    setShowIssueConfirm(true);
  };

  const confirmIssue = async () => {
    if (!selectedStudentData || !selectedBookData || !dueDate) return;

    try {
      setIsSubmitting(true);
      await api.post('/borrow-records', {
        student_id: selectedStudentData.id,
        book_id: selectedBookData.id,
        due_date: dueDate,
      });

      setShowIssueConfirm(false);
      setSuccessMessage(t('borrowReturn.bookIssuedTo', { book: selectedBookData.title, student: selectedStudentData.name }));
      setShowSuccess(true);

      setSelectedStudent('');
      setSelectedBook('');
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 14);
      setDueDate(nextDueDate.toISOString().split('T')[0] || '');

      await fetchData();
    } catch (error: any) {
      console.error('Error issuing book:', error);
      setErrorMessage(error?.message || t('borrowReturn.failedToIssue'));
      setShowIssueConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnBook = (borrow: BorrowRecord) => {
    setSelectedBorrow(borrow);
    setShowReturnConfirm(true);
  };

  const confirmReturn = async () => {
    if (!selectedBorrow) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/borrow-records/${selectedBorrow.id}/return`);

      setShowReturnConfirm(false);
      setSuccessMessage(t('borrowReturn.bookReturnedSuccessfully', { book: selectedBorrow.bookTitle }));
      setShowSuccess(true);
      setSelectedBorrow(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error returning book:', error);
      setErrorMessage(error?.message || t('borrowReturn.failedToReturn'));
      setShowReturnConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentCode = (student: StudentRecord) => student.student_id || student.admission_number || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('borrowReturn.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('borrowReturn.pageSubtitle')}
        </p>
      </motion.div>

      {/* Tabs for Borrow/Return */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[20px] bg-card p-6 shadow-card"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <Tabs defaultValue={mode === 'return' ? 'return' : 'borrow'} className="w-full">
          {mode === 'both' && (
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-12">
              <TabsTrigger value="borrow" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t('borrowReturn.issueBook')}
              </TabsTrigger>
              <TabsTrigger value="return" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('borrowReturn.returnBook')}
              </TabsTrigger>
            </TabsList>
          )}

          {/* Borrow Tab Content */}
          {(mode === 'both' || mode === 'borrow') && (
          <TabsContent value="borrow" className="mt-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-navy" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('borrowReturn.issueBook')}</h2>
                <p className="text-sm text-muted-foreground">{t('borrowReturn.lendBookToStudent')}</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Searchable Student Select (Combobox) */}
              <div className="space-y-2">
                <Label>{t('borrowReturn.selectStudent')}</Label>
                <Popover open={studentComboboxOpen} onOpenChange={setStudentComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studentComboboxOpen}
                      className="w-full justify-between rounded-xl h-11"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {selectedStudent ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={selectedStudentData?.avatar} />
                              <AvatarFallback className="text-xs">{selectedStudentData?.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{selectedStudentData?.name} ({selectedStudentData ? getStudentCode(selectedStudentData) : ''})</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('borrowReturn.searchSelectStudent')}</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] p-0" align="start">
                    <Command className="rounded-xl">
                      <CommandInput 
                        placeholder={t('borrowReturn.searchStudentPlaceholder')} 
                        className="h-11 border-0 focus:ring-0"
                      />
                      <CommandList>
                        <CommandEmpty>{t('borrowReturn.noStudentFound')}</CommandEmpty>
                        <CommandGroup>
                          {students.filter(s => s.is_active !== false).map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.name} ${getStudentCode(student)}`}
                              onSelect={() => {
                                setSelectedStudent(student.id);
                                setStudentComboboxOpen(false);
                              }}
                              className="cursor-pointer data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.avatar} />
                                  <AvatarFallback className="text-xs">{student.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">{getStudentCode(student)} • {student.class_name || '-'}</p>
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedStudent === student.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t('borrowReturn.selectBook')}</Label>
                {/* Book selection: Search, Scan, or ISBN input */}
                <div className="flex gap-2">
                  <Popover open={bookComboboxOpen} onOpenChange={setBookComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={bookComboboxOpen}
                        className="w-full justify-between rounded-xl h-11 font-normal"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {selectedBook
                              ? books.find(b => b.id === selectedBook)?.title
                              : t('borrowReturn.searchBookPlaceholder')}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] p-0" align="start">
                      <Command className="rounded-xl">
                        <CommandInput 
                          placeholder={t('borrowReturn.searchBookPlaceholder')} 
                          className="h-11 border-0 focus:ring-0"
                        />
                        <CommandList>
                          <CommandEmpty>{t('borrowReturn.noBooksFound')}</CommandEmpty>
                          <CommandGroup heading={t('borrowReturn.availableBooks')}>
                            {books.filter(b => b.available > 0).map((book) => (
                              <CommandItem
                                key={book.id}
                                value={`${book.title} ${book.author} ${book.isbn}`}
                                onSelect={() => {
                                  setSelectedBook(book.id);
                                  setBookComboboxOpen(false);
                                  setScanMessage(null);
                                }}
                                className="cursor-pointer data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="h-8 w-8 rounded-lg bg-navy-light flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4 text-navy" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{book.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{book.author} • {book.available} {t('borrowReturn.available')}{book.isbn ? ` • ISBN: ${book.isbn}` : ''}</p>
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4 shrink-0",
                                    selectedBook === book.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl shrink-0 border-dashed hover:border-navy hover:text-navy"
                    onClick={() => setShowScanner(true)}
                    title={t('borrowReturn.scanBarcodeCamera')}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                {/* ISBN manual input (also works with USB barcode scanners) */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={isbnInputRef}
                      placeholder={t('borrowReturn.enterOrScanIsbn')}
                      value={isbnInput}
                      onChange={(e) => setIsbnInput(e.target.value)}
                      onKeyDown={handleIsbnKeyDown}
                      className="rounded-xl h-10 pl-10 text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl px-3"
                    onClick={() => handleIsbnLookup(isbnInput)}
                    disabled={!isbnInput.trim() || isbnLookupLoading}
                  >
                    {isbnLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Keyboard className="h-3 w-3" />
                  {t('borrowReturn.isbnScannerHint')}
                </p>

                {/* Scan result message */}
                {scanMessage && (
                  <div className={cn(
                    "p-2.5 rounded-xl text-sm flex items-center gap-2",
                    scanMessage.type === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-700' : 'bg-red-50 dark:bg-red-950/30 text-red-600'
                  )}>
                    {scanMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {scanMessage.text}
                  </div>
                )}
              </div>

              {/* Camera barcode scanner overlay */}
              {showScanner && (
                <BarcodeScanner
                  onScan={(isbn) => handleIsbnLookup(isbn)}
                  onClose={() => setShowScanner(false)}
                />
              )}

              <div className="space-y-2">
                <Label>{t('borrowReturn.dueDate')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="rounded-xl h-11 pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('borrowReturn.defaultDueDateHint')}
                </p>
              </div>

              {hasPermission('borrow:manage') && (
              <Button 
                onClick={handleIssueBook}
                className="w-full bg-navy hover:bg-navy/90 rounded-xl h-11"
              >
                {t('borrowReturn.issueBook')}
              </Button>
              )}
            </div>
          </TabsContent>
          )}

          {/* Return Tab Content */}
          {(mode === 'both' || mode === 'return') && (
          <TabsContent value="return" className="mt-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-navy" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t('borrowReturn.returnBook')}</h2>
                <p className="text-sm text-muted-foreground">{t('borrowReturn.processReturns')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('borrowReturn.searchByStudentOrBook')}
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  className="rounded-xl h-11 pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredBorrows.length === 0 ? (
                  <div className="col-span-full">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('borrowReturn.noActiveBorrows')}
                    </p>
                  </div>
                ) : (
                  filteredBorrows.map(borrow => {
                    const isOverdue = new Date() > new Date(borrow.dueDate);
                    return (
                      <div 
                        key={borrow.id} 
                        className="flex flex-col p-4 bg-secondary/50 rounded-xl"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{borrow.bookTitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">{borrow.studentName}</p>
                          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {t('borrowReturn.dueDate')}: {new Date(borrow.dueDate).toLocaleDateString()}
                            {isOverdue && ` (${t('borrowReturn.overdue')})`}
                          </p>
                        </div>
                        {hasPermission('borrow:manage') && (
                        <Button 
                          size="sm" 
                          onClick={() => handleReturnBook(borrow)}
                          className="mt-3 rounded-lg bg-navy hover:bg-navy/90 w-full"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {t('borrowReturn.return')}
                        </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
          )}
        </Tabs>
        )}
      </motion.div>

      {/* Issue Confirmation Dialog */}
      <Dialog open={showIssueConfirm} onOpenChange={setShowIssueConfirm}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('borrowReturn.confirmBookIssue')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedStudentData && selectedBookData && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedStudentData.avatar} />
                    <AvatarFallback>{selectedStudentData.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedStudentData.name}</p>
                    <p className="text-xs text-muted-foreground">{getStudentCode(selectedStudentData)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="p-3 bg-navy-light rounded-xl">
                  <p className="font-medium text-sm text-navy">{selectedBookData.title}</p>
                  <p className="text-xs text-navy/70">{selectedBookData.author}</p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('borrowReturn.dueDate')}: {dueDate && new Date(dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueConfirm(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmIssue} className="bg-navy hover:bg-navy/90 rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('borrowReturn.confirmIssue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <Dialog open={showReturnConfirm} onOpenChange={setShowReturnConfirm}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('borrowReturn.confirmBookReturn')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedBorrow && (
              <div className="space-y-3">
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">{selectedBorrow.bookTitle}</p>
                  <p className="text-xs text-muted-foreground">{t('borrowReturn.borrowedBy', { name: selectedBorrow.studentName })}</p>
                </div>
                
                {new Date() > new Date(selectedBorrow.dueDate) && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl">
                    <p className="text-sm text-red-600 font-medium">{t('borrowReturn.overdue')}</p>
                    <p className="text-xs text-red-500">
                      {t('borrowReturn.lateByDays', { days: Math.ceil((new Date().getTime() - new Date(selectedBorrow.dueDate).getTime()) / (1000 * 60 * 60 * 24)) })}
                    </p>
                    <p className="text-xs text-red-500">
                      {t('borrowReturn.penaltyAmount', { amount: (Math.ceil((new Date().getTime() - new Date(selectedBorrow.dueDate).getTime()) / (1000 * 60 * 60 * 24)) * 1000).toLocaleString() })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnConfirm(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmReturn} className="bg-green hover:bg-green/90 rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('borrowReturn.confirmReturn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="rounded-[20px] max-w-md">
          <div className="py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t('common.success')}!</h3>
            <p className="text-sm text-muted-foreground mt-2">{successMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)} className="w-full bg-navy hover:bg-navy/90 rounded-xl">
              {t('borrowReturn.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
