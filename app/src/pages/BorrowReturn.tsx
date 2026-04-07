import { useState, useMemo } from 'react';
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
  ChevronsUpDown
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { books as mockBooks, students as mockStudents, borrowRecords as mockBorrowRecords } from '@/data/mockData';
import type { Book, Student, BorrowRecord } from '@/types';

export function BorrowReturn() {
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [students] = useState<Student[]>(mockStudents);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>(mockBorrowRecords);
  
  // Issue form state
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);
  const [bookComboboxOpen, setBookComboboxOpen] = useState(false);
  
  // Return form state
  const [returnSearch, setReturnSearch] = useState('');
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(null);
  
  // Dialogs
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleIssueBook = () => {
    setErrorMessage('');
    
    if (!selectedStudent || !selectedBook || !dueDate) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    const book = books.find(b => b.id === selectedBook);
    const student = students.find(s => s.id === selectedStudent);

    if (!book || !student) return;

    if (book.available <= 0) {
      setErrorMessage('This book is currently out of stock');
      return;
    }

    // Check student borrow limit (max 3 books)
    const studentBorrows = borrowRecords.filter(r => r.studentId === selectedStudent && r.status === 'borrowed');
    if (studentBorrows.length >= 3) {
      setErrorMessage('Student has reached the maximum borrow limit (3 books)');
      return;
    }

    setShowIssueConfirm(true);
  };

  const confirmIssue = () => {
    if (!selectedStudentData || !selectedBookData || !dueDate) return;

    const newBorrow: BorrowRecord = {
      id: `br${Date.now()}`,
      bookId: selectedBookData.id,
      bookTitle: selectedBookData.title,
      studentId: selectedStudentData.id,
      studentName: selectedStudentData.name,
      borrowDate: new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      status: 'borrowed'
    };

    setBorrowRecords([newBorrow, ...borrowRecords]);
    
    // Update book availability
    setBooks(books.map(b => 
      b.id === selectedBookData.id 
        ? { ...b, available: b.available - 1 } 
        : b
    ));

    setShowIssueConfirm(false);
    setSuccessMessage(`Book "${selectedBookData.title}" issued to ${selectedStudentData.name}`);
    setShowSuccess(true);
    
    // Reset form
    setSelectedStudent('');
    setSelectedBook('');
    setDueDate('');
  };

  const handleReturnBook = (borrow: BorrowRecord) => {
    setSelectedBorrow(borrow);
    setShowReturnConfirm(true);
  };

  const confirmReturn = () => {
    if (!selectedBorrow) return;

    const returnDate = new Date().toISOString();
    const dueDate = new Date(selectedBorrow.dueDate);
    const now = new Date();
    
    let lateDays = 0;
    let penalty = 0;
    
    if (now > dueDate) {
      lateDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      penalty = lateDays * 1000; // TSH 1,000 per day
    }

    setBorrowRecords(borrowRecords.map(r => 
      r.id === selectedBorrow.id 
        ? { 
            ...r, 
            status: 'returned', 
            returnDate,
            lateDays,
            penalty
          } 
        : r
    ));

    // Update book availability
    setBooks(books.map(b => 
      b.id === selectedBorrow.bookId 
        ? { ...b, available: b.available + 1 } 
        : b
    ));

    setShowReturnConfirm(false);
    setSuccessMessage(`Book "${selectedBorrow.bookTitle}" returned successfully`);
    setShowSuccess(true);
    setSelectedBorrow(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Borrow & Return</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issue books to students and process returns
        </p>
      </motion.div>

      {/* Tabs for Borrow/Return */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[20px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <Tabs defaultValue="borrow" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-12">
            <TabsTrigger value="borrow" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Issue Book
            </TabsTrigger>
            <TabsTrigger value="return" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
              <RotateCcw className="h-4 w-4 mr-2" />
              Return Book
            </TabsTrigger>
          </TabsList>

          {/* Borrow Tab Content */}
          <TabsContent value="borrow" className="mt-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-navy" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Issue Book</h2>
                <p className="text-sm text-muted-foreground">Lend a book to a student</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Searchable Student Select (Combobox) */}
              <div className="space-y-2">
                <Label>Select Student</Label>
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
                            <span>{selectedStudentData?.name} ({selectedStudentData?.admissionNumber})</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search and select a student...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command className="rounded-xl">
                      <CommandInput 
                        placeholder="Search students by name or admission number..." 
                        className="h-11 border-0 focus:ring-0"
                      />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup>
                          {students.filter(s => s.isActive).map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.name} ${student.admissionNumber}`}
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
                                  <p className="text-xs text-muted-foreground">{student.admissionNumber} • {student.class}</p>
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
                <Label>Select Book</Label>
                <Popover open={bookComboboxOpen} onOpenChange={setBookComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={bookComboboxOpen}
                      className="w-full justify-between rounded-xl h-11 font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        {selectedBook
                          ? books.find(b => b.id === selectedBook)?.title
                          : "Search and select a book..."}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command className="rounded-xl">
                      <CommandInput 
                        placeholder="Search books by title or author..." 
                        className="h-11 border-0 focus:ring-0"
                      />
                      <CommandList>
                        <CommandEmpty>No books found.</CommandEmpty>
                        <CommandGroup heading="Available Books">
                          {books.filter(b => b.available > 0).map((book) => (
                            <CommandItem
                              key={book.id}
                              value={`${book.title} ${book.author}`}
                              onSelect={() => {
                                setSelectedBook(book.id);
                                setBookComboboxOpen(false);
                              }}
                              className="cursor-pointer data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div className="h-8 w-8 rounded-lg bg-navy-light flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-navy" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{book.title}</p>
                                  <p className="text-xs text-muted-foreground">{book.author} • {book.available} available</p>
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
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
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
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
                  Default: 14 days from today
                </p>
              </div>

              <Button 
                onClick={handleIssueBook}
                className="w-full bg-navy hover:bg-navy/90 rounded-xl h-11"
              >
                Issue Book
              </Button>
            </div>
          </TabsContent>

          {/* Return Tab Content */}
          <TabsContent value="return" className="mt-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-navy" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Return Book</h2>
                <p className="text-sm text-muted-foreground">Process book returns</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student or book..."
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  className="rounded-xl h-11 pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredBorrows.length === 0 ? (
                  <div className="col-span-full">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active borrows found
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
                            Due: {new Date(borrow.dueDate).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleReturnBook(borrow)}
                          className="mt-3 rounded-lg bg-navy hover:bg-navy/90 w-full"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Return
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Issue Confirmation Dialog */}
      <Dialog open={showIssueConfirm} onOpenChange={setShowIssueConfirm}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Book Issue</DialogTitle>
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
                    <p className="text-xs text-muted-foreground">{selectedStudentData.admissionNumber}</p>
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
                  Due date: {dueDate && new Date(dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueConfirm(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={confirmIssue} className="bg-navy hover:bg-navy/90 rounded-xl">
              Confirm Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <Dialog open={showReturnConfirm} onOpenChange={setShowReturnConfirm}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Book Return</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedBorrow && (
              <div className="space-y-3">
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <p className="font-medium text-sm">{selectedBorrow.bookTitle}</p>
                  <p className="text-xs text-muted-foreground">Borrowed by: {selectedBorrow.studentName}</p>
                </div>
                
                {new Date() > new Date(selectedBorrow.dueDate) && (
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-sm text-red-600 font-medium">Overdue</p>
                    <p className="text-xs text-red-500">
                      Late by {Math.ceil((new Date().getTime() - new Date(selectedBorrow.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                    <p className="text-xs text-red-500">
                      Penalty: TSH {(Math.ceil((new Date().getTime() - new Date(selectedBorrow.dueDate).getTime()) / (1000 * 60 * 60 * 24)) * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnConfirm(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={confirmReturn} className="bg-green hover:bg-green/90 rounded-xl">
              Confirm Return
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
            <h3 className="text-lg font-semibold text-foreground">Success!</h3>
            <p className="text-sm text-muted-foreground mt-2">{successMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)} className="w-full bg-navy hover:bg-navy/90 rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
