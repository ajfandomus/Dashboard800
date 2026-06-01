import React, { useState, useMemo } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import SummaryBlock from '@/components/dashboard/SummaryBlock';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { Users, DollarSign, Heart, Star } from 'lucide-react';

const columns = [
  { key: 'customer_id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'total_orders', label: 'Orders', format: 'number' },
  { key: 'total_spent', label: 'Total Spent (AED)', format: 'currency' },
  { key: 'last_order', label: 'Last Order' },
  { key: 'loyalty_tier', label: 'Loyalty Tier', format: 'status' },
  { key: 'status', label: 'Status', format: 'status' },
];

export default function Customers() {
  const [filters, setFilters] = useState({});
  const { data, allData, isLoading, refetch } = useSheetData('customers', { filters });

  const filterConfigs = useMemo(() => [
    { key: 'city', label: 'City', type: 'select', options: [...new Set(allData.map(d => d.city).filter(Boolean))] },
    { key: 'loyalty_tier', label: 'Loyalty Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], [allData]);

  const kpis = useMemo(() => computeAggregations(data, [
    { name: 'count', field: 'name', operation: 'count' },
    { name: 'totalSpent', field: 'total_spent', operation: 'sum' },
    { name: 'avgSpent', field: 'total_spent', operation: 'avg' },
    { name: 'avgOrders', field: 'total_orders', operation: 'avg' },
  ]), [data]);

  const byCity = useMemo(() => {
    const cities = {};
    data.forEach(c => { cities[c.city] = (cities[c.city] || 0) + 1; });
    return Object.entries(cities).map(([name, value]) => ({ name, value }));
  }, [data]);

  const tierItems = useMemo(() => {
    const tiers = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    data.forEach(c => { if (tiers[c.loyalty_tier] !== undefined) tiers[c.loyalty_tier]++; });
    const dotColors = { Bronze: 'bg-amber-600', Silver: 'bg-slate-400', Gold: 'bg-yellow-500', Platinum: 'bg-purple-500' };
    return Object.entries(tiers).map(([label, value]) => ({ label, value, dot: dotColors[label] }));
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle={`${data.length} customers · AED ${Math.round(kpis.totalSpent).toLocaleString()} total lifetime value`} onRefresh={refetch} isLoading={isLoading} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Customers" value={kpis.count} icon={Users} color="rose" change={4.2} />
        <KPICard title="Lifetime Value" value={`AED ${Math.round(kpis.totalSpent).toLocaleString()}`} icon={DollarSign} color="amber" />
        <KPICard title="Avg Spend / Customer" value={`AED ${Math.round(kpis.avgSpent)}`} icon={Heart} color="pink" />
        <KPICard title="Avg Orders / Customer" value={kpis.avgOrders.toFixed(1)} icon={Star} color="purple" />
      </div>

      <FilterBar filterConfigs={filterConfigs} filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DataTable columns={columns} data={data} pageSize={10} />
        </div>
        <div className="space-y-4">
          <ChartCard title="Customers by City" type="pie" data={byCity} dataKeys={[{ key: 'value', label: 'Count' }]} xKey="name" height={220} />
          <SummaryBlock title="Loyalty Tiers" items={tierItems} />
        </div>
      </div>
    </div>
  );
}