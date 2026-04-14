import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
  getValue?: (row: T) => string | number | null | undefined;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  selectable = false,
  selectedRows,
  onSelectionChange,
  getRowId,
  onRowClick,
  pageSize: defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  emptyIcon: EmptyIcon,
  emptyTitle = 'No data found',
  emptyDescription = '',
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const selected = selectedRows ?? new Set<string>();

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const va = col.getValue ? col.getValue(a) : (a as any)[col.key];
      const vb = col.getValue ? col.getValue(b) : (b as any)[col.key];

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  }, [sortKey, sortDir]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const pageIds = paginatedData.map(getRowId);
    const allSelected = pageIds.every(id => selected.has(id));
    const next = new Set(selected);
    if (allSelected) {
      pageIds.forEach(id => next.delete(id));
    } else {
      pageIds.forEach(id => next.add(id));
    }
    onSelectionChange(next);
  }, [paginatedData, selected, onSelectionChange, getRowId]);

  const handleSelectRow = useCallback((id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }, [selected, onSelectionChange]);

  const handlePageSizeChange = useCallback((val: string) => {
    setPageSize(Number(val));
    setCurrentPage(1);
  }, []);

  const pageIds = paginatedData.map(getRowId);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const somePageSelected = pageIds.some(id => selected.has(id)) && !allPageSelected;

  // Generate page numbers for pagination display
  const getPageNumbers = () => {
    const pages: (number | 'dots')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('dots');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('dots');
      pages.push(totalPages);
    }
    return pages;
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-[20px] bg-card shadow-card overflow-hidden", className)}>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              {selectable && <Skeleton className="h-5 w-5 rounded" />}
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className={cn("rounded-[20px] bg-card shadow-card overflow-hidden", className)}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          {EmptyIcon && <EmptyIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />}
          <h3 className="text-lg font-medium text-foreground">{emptyTitle}</h3>
          {emptyDescription && (
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{emptyDescription}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[20px] bg-card shadow-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              {selectable && (
                <th className="px-4 py-4 w-[50px]">
                  <Checkbox
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) {
                        const input = el as unknown as HTMLButtonElement;
                        if (somePageSelected) input.dataset.state = 'indeterminate';
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    className="rounded-md"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => {
              const rowId = getRowId(row);
              const isSelected = selected.has(rowId);
              return (
                <tr
                  key={rowId}
                  className={cn(
                    "border-b border-border/40 last:border-0 transition-colors",
                    isSelected ? "bg-navy/5" : "hover:bg-secondary/50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-4 w-[50px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectRow(rowId)}
                        className="rounded-md"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-6 py-4 text-sm", col.className)}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : String((row as any)[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {selected.size > 0 && `${selected.size} selected · `}
            Showing {((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, sortedData.length)} of {sortedData.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((page, i) =>
              page === 'dots' ? (
                <span key={`dots-${i}`} className="px-1 text-muted-foreground text-sm">···</span>
              ) : (
                <Button
                  key={page}
                  variant={safePage === page ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg text-sm",
                    safePage === page && "bg-navy hover:bg-navy/90 text-white"
                  )}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Page size selector */}
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[100px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
