import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Loader2,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
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

interface StockReportItem {
  item_id: string;
  item_name: string;
  unit: string;
  total_quantity: string;
  total_current_stock: string;
  overall_status: string;
  stock_count: string;
}

const API_BASE = 'http://localhost:8080/api';

export function StockDetails() {
  const [reportItems, setReportItems] = useState<StockReportItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/stocks/report`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setReportItems(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = reportItems.filter(
    (item) => item.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Available
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low in Stock
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        );
      default:
        return <Badge variant="secondary">N/A</Badge>;
    }
  };

  // Summary stats
  const totalItems = filteredItems.length;
  const availableItems = filteredItems.filter(i => i.overall_status === 'available').length;
  const lowItems = filteredItems.filter(i => i.overall_status === 'low').length;
  const outItems = filteredItems.filter(i => i.overall_status === 'out_of_stock').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock Details</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregate report of library stock levels
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-[16px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[16px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-xl font-bold text-green-600">{availableItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[16px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low in Stock</p>
              <p className="text-xl font-bold text-amber-600">{lowItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[16px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">{outItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No stock data available</p>
            <p className="text-sm mt-1">Add items and create stocks to see reports here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Total Added</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Stock Entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.item_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-medium">{item.total_quantity}</TableCell>
                  <TableCell className="text-right font-medium">{item.total_current_stock}</TableCell>
                  <TableCell>{getStatusBadge(item.overall_status)}</TableCell>
                  <TableCell className="text-right">{item.stock_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
