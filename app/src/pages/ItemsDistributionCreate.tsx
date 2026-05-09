import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/components/ui-custom';

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

interface DraftItem {
  id: string;
  item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  available: number;
}

export function ItemsDistributionCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stockItems, setStockItems] = useState<StockReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [teacherId, setTeacherId] = useState('');
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      setIsLoading(true);
      const [teachersRes, stockRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/stocks/report'),
      ]);

      setTeachers(teachersRes.data || []);
      setStockItems((stockRes.data || []).filter((item: StockReportItem) => Number(item.total_current_stock) > 0));
    } catch (error) {
      console.error('Error fetching distribution references:', error);
      toast.error(t('itemsDistribution.failedToLoadTeachersItems'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStockItem = useMemo(
    () => stockItems.find((item) => item.item_id === selectedItemId),
    [stockItems, selectedItemId],
  );

  const itemTotalsInDraft = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of draftItems) {
      totals.set(row.item_id, (totals.get(row.item_id) ?? 0) + row.quantity);
    }
    return totals;
  }, [draftItems]);

  const addDraftItem = () => {
    if (!selectedStockItem) {
      toast.error(t('itemsDistribution.selectItemError'));
      return;
    }

    const qty = Number(selectedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(t('itemsDistribution.quantityError'));
      return;
    }

    const usedQty = itemTotalsInDraft.get(selectedStockItem.item_id) ?? 0;
    const available = Number(selectedStockItem.total_current_stock || 0);

    if (usedQty + qty > available) {
      toast.error(t('itemsDistribution.quantityExceedsStock', { available }));
      return;
    }

    setDraftItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item_id: selectedStockItem.item_id,
        item_name: selectedStockItem.item_name,
        unit: selectedStockItem.unit,
        quantity: qty,
        available,
      },
    ]);

    setSelectedItemId('');
    setSelectedQuantity('1');
  };

  const removeDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((row) => row.id !== id));
  };

  const updateDraftQuantity = (id: string, rawValue: string) => {
    let qty = rawValue === '' ? 1 : Number(rawValue);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;

    setDraftItems((prev) => {
      const current = prev.find((row) => row.id === id);
      if (!current) return prev;

      const sameItemTotalWithoutCurrent = prev
        .filter((row) => row.item_id === current.item_id && row.id !== id)
        .reduce((sum, row) => sum + row.quantity, 0);

      if (sameItemTotalWithoutCurrent + qty > current.available) {
        toast.error(t('itemsDistribution.quantityExceedsStock', { available: current.available }));
        return prev;
      }

      return prev.map((row) => (row.id === id ? { ...row, quantity: qty } : row));
    });
  };

  const totalLines = draftItems.length;
  const totalUnits = draftItems.reduce((sum, row) => sum + row.quantity, 0);

  const handleSave = async () => {
    if (!teacherId) {
      toast.error(t('itemsDistribution.selectTeacherError'));
      return;
    }

    if (draftItems.length === 0) {
      toast.error(t('itemsDistribution.addItemError'));
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/item-distributions/batch', {
        teacher_id: teacherId,
        distribution_date: distributionDate,
        items: draftItems.map((row) => ({ item_id: row.item_id, quantity: row.quantity })),
      });

      toast.success(t('itemsDistribution.itemsDistributedSuccess'));
      navigate('/books-items-management/items-distribution');
    } catch (error: any) {
      console.error('Error saving distribution:', error);
      toast.error(error?.message || t('itemsDistribution.failedToSave'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('itemsDistribution.newDistributionTitle')}
        description={t('itemsDistribution.newDistributionSubtitle')}
        action={{
          label: t('itemsDistribution.backToHistory'),
          icon: ArrowLeft,
          onClick: () => navigate('/books-items-management/items-distribution'),
        }}
      />

      <div className="rounded-lg bg-card p-6 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('itemsDistribution.teacher')}</Label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoading}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder={t('itemsDistribution.selectTeacher')} />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.teacher_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('itemsDistribution.distributionDate')}</Label>
            <Input
              type="date"
              value={distributionDate}
              onChange={(e) => setDistributionDate(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-card space-y-4">
        <h2 className="text-lg font-semibold">{t('itemsDistribution.addItems')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] md:grid-cols-[1fr_160px_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label>{t('itemsDistribution.item')}</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isLoading}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder={t('itemsDistribution.selectItemFromStock')} />
              </SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.item_id} value={item.item_id}>
                    {item.item_name} ({Number(item.total_current_stock)} {item.unit} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('itemsDistribution.quantity')}</Label>
            <Input
              type="number"
              min={1}
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>

          <Button onClick={addDraftItem} className="bg-primary hover:bg-primary/90 rounded-xl h-11" disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            {t('itemsDistribution.add')}
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('itemsDistribution.distributionItems')}</h2>
          <div className="text-sm text-muted-foreground">{totalLines} {t('itemsDistribution.lines')} • {totalUnits} {t('itemsDistribution.totalUnits')}</div>
        </div>

        {draftItems.length === 0 ? (
          <div className="border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t('itemsDistribution.noItemsAdded')}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 lg:hidden">
              {draftItems.map((row) => (
                <div key={row.id} className="p-3 border rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{row.item_name}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{row.unit}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDraftItem(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Available: {row.available}</span>
                    <Input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateDraftQuantity(row.id, e.target.value)}
                      className="h-8 w-24 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 pr-3">{t('itemsDistribution.item')}</th>
                    <th className="py-3 pr-3">{t('itemsDistribution.available')}</th>
                    <th className="py-3 pr-3">{t('itemsDistribution.quantity')}</th>
                    <th className="py-3 pr-3">{t('itemsDistribution.unit')}</th>
                    <th className="py-3 text-right">{t('itemsDistribution.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-medium">{row.item_name}</td>
                      <td className="py-3 pr-3">{row.available}</td>
                      <td className="py-3 pr-3">
                        <Input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => updateDraftQuantity(row.id, e.target.value)}
                          className="h-9 max-w-[120px]"
                        />
                      </td>
                      <td className="py-3 pr-3">{row.unit}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeDraftItem(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/books-items-management/items-distribution')}>
            {t('itemsDistribution.cancel')}
          </Button>
          {hasPermission('distribution:create') && (
          <Button className="bg-primary hover:bg-primary/90 rounded-xl" onClick={handleSave} disabled={isSubmitting || draftItems.length === 0}>
            <PackagePlus className="h-4 w-4 mr-2" />
            {isSubmitting ? t('itemsDistribution.saving') : t('itemsDistribution.saveDistribution')}
          </Button>
          )}
        </div>
      </div>
    </div>
  );
}



