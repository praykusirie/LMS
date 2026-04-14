import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Search, 
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import api from '@/lib/api';

interface StockReportItem {
  item_id: string;
  item_name: string;
  unit: string;
  total_quantity: string;
  total_current_stock: string;
  overall_status: string;
  stock_count: string;
}

export function StockDetails() {
  const { t } = useTranslation();
  const [reportItems, setReportItems] = useState<StockReportItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/stocks/report');
      setReportItems(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return reportItems.filter(
      (item) => item.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reportItems, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('stock.available')}
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t('stock.lowInStock')}
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('stock.outOfStock')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t('stock.na')}</Badge>;
    }
  };

  // Summary stats
  const totalItems = filteredItems.length;
  const availableItems = filteredItems.filter(i => i.overall_status === 'available').length;
  const lowItems = filteredItems.filter(i => i.overall_status === 'low').length;
  const outItems = filteredItems.filter(i => i.overall_status === 'out_of_stock').length;

  const columns: DataTableColumn<StockReportItem>[] = useMemo(() => [
    {
      key: 'item_name',
      header: t('stock.itemName'),
      sortable: true,
      getValue: (row) => row.item_name,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-medium text-foreground">{item.item_name}</span>
        </div>
      ),
    },
    {
      key: 'unit',
      header: t('items.unit'),
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-foreground">
          {item.unit}
        </span>
      ),
    },
    {
      key: 'total_quantity',
      header: t('stock.totalAdded'),
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right',
      getValue: (row) => Number(row.total_quantity) || 0,
      render: (item) => (
        <span className="font-medium">{item.total_quantity}</span>
      ),
    },
    {
      key: 'total_current_stock',
      header: t('stock.currentStock'),
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right',
      getValue: (row) => Number(row.total_current_stock) || 0,
      render: (item) => (
        <span className="font-medium">{item.total_current_stock}</span>
      ),
    },
    {
      key: 'overall_status',
      header: t('stock.status'),
      sortable: true,
      getValue: (row) => row.overall_status,
      render: (item) => getStatusBadge(item.overall_status),
    },
    {
      key: 'stock_count',
      header: t('stock.stockEntries'),
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right',
      getValue: (row) => Number(row.stock_count) || 0,
      render: (item) => (
        <span className="text-muted-foreground">{item.stock_count}</span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('stock.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stock.subtitle')}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stock.totalItems')}</p>
              <p className="text-xl font-bold">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stock.available')}</p>
              <p className="text-xl font-bold text-green-600">{availableItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stock.lowInStock')}</p>
              <p className="text-xl font-bold text-amber-600">{lowItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[20px] bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stock.outOfStock')}</p>
              <p className="text-xl font-bold text-red-600">{outItems}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('stock.searchItems')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DataTable
          data={filteredItems}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.item_id}
          emptyIcon={ClipboardList}
          emptyTitle={t('stock.noStockData')}
          emptyDescription={t('stock.noStockDataDesc')}
        />
      </motion.div>
    </div>
  );
}
