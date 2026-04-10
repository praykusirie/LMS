import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  BookPlus, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';

interface MasterItem {
  id: string;
  name: string;
  code?: string;
}

export function AddBook() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';

  // Master data
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [subjects, setSubjects] = useState<MasterItem[]>([]);
  const [classes, setClasses] = useState<MasterItem[]>([]);
  const [shelfLocations, setShelfLocations] = useState<MasterItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    subject_id: '',
    class_id: '',
    shelf_location_id: '',
    quantity: 1,
    publisher: '',
    published_year: '',
    description: '',
    level: '',
  });
  
  // Bulk import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLevel, setBulkLevel] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  
  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; updatedExisting: number; skipped: number; total: number; duplicatesMerged: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetchMasterData();
    if (!isAdmin && userLevel) {
      setFormData(prev => ({ ...prev, level: userLevel }));
      setBulkLevel(userLevel);
    }
  }, [isAdmin, userLevel]);

  const fetchMasterData = async () => {
    try {
      const [catRes, subRes, clsRes, slRes] = await Promise.all([
        api.get('/categories'),
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/shelf-locations'),
      ]);
      setCategories(catRes.data);
      setSubjects(subRes.data);
      setClasses(clsRes.data);
      setShelfLocations(slRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const getEffectiveLevel = () => {
    if (isAdmin) return formData.level || null;
    return userLevel;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!formData.title.trim()) {
      setErrorMessage('Title is required');
      return;
    }
    if (isAdmin && !formData.level) {
      setErrorMessage('Level is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/books', {
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        isbn: formData.isbn.trim() || null,
        category_id: formData.category_id || null,
        subject_id: formData.subject_id || null,
        class_id: formData.class_id || null,
        shelf_location_id: formData.shelf_location_id || null,
        quantity: formData.quantity || 1,
        publisher: formData.publisher.trim() || null,
        published_year: formData.published_year ? parseInt(formData.published_year) : null,
        description: formData.description.trim() || null,
        level: getEffectiveLevel(),
      });
      setSuccessMessage('Book added successfully!');
      toast.success('Book added successfully');
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category_id: '',
        subject_id: '',
        class_id: '',
        shelf_location_id: '',
        quantity: 1,
        publisher: '',
        published_year: '',
        description: '',
        level: isAdmin ? '' : (userLevel || ''),
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to add book');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setErrorMessage('Please upload a CSV or Excel (.xlsx/.xls) file');
      return;
    }
    
    setBulkFile(file);
    setImportResult(null);
    setErrorMessage('');
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setImportResult(null);
    
    try {
      const effectiveLevel = isAdmin ? bulkLevel : (userLevel || '');
      if (isAdmin && !effectiveLevel) {
        setErrorMessage('Level is required for bulk import');
        setIsSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append('file', bulkFile);
      if (effectiveLevel) fd.append('level', effectiveLevel);
      if (bulkCategoryId) fd.append('category_id', bulkCategoryId);

      const { data } = await api.post('/books/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setImportResult(data);
      if (data.imported > 0) {
        setSuccessMessage(`Successfully imported ${data.imported} of ${data.total} books!`);
        toast.success(`Imported ${data.imported} books`);
      }
      if (data.skipped > 0 && data.imported === 0) {
        setErrorMessage(`All ${data.skipped} rows were skipped. Check the file format.`);
      }
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to import books');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Title,Author,ISBN,Publisher,Published Date,Pages,Series,Language,Volume,Format,Category,Subject,Class,Quantity,Location,Summary\nThe Great Gatsby,F. Scott Fitzgerald,978-0743273565,Scribner,1925,180,,English,,,Fiction,English,Grade 10,15,A-01,A classic novel';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderLevelSelect = () => (
    <div className="space-y-2">
      <Label>Level <span className="text-red-500">*</span></Label>
      <Select
        value={isAdmin ? formData.level : (userLevel || '')}
        onValueChange={(value) => setFormData({ ...formData, level: value })}
        disabled={!isAdmin}
      >
        <SelectTrigger className="rounded-xl h-11">
          <SelectValue placeholder={isAdmin ? 'Select level' : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : 'No level')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">Primary Level</SelectItem>
          <SelectItem value="secondary">Secondary Level</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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
          onClick={() => navigate('/books')}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add individual book or bulk import via Excel/CSV
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
              Bulk Import (Excel/CSV)
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
                  <Label>Author</Label>
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Enter author name"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ISBN</Label>
                  <Input
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="Enter ISBN"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
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
                    value={formData.subject_id} 
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select 
                    value={formData.class_id} 
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
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
                    value={formData.shelf_location_id} 
                    onValueChange={(value) => setFormData({ ...formData, shelf_location_id: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select shelf location" />
                    </SelectTrigger>
                    <SelectContent>
                      {shelfLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.code ? `${loc.code} - ${loc.name}` : loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publisher</Label>
                  <Input
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Enter publisher"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Published Year</Label>
                  <Input
                    value={formData.published_year}
                    onChange={(e) => setFormData({ ...formData, published_year: e.target.value })}
                    placeholder="e.g., 2023"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              {renderLevelSelect()}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/books')}
                  className="rounded-xl h-11"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-navy hover:bg-navy/90 rounded-xl h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding...</> : 'Add Book'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="mt-0">
            <div className="space-y-6">
              {/* File Format Info */}
              <div className="p-4 bg-secondary/50 rounded-xl">
                <h3 className="font-medium text-sm mb-2">Supported File Formats</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload an Excel (.xlsx/.xls) or CSV file. The following columns are recognized (headers are case-insensitive):
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">Title *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Author</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">ISBN</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Publisher</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Published Date</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Pages</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Series</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Language</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Volume</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Format</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Genres / Category</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Quantity / Copy</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Summary</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">Image URL</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>

              {/* Level & Category for bulk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level <span className="text-red-500">*</span></Label>
                  <Select
                    value={isAdmin ? bulkLevel : (userLevel || '')}
                    onValueChange={(value) => setBulkLevel(value)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={isAdmin ? 'Select level' : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : 'No level')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary Level</SelectItem>
                      <SelectItem value="secondary">Secondary Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={bulkCategoryId}
                    onValueChange={(value) => setBulkCategoryId(value)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Upload */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-navy/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {bulkFile ? bulkFile.name : 'Click to upload Excel or CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, and .csv formats
                </p>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <h3 className="font-medium text-sm">Import Results</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-600">New: {importResult.imported}</span>
                    {importResult.updatedExisting > 0 && (
                      <span className="text-purple-600">Updated existing: {importResult.updatedExisting}</span>
                    )}
                    {importResult.duplicatesMerged > 0 && (
                      <span className="text-blue-600">File duplicates merged: {importResult.duplicatesMerged}</span>
                    )}
                    <span className="text-amber-600">Skipped: {importResult.skipped}</span>
                    <span className="text-muted-foreground">Total rows: {importResult.total}</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-[150px] overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bulkFile && (
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setBulkFile(null);
                      setImportResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded-xl h-11"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button 
                    onClick={handleBulkUpload}
                    className="bg-navy hover:bg-navy/90 rounded-xl h-11"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : 'Import Books'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
