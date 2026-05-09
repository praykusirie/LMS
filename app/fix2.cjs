const fs = require('fs');
const path = require('path');

const addBookPath = path.join('src', 'pages', 'AddBook.tsx');
let addBookContent = fs.readFileSync(addBookPath, 'utf8');

// 1. Fix parseInt(e.target.value) || 1
addBookContent = addBookContent.replace(
  /quantity: parseInt\(e\.target\.value\) \|\| 1/g,
  "quantity: (e.target.value === '' ? '' : parseInt(e.target.value)) as any"
);

addBookContent = addBookContent.replace(
  /handleUpdateScannedBook\(book\.id, 'quantity', parseInt\(e\.target\.value\) \|\| 1\)/g,
  "handleUpdateScannedBook(book.id, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))"
);

// 2. Fix AddBook cart "subject" column.
const theadStr = `                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 w-32">Qty</th>`;
const newTheadStr = `                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3 w-32">Qty</th>`;
addBookContent = addBookContent.replace(theadStr, newTheadStr);

// Desktop td:
const tdStr = `                                </Select>
                              </td>
                              <td className="px-4 py-3 align-top pt-4">
                                <Input `;
const newTdStr = `                                </Select>
                              </td>
                              <td className="px-4 py-3 align-top pt-4">
                                {categories.find(c => c.id === book.category_id)?.name.toLowerCase().includes('text') ? (
                                  <Select
                                    value={book.subject_id || ''}
                                    onValueChange={(val) => handleUpdateScannedBook(book.id, 'subject_id', val)}
                                  >
                                    <SelectTrigger className="h-9 rounded-lg">
                                      <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {subjects.map((sub) => (
                                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-muted-foreground text-xs italic block mt-2">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top pt-4">
                                <Input `;
addBookContent = addBookContent.replace(tdStr, newTdStr);

// Mobile view:
const mobileCatStr = `                              <Select
                                value={book.category_id}
                                onValueChange={(val) => handleUpdateScannedBook(book.id, 'category_id', val)}
                              >
                                <SelectTrigger className="h-9 rounded-lg text-xs">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-xs text-muted-foreground block">Quantity</span>`;

const newMobileCatStr = `                              <Select
                                value={book.category_id}
                                onValueChange={(val) => handleUpdateScannedBook(book.id, 'category_id', val)}
                              >
                                <SelectTrigger className="h-9 rounded-lg text-xs">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {categories.find(c => c.id === book.category_id)?.name.toLowerCase().includes('text') && (
                              <div className="space-y-1.5 col-span-2 mt-2">
                                <span className="text-xs text-muted-foreground block mb-1">Subject</span>
                                <Select
                                  value={book.subject_id || ''}
                                  onValueChange={(val) => handleUpdateScannedBook(book.id, 'subject_id', val)}
                                >
                                  <SelectTrigger className="h-9 rounded-lg text-xs">
                                    <SelectValue placeholder="Subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subjects.map((sub) => (
                                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="space-y-1.5 mt-2">
                              <span className="text-xs text-muted-foreground block">Quantity</span>`;

if (addBookContent.includes(mobileCatStr)) {
  addBookContent = addBookContent.replace(mobileCatStr, newMobileCatStr);
}

fs.writeFileSync(addBookPath, addBookContent);
console.log('Updated AddBook.tsx');

// AdminDashboard.tsx
const adminPath = path.join('src', 'pages', 'dashboard', 'AdminDashboard.tsx');
let adminContent = fs.readFileSync(adminPath, 'utf8');

if (!adminContent.includes('fetchCategories')) {
  adminContent = adminContent.replace(
    "import { useTranslation } from 'react-i18next';",
    `import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import api from '@/lib/api';
import { BookOpen } from 'lucide-react';
import { StatsCard } from '@/components/ui-custom';`
  );

  adminContent = adminContent.replace(
    "const [activeTab, setActiveTab] = useState('library');",
    `const [activeTab, setActiveTab] = useState('library');
  const [categories, setCategories] = useState<{name: string, book_count: number}[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.filter((c: any) => c.book_count > 0));
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);`
  );

  adminContent = adminContent.replace(
    `<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">`,
    `{categories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.bookCategories', 'Book Categories')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat, idx) => (
              <StatsCard 
                key={cat.name} 
                title={cat.name} 
                value={cat.book_count.toString()} 
                icon={<BookOpen className="h-5 w-5" />} 
                color="bg-primary/10 text-primary" 
                delay={0.1 + idx * 0.05} 
              />
            ))}
          </div>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">`
  );
  
  fs.writeFileSync(adminPath, adminContent);
  console.log('Updated AdminDashboard.tsx');
}

// LibrarianDashboard.tsx
const librarianPath = path.join('src', 'pages', 'dashboard', 'LibrarianDashboard.tsx');
let librarianContent = fs.readFileSync(librarianPath, 'utf8');

if (!librarianContent.includes('setCategories')) {
  // Use BookOpen from already imported lucide-react, so no need to import it again
  librarianContent = librarianContent.replace(
    "const [trends, setTrends] = useState<ChartDataPoint[]>([]);",
    `const [trends, setTrends] = useState<ChartDataPoint[]>([]);
  const [categories, setCategories] = useState<{name: string, book_count: number}[]>([]);`
  );

  librarianContent = librarianContent.replace(
    "setTrends(res.data.trends || []);",
    `setTrends(res.data.trends || []);
        
        const catRes = await api.get('/categories');
        setCategories(catRes.data.filter((c: any) => parseInt(c.book_count) > 0));`
  );

  const libCardsStr = `{/* Category Cards */}
      {categories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.bookCategories', 'Book Categories')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
            {categories.map((cat, idx) => (
              <StatsCard 
                key={cat.name} 
                title={cat.name} 
                value={cat.book_count.toString()} 
                icon={<BookOpen className="h-5 w-5" />} 
                color="bg-primary/10 text-primary" 
                delay={0.1 + idx * 0.05} 
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}`;

  librarianContent = librarianContent.replace(`{/* Main Content Grid */}`, libCardsStr);
  fs.writeFileSync(librarianPath, librarianContent);
  console.log('Updated LibrarianDashboard.tsx');
}
