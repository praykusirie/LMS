import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  Hash,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AvailableItem {
  id: string;
  name: string;
  description: string;
  unit: string;
}

interface StockItemEntry {
  item_id: string;
  item_name: string;
  item_unit: string;
  quantity: number;
  current_stock: number;
  status: string;
}

interface StockData {
  id: string;
  stock_id: string;
  created_by: string;
  created_by_name: string;
  notes: string;
  created_at: string;
  items: StockItemEntry[];
}

export function StockView() {
  const { t } = useTranslation();
  const { stockId } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? null;
  const userLevel = (session?.user as any)?.level ?? null;
  const isAdmin = userRole === 'admin';
  const isNew = stockId === 'new' || !stockId;

  const [stock, setStock] = useState<StockData | null>(null);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [nextStockId, setNextStockId] = useState('');
  const [notes, setNotes] = useState('');
  const [stockLevel, setStockLevel] = useState('');
  const [items, setItems] = useState<StockItemEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAvailableItems();
    if (isNew) {
      fetchNextStockId();
      setIsLoading(false);
    } else {
      fetchStock();
    }
  }, [stockId]);

  const fetchAvailableItems = async () => {
    try {
      const { data } = await api.get('/items');
      setAvailableItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchNextStockId = async () => {
    try {
      const { data } = await api.get('/stocks/next-id');
      setNextStockId(data.nextId);
    } catch (error) {
      console.error('Error fetching next stock ID:', error);
    }
  };

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/stocks/${stockId}`);
      setStock(data);
      setNotes(data.notes || '');
      setItems(data.items.map((item: StockItemEntry & { item_id: string; item_name: string; item_unit: string }) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_unit: item.item_unit,
        quantity: item.quantity,
        current_stock: item.current_stock,
        status: item.status,
      })));
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      item_id: '',
      item_name: '',
      item_unit: '',
      quantity: 0,
      current_stock: 0,
      status: 'available',
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      
      if (field === 'item_id') {
        const selected = availableItems.find(a => a.id === value);
        return {
          ...item,
          item_id: value as string,
          item_name: selected?.name || '',
          item_unit: selected?.unit || '',
        };
      }
      
      if (field === 'quantity') {
        const qty = Number(value);
        return {
          ...item,
          quantity: qty,
          current_stock: isNew ? qty : item.current_stock,
        };
      }

      if (field === 'current_stock') {
        const cs = Number(value);
        let status = 'available';
        if (cs <= 0) status = 'out_of_stock';
        else if (cs <= 5) status = 'low';
        return { ...item, current_stock: cs, status };
      }
      
      return { ...item, [field]: value };
    }));
  };

  const handleSave = async () => {
    const validItems = items.filter(item => item.item_id && item.quantity > 0);
    if (validItems.length === 0) return;

    setIsSaving(true);
    try {
      if (isNew) {
        await api.post('/stocks', {
          created_by: session?.user?.email || '',
          created_by_name: session?.user?.name || '',
          notes,
          level: isAdmin ? (stockLevel || null) : userLevel,
          items: validItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
          })),
        });
        toast.success(t('stock.createSuccess'));
        navigate('/library-inventory/add-stock');
      } else {
        await api.put(`/stocks/${stockId}`, {
          notes,
          items: validItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            current_stock: item.current_stock,
          })),
        });
        toast.success(t('stock.updateSuccess'));
        await fetchStock();
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error(t('stock.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

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
        return <Badge variant="secondary">-</Badge>;
    }
  };

  // Items already added (to filter from dropdown)
  const usedItemIds = items.map(i => i.item_id).filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/library-inventory/add-stock')}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? t('stock.createNewStock') : `${t('stock.stockList')} ${stock?.stock_id}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isNew ? t('stock.createStockSubtitle') : t('stock.viewManageSubtitle')}
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={isSaving || items.filter(i => i.item_id && i.quantity > 0).length === 0}
          className="bg-navy hover:bg-navy/90"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isNew ? t('stock.createStock') : t('stock.saveChanges')}
        </Button>
      </div>

      {/* Stock Info */}
      <div className="rounded-[20px] bg-card p-6 shadow-card-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" /> {t('stock.stockId')}
            </Label>
            <Input 
              value={isNew ? nextStockId : (stock?.stock_id || '')} 
              disabled 
              className="rounded-xl font-mono bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {t('stock.createdDate')}
            </Label>
            <Input 
              value={isNew ? new Date().toLocaleDateString() : (stock ? new Date(stock.created_at).toLocaleDateString() : '')} 
              disabled 
              className="rounded-xl bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> {t('stock.createdBy')}
            </Label>
            <Input 
              value={isNew ? (session?.user?.name || session?.user?.email || '') : (stock?.created_by_name || stock?.created_by || '')} 
              disabled 
              className="rounded-xl bg-muted"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">{t('stock.notes')}</Label>
          <Textarea 
            id="notes"
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('stock.notesPlaceholder')}
            className="rounded-xl resize-none"
            rows={2}
          />
        </div>
        {isNew && (
          <div className="space-y-2 mt-4">
            <Label>{t('stock.level')}</Label>
            <Select
              value={isAdmin ? stockLevel : (userLevel || '')}
              onValueChange={(value) => setStockLevel(value)}
              disabled={!isAdmin}
            >
              <SelectTrigger className="rounded-xl max-w-xs">
                <SelectValue placeholder={isAdmin ? t('stock.selectLevel') : (userLevel ? `${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Level` : t('stock.noLevel'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">{t('stock.primaryLevel')}</SelectItem>
                <SelectItem value="secondary">{t('stock.secondaryLevel')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stock Items */}
      <div className="rounded-[20px] bg-card p-6 shadow-card-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('stock.stockItems')}</h2>
          <Button variant="outline" onClick={addItem} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('stock.addItem')}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t('stock.noItemsAdded')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">{t('stock.item')}</TableHead>
                <TableHead className="text-right">{t('stock.currentStock')}</TableHead>
                <TableHead className="text-right">{t('stock.quantity')}</TableHead>
                <TableHead>{t('stock.status')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select 
                      value={item.item_id} 
                      onValueChange={(value) => updateItem(index, 'item_id', value)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t('stock.selectAnItem')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems
                          .filter(a => !usedItemIds.includes(a.id) || a.id === item.item_id)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.unit})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={item.current_stock}
                      disabled={isNew}
                      onChange={(e) => updateItem(index, 'current_stock', e.target.value)}
                      className="rounded-xl text-right w-24 ml-auto"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="rounded-xl text-right w-24 ml-auto"
                    />
                  </TableCell>
                  <TableCell>
                    {item.item_id ? getStatusBadge(
                      isNew 
                        ? (item.quantity <= 0 ? 'out_of_stock' : item.quantity <= 5 ? 'low' : 'available')
                        : item.status
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
