import React, { useState, useMemo } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { Users, DollarSign, Star, TrendingUp } from 'lucide-react';

const columns = [
  { key: 'supplier_id', label: 'ID' },
  { key: 'name', label: 'Supplier' },
  { key: 'category', label: 'Category' },
  { key: 'rating', label: 'Rating' },
  { key: 'total_orders', label: 'Orders', format: 'number' },
  { key: 'total_spend', label: 'Total Spend', format: 'currency' },
  { key: 'on_time_rate', label: 'On-Time %', format: 'percent' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status', format: 'status' },
];

export default function Suppliers() {
  const [filters, setFilters] = useState({});
  const { data, allData, isLoading, refetch } = useSheetData('suppliers', { filters });

  const filterConfigs = useMemo(() => [
    { key: 'category', label: 'Category', type: 'select', options: [...new Set(allData.map(d => d.category).filter(Boolean))] },
    { key: 'rating', label: 'Rating', type: 'select', options: [...new Set(allData.map(d => d.rating).filter(Boolean))] },
    { key: 'status', label: 'Status', type: 'select', options: [...new Set(allData.map(d => d.status).filter(Boolean))] },
  ], [allData]);

  const kpis = useMemo(() => {
    return computeAggregations(data, [
      { name: 'count', field: 'name', operation: 'count' },
      { name: 'totalSpend', field: 'total_spend', operation: 'sum' },
      { name: 'avgOnTime', field: 'on_time_rate', operation: 'avg' },
      { name: 'totalOrders', field: 'total_orders', operation: 'sum' },
    ]);
  }, [data]);

  const spendByCategory = useMemo(() => {
    const cats = {};
    data.forEach(s => {
      cats[s.category] = (cats[s.category] || 0) + (Number(s.total_spend) || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" subtitle={`${data.length} suppliers`} onRefresh={refetch} isLoading={isLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Suppliers" value={kpis.count} icon={Users} accentClass="bg-primary" />
        <KPICard title="Total Spend" value={`$${Math.round(kpis.totalSpend).toLocaleString()}`} icon={DollarSign} accentClass="bg-accent" />
        <KPICard title="Avg On-Time Rate" value={`${kpis.avgOnTime.toFixed(1)}%`} icon={TrendingUp} accentClass="bg-chart-3" />
        <KPICard title="Total Orders" value={kpis.totalOrders.toLocaleString()} icon={Star} accentClass="bg-chart-4" />
      </div>

      <FilterBar filterConfigs={filterConfigs} filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DataTable columns={columns} data={data} pageSize={10} />
        </div>
        <ChartCard title="Spend by Category" type="pie" data={spendByCategory} dataKeys={[{ key: 'value', label: 'Spend' }]} xKey="name" height={350} />
      </div>
    </div>
  );
}