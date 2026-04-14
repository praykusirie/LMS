import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  PackagePlus, 
  Search, 
  Loader2,
  Eye,
  Calendar,
  Hash
} from 'lucide-react';
import { IdentityAvatar } from '@/components/shared/IdentityAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface Stock {
  id: string;
  stock_id: string;
  created_by: string;
  created_by_name: string;
  notes: string;
  created_at: string;
  total_items: string;
  total_quantity: string;
  out_of_stock_count: string;
  low_stock_count: string;
  available_count: string;
}

export function StockList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/stocks');
      setStocks(data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.stock_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusSummary = (stock: Stock) => {
    const out = parseInt(stock.out_of_stock_count) || 0;
    const low = parseInt(stock.low_stock_count) || 0;
    const available = parseInt(stock.available_count) || 0;
    return { out, low, available };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('stock.addStock')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('stock.manageStockSubtitle')}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/library-inventory/add-stock/new')}
          className="bg-navy hover:bg-navy/90"
        >
          <PackagePlus className="h-4 w-4 mr-2" />
          {t('stock.createNewStock')}
        </Button>
      </div>

      <div className="rounded-[20px] bg-card p-6 shadow-card-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('stock.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackagePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('stock.noStocksCreated')}</p>
            <p className="text-sm mt-1">{t('stock.noStocksDesc')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('stock.stockId')}</TableHead>
                <TableHead>{t('stock.createdDate')}</TableHead>
                <TableHead>{t('stock.createdBy')}</TableHead>
                <TableHead>{t('stock.items')}</TableHead>
                <TableHead>{t('stock.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStocks.map((stock) => {
                const status = getStatusSummary(stock);
                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{stock.stock_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(stock.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IdentityAvatar name={stock.created_by_name || stock.created_by} className="h-7 w-7" fallbackClassName="bg-navy text-white text-[10px]" />
                        <span className="text-sm">{stock.created_by_name || stock.created_by}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{stock.total_items}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        ({stock.total_quantity} {t('stock.totalQty')})
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {status.available > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 text-xs">
                            {status.available} {t('stock.ok')}
                          </Badge>
                        )}
                        {status.low > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-xs">
                            {status.low} {t('stock.low')}
                          </Badge>
                        )}
                        {status.out > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {status.out} {t('stock.out')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/library-inventory/add-stock/${stock.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('stock.details')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
