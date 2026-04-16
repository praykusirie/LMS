import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Package, Search, Send, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
}

interface StockReportItem {
  item_id: string;
  item_name: string;
  unit: string;
  total_current_stock: number;
}

interface ItemOption {
  id: string;
  name: string;
  unit: string;
}

interface DistributionRecord {
  id: string;
  teacher_id: string;
  item_id: string;
  quantity: number;
  distribution_date: string;
  issued_by_name?: string | null;
  teacher_name: string;
  teacher_code: string;
  item_name: string;
  item_unit: string;
}

export function ItemsDistribution() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allItems, setAllItems] = useState<ItemOption[]>([]);
  const [records, setRecords] = useState<DistributionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [teacherFilter, itemFilter, dateFrom, dateTo]);

  const buildFilterParams = () => {
    const params: Record<string, string> = {};
    if (teacherFilter !== 'all') params.teacher_id = teacherFilter;
    if (itemFilter !== 'all') params.item_id = itemFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  };

  const fetchReferenceData = async () => {
    try {
      setIsLoading(true);
      const [teachersRes, itemsRes, stockRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/items'),
        api.get('/stocks/report'),
      ]);

      setTeachers(teachersRes.data || []);
      setAllItems((itemsRes.data || []).map((item: any) => ({ id: item.id, name: item.name, unit: item.unit || 'pcs' })));
      const inStock = (stockRes.data || []).filter((item: StockReportItem) => Number(item.total_current_stock) > 0);
      if (inStock.length === 0) {
        toast.info(t('itemsDistribution.noItemsInStock'));
      }
    } catch (error) {
      console.error('Error fetching items distribution data:', error);
      toast.error(t('itemsDistribution.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/item-distributions', { params: buildFilterParams() });
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching distribution history:', error);
      toast.error(t('itemsDistribution.failedToLoadHistory'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      record.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teacher_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const clearFilters = () => {
    setTeacherFilter('all');
    setItemFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportReport = async () => {
    try {
      const response = await api.get('/item-distributions/report', {
        params: buildFilterParams(),
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `item-distribution-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting distribution report:', error);
      toast.error(t('itemsDistribution.failedToExport'));
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast.error(t('itemsDistribution.failedToPrint'));
      return;
    }

    const rows = filteredRecords.map((record) => `
      <tr>
        <td>${record.teacher_name}</td>
        <td>${record.teacher_code}</td>
        <td>${record.item_name}</td>
        <td>${record.item_unit}</td>
        <td>${Number(record.quantity).toLocaleString()}</td>
        <td>${new Date(record.distribution_date).toLocaleDateString()}</td>
        <td>${record.issued_by_name || '-'}</td>
      </tr>
    `).join('');

    const activeFilters = [
      teacherFilter !== 'all' ? `Teacher: ${teachers.find((t) => t.id === teacherFilter)?.name || teacherFilter}` : null,
      itemFilter !== 'all' ? `Item: ${allItems.find((i) => i.id === itemFilter)?.name || itemFilter}` : null,
      dateFrom ? `From: ${dateFrom}` : null,
      dateTo ? `To: ${dateTo}` : null,
    ].filter(Boolean).join(' | ');

    printWindow.document.write(`
      <html>
        <head>
          <title>Items Distribution Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px 0; }
            p { margin: 0 0 16px 0; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Items Distribution Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Filters: ${activeFilters || 'None'}</p>
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Teacher Code</th>
                <th>Item</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Distribution Date</th>
                <th>Issued By</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="7">No records found</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const columns: DataTableColumn<DistributionRecord>[] = useMemo(() => [
    {
      key: 'teacher_name',
      header: t('itemsDistribution.teacher'),
      sortable: true,
      getValue: (row) => row.teacher_name,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.teacher_name}</p>
          <p className="text-xs text-muted-foreground">{row.teacher_code}</p>
        </div>
      ),
    },
    {
      key: 'item_name',
      header: t('itemsDistribution.item'),
      sortable: true,
      getValue: (row) => row.item_name,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.item_name}</p>
          <p className="text-xs text-muted-foreground">{t('itemsDistribution.unit')}: {row.item_unit}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: t('itemsDistribution.quantity'),
      sortable: true,
      render: (row) => <span className="font-medium">{Number(row.quantity).toLocaleString()}</span>,
    },
    {
      key: 'distribution_date',
      header: t('itemsDistribution.distributedOn'),
      sortable: true,
      getValue: (row) => row.distribution_date,
      render: (row) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.distribution_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'issued_by_name',
      header: t('itemsDistribution.issuedBy'),
      sortable: true,
      getValue: (row) => row.issued_by_name || '',
      render: (row) => <span>{row.issued_by_name || '-'}</span>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('itemsDistribution.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('itemsDistribution.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrintReport} className="rounded-xl h-11">
            <Printer className="h-4 w-4 mr-2" />
            {t('itemsDistribution.printReport')}
          </Button>
          <Button variant="outline" onClick={handleExportReport} className="rounded-xl h-11">
            <Download className="h-4 w-4 mr-2" />
            {t('itemsDistribution.exportCsv')}
          </Button>
          {hasPermission('items:create') && (
          <Button onClick={() => navigate('/books-items-management/items-distribution/new')} className="bg-navy hover:bg-navy/90 rounded-xl h-11">
            <Send className="h-4 w-4 mr-2" />
            {t('itemsDistribution.distributeItem')}
          </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('itemsDistribution.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl h-11"
            />
          </div>

          <div className="min-w-[220px]">
            <Label className="mb-2 block">{t('itemsDistribution.teacher')}</Label>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder={t('itemsDistribution.allTeachers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('itemsDistribution.allTeachers')}</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px]">
            <Label className="mb-2 block">{t('itemsDistribution.item')}</Label>
            <Select value={itemFilter} onValueChange={setItemFilter}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder={t('itemsDistribution.allItems')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('itemsDistribution.allItems')}</SelectItem>
                {allItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">{t('itemsDistribution.from')}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl h-11" />
          </div>

          <div>
            <Label className="mb-2 block">{t('itemsDistribution.to')}</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl h-11" />
          </div>

          <Button variant="outline" onClick={clearFilters} className="rounded-xl h-11">
            {t('itemsDistribution.clearFilters')}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <DataTable
          data={filteredRecords}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          emptyIcon={Package}
          emptyTitle={t('itemsDistribution.noDistributions')}
          emptyDescription={t('itemsDistribution.noDistributionsDesc')}
        />
      </motion.div>
    </div>
  );
}
