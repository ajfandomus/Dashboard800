import React, { useState, useMemo } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { FileText, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

const columns = [
  { key: 'invoice_id', label: 'Invoice #' },
  { key: 'date', label: 'Date' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'vendor', label: 'Vendor / Supplier' },
  { key: 'amount', label: 'Amount (AED)', format: 'currency' },
  { key: 'tax', label: 'VAT (5%)', format: 'currency' },
  { key: 'total', label: 'Total (AED)', format: 'currency' },
  { key: 'status', label: 'Status', format: 'status' },
  { key: 'category', label: 'Category' },
];

export default function Invoices() {
  const [filters, setFilters] = useState({});
  const { data, allData, isLoading, refetch } = useSheetData('invoices', { filters });

  const filterConfigs = useMemo(() => [
    { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending', 'Overdue', 'Draft'] },
    { key: 'vendor', label: 'Vendor', type: 'select', options: [...new Set(allData.map(d => d.vendor).filter(Boolean))] },
    { key: 'category', label: 'Category', type: 'select', options: [...new Set(allData.map(d => d.category).filter(Boolean))] },
  ], [allData]);

  const kpis = useMemo(() => {
    const total = data.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const paid = data.filter(d => d.status === 'Paid').reduce((s, d) => s + (Number(d.total) || 0), 0);
    const overdue = data.filter(d => d.status === 'Overdue').reduce((s, d) => s + (Number(d.total) || 0), 0);
    return { total, paid, overdue, count: data.length };
  }, [data]);

  const statusChart = useMemo(() => {
    const counts = {};
    data.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Supplier invoices & expense tracking" onRefresh={refetch} isLoading={isLoading} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Invoiced" value={`AED ${Math.round(kpis.total).toLocaleString()}`} icon={FileText} color="rose" />
        <KPICard title="Paid" value={`AED ${Math.round(kpis.paid).toLocaleString()}`} icon={CheckCircle} color="teal" />
        <KPICard title="Overdue" value={`AED ${Math.round(kpis.overdue).toLocaleString()}`} icon={AlertTriangle} color="red" />
        <KPICard title="Total Invoices" value={kpis.count} icon={DollarSign} color="amber" />
      </div>

      <FilterBar filterConfigs={filterConfigs} filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DataTable columns={columns} data={data} pageSize={12} />
        </div>
        <ChartCard title="Invoices by Status" type="pie" data={statusChart} dataKeys={[{ key: 'value', label: 'Count' }]} xKey="name" height={340} />
      </div>
    </div>
  );
}