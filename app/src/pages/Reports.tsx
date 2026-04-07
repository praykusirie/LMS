import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users, 
  BookOpen, 
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  Printer,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { dashboardStats, books, students, borrowRecords } from '@/data/mockData';

// Mock data for reports
const monthlyData = [
  { month: 'Jan', issues: 420, returns: 380 },
  { month: 'Feb', issues: 380, returns: 360 },
  { month: 'Mar', issues: 520, returns: 480 },
  { month: 'Apr', issues: 480, returns: 450 },
  { month: 'May', issues: 600, returns: 550 },
  { month: 'Jun', issues: 580, returns: 560 }
];

const categoryData = [
  { name: 'Fiction', value: 35, count: 4350 },
  { name: 'Science', value: 25, count: 3108 },
  { name: 'Mathematics', value: 20, count: 2486 },
  { name: 'English', value: 15, count: 1865 },
  { name: 'Other', value: 5, count: 621 }
];

const classWiseBorrowing = [
  { class: 'Grade 9', borrowed: 245, returned: 230, overdue: 15 },
  { class: 'Grade 10', borrowed: 320, returned: 290, overdue: 30 },
  { class: 'Grade 11', borrowed: 380, returned: 350, overdue: 30 },
  { class: 'Grade 12', borrowed: 259, returned: 245, overdue: 14 }
];

const topBorrowedBooks = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', borrowCount: 156, category: 'Fiction' },
  { title: 'Biology: Unity and Diversity', author: 'Cecie Starr', borrowCount: 142, category: 'Science' },
  { title: 'Calculus: Early Transcendentals', author: 'James Stewart', borrowCount: 128, category: 'Mathematics' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', borrowCount: 115, category: 'Fiction' },
  { title: 'Physics for Scientists', author: 'Raymond Serway', borrowCount: 98, category: 'Science' }
];

const topBorrowers = [
  { name: 'Emma Wilson', class: 'Grade 10', borrowCount: 24, returnRate: 100 },
  { name: 'James Miller', class: 'Grade 11', borrowCount: 22, returnRate: 95 },
  { name: 'Olivia Martinez', class: 'Grade 10', borrowCount: 20, returnRate: 100 },
  { name: 'Liam Johnson', class: 'Grade 12', borrowCount: 18, returnRate: 85 },
  { name: 'Sophia Chen', class: 'Grade 9', borrowCount: 16, returnRate: 100 }
];

const COLORS = ['#1E3A8A', '#22C55E', '#F59E0B', '#EF4444', '#6B7280'];

type ReportTab = 'overview' | 'borrowing' | 'inventory' | 'students' | 'overdue';

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateRange, setDateRange] = useState('this-month');
  const [classFilter, setClassFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Calculate statistics
  const totalBorrowed = borrowRecords.filter(r => r.status === 'borrowed').length;
  const totalOverdue = borrowRecords.filter(r => r.status === 'overdue').length;
  const totalReturned = borrowRecords.filter(r => r.status === 'returned').length;
  const totalPenalties = borrowRecords
    .filter(r => r.status === 'overdue')
    .reduce((sum, r) => sum + (r.lateDays || 0) * 1000, 0);

  // Filter borrow records based on search
  const filteredBorrowRecords = useMemo(() => {
    return borrowRecords.filter(record => {
      const matchesSearch = searchQuery === '' || 
        record.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery]);

  // Filter books for inventory
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = searchQuery === '' ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchQuery === '' ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === 'all' || student.class === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [searchQuery, classFilter]);

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    // Simulate export
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive library statistics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl h-10" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Select defaultValue="pdf" onValueChange={(v) => handleExport(v as 'pdf' | 'csv' | 'excel')}>
            <SelectTrigger className="rounded-xl h-10 w-[140px]">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Export PDF</SelectItem>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="excel">Export Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-navy" />
                </div>
                <span className="text-2xl font-bold">{dashboardStats.totalBooks.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Borrows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-navy-light flex items-center justify-center">
                  <Users className="h-5 w-5 text-navy" />
                </div>
                <span className="text-2xl font-bold">{dashboardStats.borrowedBooks}</span>
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-light flex items-center justify-center">
                  <Clock className="h-5 w-5 text-red" />
                </div>
                <span className="text-2xl font-bold">{dashboardStats.overdueBooks}</span>
              </div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -5%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-light flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber" />
                </div>
                <span className="text-2xl font-bold">TSH {totalPenalties.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Report Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-[20px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <TabsList className="grid grid-cols-5 rounded-xl h-11 w-full lg:w-auto">
              <TabsTrigger value="overview" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="borrowing" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                Borrowing
              </TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                Inventory
              </TabsTrigger>
              <TabsTrigger value="students" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                Students
              </TabsTrigger>
              <TabsTrigger value="overdue" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-navy data-[state=active]:text-white">
                Overdue
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="rounded-xl h-10 w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Activity Chart */}
              <div className="rounded-xl border border-border/60 p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">Monthly Borrowing Activity</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                        }}
                      />
                      <Legend />
                      <Bar dataKey="issues" name="Issues" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="returns" name="Returns" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="rounded-xl border border-border/60 p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">Book Categories Distribution</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value}%`, props.payload.name]}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {categoryData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="text-xs text-muted-foreground">{entry.name} ({entry.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Class-wise Borrowing */}
            <div className="rounded-xl border border-border/60 p-5">
              <h3 className="text-base font-semibold text-foreground mb-4">Class-wise Borrowing Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Class</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Borrowed</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Returned</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Overdue</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Return Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classWiseBorrowing.map((item) => (
                      <tr key={item.class} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-3 font-medium text-sm">{item.class}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.borrowed}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.returned}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-red-600 font-medium">{item.overdue}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full max-w-[100px]">
                              <div 
                                className="h-2 bg-navy rounded-full" 
                                style={{ width: `${(item.returned / item.borrowed) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((item.returned / item.borrowed) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Borrowed Books */}
              <div className="rounded-xl border border-border/60 p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">Most Borrowed Books</h3>
                <div className="space-y-3">
                  {topBorrowedBooks.map((book, index) => (
                    <div key={book.title} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-navy">{book.borrowCount}</p>
                        <p className="text-xs text-muted-foreground">borrows</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Borrowers */}
              <div className="rounded-xl border border-border/60 p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">Top Borrowers</h3>
                <div className="space-y-3">
                  {topBorrowers.map((student, index) => (
                    <div key={student.name} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                        <AvatarFallback className="text-xs">{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.class}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-navy">{student.borrowCount}</p>
                        <p className="text-xs text-muted-foreground">{student.returnRate}% return</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Borrowing History Tab */}
          <TabsContent value="borrowing" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by book or student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl h-10 pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="student">Sort by Student</SelectItem>
                  <SelectItem value="book">Sort by Book</SelectItem>
                  <SelectItem value="status">Sort by Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Book</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Borrow Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Return Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBorrowRecords.map((record) => (
                    <tr key={record.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{record.bookTitle}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{record.studentName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(record.borrowDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(record.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'returned' 
                            ? 'bg-green-100 text-green-700'
                            : record.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-navy-light text-navy'
                        }`}>
                          {record.status === 'returned' && <CheckCircle2 className="h-3 w-3" />}
                          {record.status === 'overdue' && <AlertCircle className="h-3 w-3" />}
                          {record.status === 'borrowed' && <BookOpen className="h-3 w-3" />}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl h-10 pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Fiction">Fiction</SelectItem>
                  <SelectItem value="Textbook">Textbook</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground">Total Titles</p>
                <p className="text-xl font-bold mt-1">{books.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground">Total Copies</p>
                <p className="text-xl font-bold mt-1">{books.reduce((sum, b) => sum + b.quantity, 0)}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50">
                <p className="text-xs text-green-700">Available</p>
                <p className="text-xl font-bold mt-1 text-green-700">{books.reduce((sum, b) => sum + b.available, 0)}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50">
                <p className="text-xs text-red-700">Borrowed Out</p>
                <p className="text-xl font-bold mt-1 text-red-700">
                  {books.reduce((sum, b) => sum + (b.quantity - b.available), 0)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Book</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Available</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{book.category}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{book.subject}</td>
                      <td className="px-4 py-3 text-sm font-medium">{book.quantity}</td>
                      <td className="px-4 py-3 text-sm font-medium">{book.available}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          book.available > 0 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {book.available > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl h-10 pl-10"
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="rounded-xl h-10 w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="Grade 9">Grade 9</SelectItem>
                  <SelectItem value="Grade 10">Grade 10</SelectItem>
                  <SelectItem value="Grade 11">Grade 11</SelectItem>
                  <SelectItem value="Grade 12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground">Total Students</p>
                <p className="text-xl font-bold mt-1">{students.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50">
                <p className="text-xs text-green-700">Active</p>
                <p className="text-xl font-bold mt-1 text-green-700">{students.filter(s => s.isActive).length}</p>
              </div>
              <div className="p-4 rounded-xl bg-navy-light">
                <p className="text-xs text-navy">With Borrows</p>
                <p className="text-xl font-bold mt-1 text-navy">
                  {new Set(borrowRecords.filter(r => r.status === 'borrowed').map(r => r.studentId)).size}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-red-50">
                <p className="text-xs text-red-700">With Overdue</p>
                <p className="text-xl font-bold mt-1 text-red-700">{students.filter(s => s.overdueCount > 0).length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Admission No.</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback className="text-xs">{student.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{student.admissionNumber}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{student.class}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          student.isActive 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {student.overdueCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
                            <AlertCircle className="h-4 w-4" />
                            {student.overdueCount}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-red-50">
                <p className="text-xs text-red-700">Total Overdue</p>
                <p className="text-xl font-bold mt-1 text-red-700">{totalOverdue}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50">
                <p className="text-xs text-amber-700">Total Penalties</p>
                <p className="text-xl font-bold mt-1 text-amber-700">TSH {totalPenalties.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground">Avg. Days Overdue</p>
                <p className="text-xl font-bold mt-1">
                  {borrowRecords.filter(r => r.status === 'overdue').length > 0
                    ? Math.round(
                        borrowRecords
                          .filter(r => r.status === 'overdue')
                          .reduce((sum, r) => sum + (r.lateDays || 0), 0) /
                        borrowRecords.filter(r => r.status === 'overdue').length
                      )
                    : 0} days
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Book</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Days Overdue</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords.filter(r => r.status === 'overdue').map((record) => {
                    const daysOverdue = record.lateDays || Math.ceil(
                      (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const penalty = daysOverdue * 1000;
                    return (
                      <tr key={record.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{record.bookTitle}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.studentName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(record.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {daysOverdue} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-red-600">TSH {penalty.toLocaleString()}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {borrowRecords.filter(r => r.status === 'overdue').length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No overdue books found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
