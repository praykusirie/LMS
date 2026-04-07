import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  BookPlus, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Book } from '@/types';

// Master data - in a real app, this would come from a context/store or API
const masterCategories = [
  { id: 'cat1', name: 'Fiction' },
  { id: 'cat2', name: 'Non-Fiction' },
  { id: 'cat3', name: 'Textbook' },
  { id: 'cat4', name: 'Reference' },
  { id: 'cat5', name: 'Biography' },
];

const masterSubjects = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH' },
  { id: 'sub2', name: 'English', code: 'ENG' },
  { id: 'sub3', name: 'Science', code: 'SCI' },
  { id: 'sub4', name: 'History', code: 'HIST' },
  { id: 'sub5', name: 'Geography', code: 'GEO' },
  { id: 'sub6', name: 'Physics', code: 'PHY' },
  { id: 'sub7', name: 'Chemistry', code: 'CHEM' },
  { id: 'sub8', name: 'Biology', code: 'BIO' },
];

const masterClasses = [
  { id: 'c1', name: 'Grade 9' },
  { id: 'c2', name: 'Grade 10' },
  { id: 'c3', name: 'Grade 11' },
  { id: 'c4', name: 'Grade 12' },
];

const masterShelfLocations = [
  { id: 'loc1', code: 'A-01', name: 'Fiction Section A' },
  { id: 'loc2', code: 'A-02', name: 'Fiction Section B' },
  { id: 'loc3', code: 'B-01', name: 'Science Section' },
  { id: 'loc4', code: 'B-02', name: 'Mathematics Section' },
  { id: 'loc5', code: 'C-01', name: 'Reference Section' },
  { id: 'loc6', code: 'D-01', name: 'Textbooks Section' },
];

interface AddBookProps {
  onBack: () => void;
  onAddBook: (book: Book) => void;
  onAddMultipleBooks: (books: Book[]) => void;
}

export function AddBook({ onBack, onAddBook, onAddMultipleBooks }: AddBookProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    isbn: '',
    category: '',
    subject: '',
    class: '',
    quantity: 1,
    shelfLocation: ''
  });
  
  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Partial<Book>[]>([]);
  const [csvError, setCsvError] = useState('');
  
  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!formData.title || !formData.author || !formData.isbn) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newBook: Book = {
      id: `b${Date.now()}`,
      title: formData.title || '',
      author: formData.author || '',
      isbn: formData.isbn || '',
      category: formData.category || '',
      subject: formData.subject || '',
      class: formData.class || '',
      quantity: formData.quantity || 1,
      available: formData.quantity || 1,
      shelfLocation: formData.shelfLocation || '',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    onAddBook(newBook);
    setSuccessMessage('Book added successfully!');
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      subject: '',
      class: '',
      quantity: 1,
      shelfLocation: ''
    });
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvError('');
    setCsvPreview([]);
    
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      return;
    }
    
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setCsvError('CSV file must have a header row and at least one data row');
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['title', 'author', 'isbn'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setCsvError(`Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }
    
    const books: Partial<Book>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;
      
      const book: Partial<Book> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'title':
            book.title = value;
            break;
          case 'author':
            book.author = value;
            break;
          case 'isbn':
            book.isbn = value;
            break;
          case 'category':
            book.category = value;
            break;
          case 'subject':
            book.subject = value;
            break;
          case 'class':
            book.class = value;
            break;
          case 'quantity':
            book.quantity = parseInt(value) || 1;
            break;
          case 'shelflocation':
            book.shelfLocation = value;
            break;
        }
      });
      
      if (book.title && book.author && book.isbn) {
        books.push(book);
      }
    }
    
    if (books.length === 0) {
      setCsvError('No valid book records found in CSV');
      return;
    }
    
    setCsvPreview(books);
  };

  const handleBulkUpload = async () => {
    if (csvPreview.length === 0) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newBooks: Book[] = csvPreview.map((data, index) => ({
      id: `b${Date.now()}_${index}`,
      title: data.title || '',
      author: data.author || '',
      isbn: data.isbn || '',
      category: data.category || '',
      subject: data.subject || '',
      class: data.class || '',
      quantity: data.quantity || 1,
      available: data.quantity || 1,
      shelfLocation: data.shelfLocation || '',
      isActive: true,
      createdAt: new Date().toISOString()
    }));
    
    onAddMultipleBooks(newBooks);
    setSuccessMessage(`Successfully imported ${newBooks.length} books!`);
    setCsvFile(null);
    setCsvPreview([]);
    setIsSubmitting(false);
  };

  const downloadTemplate = () => {
    const template = 'title,author,isbn,category,subject,class,quantity,shelfLocation\nThe Great Gatsby,F. Scott Fitzgerald,978-0743273565,Fiction,English,Grade 10,15,A-12-3';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Book</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add individual book or bulk import via CSV
          </p>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </motion.div>
      )}
      
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="h-5 w-5" />
          {errorMessage}
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[20px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-12">
            <TabsTrigger value="individual" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
              <BookPlus className="h-4 w-4 mr-2" />
              Add Individual Book
            </TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Import (CSV)
            </TabsTrigger>
          </TabsList>

          {/* Individual Book Tab */}
          <TabsContent value="individual" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter book title"
                    className="rounded-xl h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Enter author name"
                    className="rounded-xl h-11"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ISBN <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="Enter ISBN"
                    className="rounded-xl h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select 
                    value={formData.subject} 
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterSubjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>
                          {sub.name} ({sub.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select 
                    value={formData.class} 
                    onValueChange={(value) => setFormData({ ...formData, class: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    placeholder="Enter quantity"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shelf Location</Label>
                  <Select 
                    value={formData.shelfLocation} 
                    onValueChange={(value) => setFormData({ ...formData, shelfLocation: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select shelf location" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterShelfLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.code}>
                          {loc.code} - {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onBack}
                  className="rounded-xl h-11"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-navy hover:bg-navy/90 rounded-xl h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Book'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="mt-0">
            <div className="space-y-6">
              {/* CSV Structure Info */}
              <div className="p-4 bg-secondary/50 rounded-xl">
                <h3 className="font-medium text-sm mb-2">Required CSV Structure</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Your CSV file must include the following columns (headers are case-insensitive):
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">title *</span>
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">author *</span>
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">isbn *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">category</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">subject</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">class</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">quantity</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">shelfLocation</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* File Upload */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-navy/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {csvFile ? csvFile.name : 'Click to upload CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or drag and drop
                </p>
              </div>

              {/* CSV Error */}
              {csvError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {csvError}
                </div>
              )}

              {/* CSV Preview */}
              {csvPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">
                      Preview ({csvPreview.length} books)
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvPreview([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Title</th>
                          <th className="text-left px-4 py-2 font-medium">Author</th>
                          <th className="text-left px-4 py-2 font-medium">ISBN</th>
                          <th className="text-left px-4 py-2 font-medium">Category</th>
                          <th className="text-left px-4 py-2 font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 10).map((book, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{book.title}</td>
                            <td className="px-4 py-2">{book.author}</td>
                            <td className="px-4 py-2">{book.isbn}</td>
                            <td className="px-4 py-2 text-muted-foreground">{book.category || '-'}</td>
                            <td className="px-4 py-2">{book.quantity || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ... and {csvPreview.length - 10} more books
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCsvFile(null);
                        setCsvPreview([]);
                      }}
                      className="rounded-xl h-11"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkUpload}
                      className="bg-navy hover:bg-navy/90 rounded-xl h-11"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Importing...' : `Import ${csvPreview.length} Books`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
