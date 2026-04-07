import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  UserPlus, 
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
import type { Student } from '@/types';

interface AddStudentProps {
  onBack: () => void;
  onAddStudent: (student: Student) => void;
  onAddMultipleStudents: (students: Student[]) => void;
}

export function AddStudent({ onBack, onAddStudent, onAddMultipleStudents }: AddStudentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    admissionNumber: '',
    class: '',
    gender: 'male',
    email: '',
    phone: ''
  });
  
  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Partial<Student>[]>([]);
  const [csvError, setCsvError] = useState('');
  
  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const generateAvatar = (name: string, gender: string) => {
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&gender=${gender}`;
  };

  // Generate unique student ID in format LMS202600001
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
    return `LMS${year}${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!formData.name || !formData.class) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const studentId = generateStudentId();
    
    const newStudent: Student = {
      id: `s${Date.now()}`,
      name: formData.name || '',
      admissionNumber: studentId, // Auto-generated LMS ID
      class: formData.class || '',
      gender: formData.gender as 'male' | 'female' | 'other',
      avatar: generateAvatar(formData.name || '', formData.gender || 'male'),
      email: formData.email,
      phone: formData.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      borrowHistory: [],
      currentBorrows: [],
      overdueCount: 0
    };
    
    onAddStudent(newStudent);
    setSuccessMessage(`Student registered successfully! Student ID: ${studentId}`);
    setFormData({
      name: '',
      admissionNumber: '',
      class: '',
      gender: 'male',
      email: '',
      phone: ''
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
    const requiredHeaders = ['name', 'admissionnumber', 'class', 'gender'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setCsvError(`Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }
    
    const students: Partial<Student>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;
      
      const student: Partial<Student> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'name':
            student.name = value;
            break;
          case 'admissionnumber':
            student.admissionNumber = value;
            break;
          case 'class':
            student.class = value;
            break;
          case 'gender':
            student.gender = value.toLowerCase() as 'male' | 'female' | 'other';
            break;
          case 'email':
            student.email = value;
            break;
          case 'phone':
            student.phone = value;
            break;
        }
      });
      
      if (student.name && student.admissionNumber && student.class) {
        students.push(student);
      }
    }
    
    if (students.length === 0) {
      setCsvError('No valid student records found in CSV');
      return;
    }
    
    setCsvPreview(students);
  };

  const handleBulkUpload = async () => {
    if (csvPreview.length === 0) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newStudents: Student[] = csvPreview.map((data, index) => ({
      id: `s${Date.now()}_${index}`,
      name: data.name || '',
      admissionNumber: data.admissionNumber || '',
      class: data.class || '',
      gender: (data.gender as 'male' | 'female' | 'other') || 'male',
      avatar: generateAvatar(data.name || '', data.gender || 'male'),
      email: data.email,
      phone: data.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      borrowHistory: [],
      currentBorrows: [],
      overdueCount: 0
    }));
    
    onAddMultipleStudents(newStudents);
    setSuccessMessage(`Successfully imported ${newStudents.length} students!`);
    setCsvFile(null);
    setCsvPreview([]);
    setIsSubmitting(false);
  };

  const downloadTemplate = () => {
    const template = 'name,admissionNumber,class,gender,email,phone\nJohn Doe,ADM2024001,Grade 10,male,john@example.com,+1234567890';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
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
          <h1 className="text-2xl font-bold text-foreground">Register Student</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add individual student or bulk import via CSV
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
              <UserPlus className="h-4 w-4 mr-2" />
              Individual Registration
            </TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Import (CSV)
            </TabsTrigger>
          </TabsList>

          {/* Individual Registration Tab */}
          <TabsContent value="individual" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-navy-light rounded-xl mb-4">
                <p className="text-sm text-navy">
                  <strong>Note:</strong> A unique Student ID (e.g., LMS202600001) will be automatically generated upon registration.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter student name"
                    className="rounded-xl h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.class} 
                    onValueChange={(value) => setFormData({ ...formData, class: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="rounded-xl h-11"
                  />
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
                  {isSubmitting ? 'Registering...' : 'Register Student'}
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
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">name *</span>
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">admissionNumber *</span>
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">class *</span>
                  <span className="px-2 py-1 bg-navy text-white text-xs rounded-lg">gender *</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">email</span>
                  <span className="px-2 py-1 bg-secondary text-foreground text-xs rounded-lg">phone</span>
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
                      Preview ({csvPreview.length} students)
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
                          <th className="text-left px-4 py-2 font-medium">Name</th>
                          <th className="text-left px-4 py-2 font-medium">Admission No.</th>
                          <th className="text-left px-4 py-2 font-medium">Class</th>
                          <th className="text-left px-4 py-2 font-medium">Gender</th>
                          <th className="text-left px-4 py-2 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 10).map((student, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{student.name}</td>
                            <td className="px-4 py-2">{student.admissionNumber}</td>
                            <td className="px-4 py-2">{student.class}</td>
                            <td className="px-4 py-2 capitalize">{student.gender}</td>
                            <td className="px-4 py-2 text-muted-foreground">{student.email || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ... and {csvPreview.length - 10} more students
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
                      {isSubmitting ? 'Importing...' : `Import ${csvPreview.length} Students`}
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
