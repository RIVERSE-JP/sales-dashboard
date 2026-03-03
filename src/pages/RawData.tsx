import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/i18n';
import { formatSales } from '@/utils/formatters';
import { filterByDateRange } from '@/utils/calculations';
import { PlatformBadge } from '@/components/PlatformIcon';
import { RawDataUploader } from '@/components/RawDataUploader';
import { staggerContainer, staggerItem } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const PAGE_SIZE = 50;

type SortKey = 'date' | 'title' | 'channel' | 'sales';
type SortDir = 'asc' | 'desc';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Card variant="glass"><CardContent className="p-6">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-40" /><Skeleton className="h-10 flex-1 min-w-[200px]" />
          <div className="flex gap-2"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-36" /></div>
        </div>
      </CardContent></Card>
      <div className="flex justify-between"><Skeleton className="h-5 w-64" /><Skeleton className="h-10 w-36" /></div>
      <Card variant="glass"><CardContent className="p-0">
        <Skeleton className="h-10 w-full" />
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        <div className="flex justify-between p-4"><Skeleton className="h-5 w-32" /><div className="flex gap-2"><Skeleton className="h-9 w-16" /><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-16" /></div></div>
      </CardContent></Card>
    </div>
  );
}

export function RawData() {
  const data = useDataLoader();
  const { language, currency, exchangeRate } = useAppState();

  const [platformFilter, setPlatformFilter] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [rawUploaderOpen, setRawUploaderOpen] = useState(false);

  // Extract unique platforms
  const platforms = useMemo(() => {
    const set = new Set<string>();
    data.dailySales.forEach(d => set.add(d.channel));
    return Array.from(set).sort();
  }, [data.dailySales]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = data.dailySales;

    // Date range filter
    if (startDate && endDate) {
      result = filterByDateRange(result, startDate, endDate);
    } else if (startDate) {
      result = result.filter(d => d.date >= startDate);
    } else if (endDate) {
      result = result.filter(d => d.date <= endDate);
    }

    // Platform filter
    if (platformFilter) {
      result = result.filter(d => d.channel === platformFilter);
    }

    // Title search
    if (titleSearch.trim()) {
      const query = titleSearch.trim().toLowerCase();
      result = result.filter(d =>
        d.titleKR.toLowerCase().includes(query) ||
        d.titleJP.toLowerCase().includes(query)
      );
    }

    return result;
  }, [data.dailySales, platformFilter, titleSearch, startDate, endDate]);

  // Sort
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'title':
          cmp = (language === 'ko' ? a.titleKR : a.titleJP).localeCompare(
            language === 'ko' ? b.titleKR : b.titleJP,
          );
          break;
        case 'channel':
          cmp = a.channel.localeCompare(b.channel);
          break;
        case 'sales':
          cmp = a.sales - b.sales;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sortKey, sortDir, language]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const pagedData = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, page]);

  // Summary
  const totalFilteredSales = useMemo(() => {
    return filteredData.reduce((s, d) => s + d.sales, 0);
  }, [filteredData]);

  // Sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  // CSV download
  const downloadCSV = () => {
    const header = [t(language, 'table.date'), t(language, 'table.title'), t(language, 'table.platform'), t(language, 'table.sales')];
    const rows = sortedData.map(d => [
      d.date,
      `"${(language === 'ko' ? d.titleKR : d.titleJP).replace(/"/g, '""')}"`,
      d.channel,
      String(d.sales),
    ]);

    const bom = '\uFEFF';
    const csv = bom + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rvjp_sales_data_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setPage(0);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  if (data.loading) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      {/* Page title */}
      <motion.h1
        variants={staggerItem}
        className="font-bold mb-8 text-primary text-[28px] tracking-tight"
      >
        {t(language, 'nav.rawData')}
      </motion.h1>

      {/* Filter controls row */}
      <motion.div variants={staggerItem} className="mb-6">
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-end gap-5">
              {/* Platform dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-text-secondary text-[13px] tracking-wide">
                  {t(language, 'filter.platform')}
                </label>
                <Select
                  value={platformFilter}
                  onChange={e => handleFilterChange(setPlatformFilter, e.target.value)}
                  className="min-w-[160px] h-10 rounded-xl font-medium"
                >
                  <option value="">{t(language, 'filter.allPlatforms')}</option>
                  {platforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>

              {/* Title search */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
                <label className="font-semibold text-text-secondary text-[13px] tracking-wide">
                  {t(language, 'filter.title')}
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <Input
                    type="text"
                    value={titleSearch}
                    onChange={e => handleFilterChange(setTitleSearch, e.target.value)}
                    placeholder={t(language, 'filter.search')}
                    className="w-full rounded-xl pl-10 pr-4 h-10 font-medium"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-text-secondary text-[13px] tracking-wide">
                  {t(language, 'filter.dateRange')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => handleFilterChange(setStartDate, e.target.value)}
                    className="rounded-xl h-10 font-medium"
                  />
                  <span className="text-text-muted text-base font-medium">~</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => handleFilterChange(setEndDate, e.target.value)}
                    className="rounded-xl h-10 font-medium"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary row + CSV download */}
      <motion.div
        variants={staggerItem}
        className="flex flex-wrap items-center justify-between mb-5 gap-4"
      >
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm font-medium">
            {t(language, 'table.showing')}{' '}
            <span className="text-foreground font-bold text-[15px]">
              {filteredData.length.toLocaleString()}
            </span>{' '}
            {t(language, 'table.of')}{' '}
            <span className="text-foreground font-bold text-[15px]">
              {data.dailySales.length.toLocaleString()}
            </span>
          </span>
          <span className="text-border text-lg">|</span>
          <span className="text-muted-foreground text-sm font-medium">
            {t(language, 'table.sales')}:{' '}
            <span className="text-foreground font-bold text-[15px]">
              {formatSales(totalFilteredSales, currency, exchangeRate, language)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setRawUploaderOpen(true)}
            className="gap-2.5 px-5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-[0_2px_8px_rgba(16,185,129,0.25)] hover:shadow-lg"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t(language, 'rawUpload.button')}
          </Button>
          <Button
            onClick={downloadCSV}
            className="gap-2.5 px-5 rounded-xl font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:shadow-lg"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t(language, 'table.download')}
          </Button>
        </div>
      </motion.div>

      {/* Data table */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardContent className="p-0">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-background border-b-2 border-border hover:bg-background">
                  <TableHead
                    className="py-3.5 px-5 font-semibold text-text-secondary cursor-pointer select-none hover:text-foreground transition-colors duration-150"
                    onClick={() => handleSort('date')}
                  >
                    {t(language, 'table.date')}{sortIcon('date')}
                  </TableHead>
                  <TableHead
                    className="py-3.5 px-5 font-semibold text-text-secondary cursor-pointer select-none hover:text-foreground transition-colors duration-150"
                    onClick={() => handleSort('title')}
                  >
                    {t(language, 'table.title')}{sortIcon('title')}
                  </TableHead>
                  <TableHead
                    className="py-3.5 px-5 font-semibold text-text-secondary cursor-pointer select-none hover:text-foreground transition-colors duration-150"
                    onClick={() => handleSort('channel')}
                  >
                    {t(language, 'table.platform')}{sortIcon('channel')}
                  </TableHead>
                  <TableHead
                    className="py-3.5 px-5 text-right font-semibold text-text-secondary cursor-pointer select-none hover:text-foreground transition-colors duration-150"
                    onClick={() => handleSort('sales')}
                  >
                    {t(language, 'table.sales')}{sortIcon('sales')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-text-muted text-[15px]">
                      {language === 'ko' ? '데이터가 없습니다' : 'データがありません'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedData.map((row, idx) => (
                    <TableRow
                      key={`${row.date}-${row.titleKR}-${row.channel}-${idx}`}
                      className={idx % 2 === 0 ? 'bg-card' : 'bg-background'}
                    >
                      <TableCell className="py-3 px-5 font-medium text-muted-foreground">
                        {row.date}
                      </TableCell>
                      <TableCell className="py-3 px-5 max-w-[300px] truncate font-medium text-foreground">
                        {language === 'ko' ? row.titleKR : row.titleJP}
                      </TableCell>
                      <TableCell className="py-3 px-5">
                        <PlatformBadge name={row.channel} compact />
                      </TableCell>
                      <TableCell className="py-3 px-5 text-right font-bold text-foreground text-[15px]">
                        {formatSales(row.sales, currency, exchangeRate, language)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-4 px-5 border-t border-border bg-background">
                <span className="text-muted-foreground text-[13px] font-medium">
                  {page * PAGE_SIZE + 1}~{Math.min((page + 1) * PAGE_SIZE, sortedData.length)}{' '}
                  / {sortedData.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-xl font-semibold text-[13px]"
                  >
                    {language === 'ko' ? '이전' : '前へ'}
                  </Button>
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card border border-border">
                    <span className="text-primary font-bold text-sm">
                      {page + 1}
                    </span>
                    <span className="text-text-muted text-[13px] font-medium">
                      {' / '}{totalPages}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-xl font-semibold text-[13px]"
                  >
                    {language === 'ko' ? '다음' : '次へ'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Raw data uploader modal */}
      <RawDataUploader
        open={rawUploaderOpen}
        onClose={() => setRawUploaderOpen(false)}
        existingData={{
          dailySales: data.dailySales,
          titleMaster: data.titleMaster,
        }}
      />
    </motion.div>
  );
}
