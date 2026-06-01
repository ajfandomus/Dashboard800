import React, { useState, useMemo } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { Truck, Package, MapPin, Clock } from 'lucide-react';

const columns = [
  { key: 'tracking_id', label: 'Tracking ID' },
  { key: 'order_id', label: 'Order ID' },
  { key: 'ship_date', label: 'Date' },
  { key: 'delivery_slot', label: 'Time Slot' },
  { key: 'carrier', label: 'Driver / Carrier' },
  { key: 'city', label: 'City' },
  { key: 'area', label: 'Area' },
  { key: 'status', label: 'Status', format: 'status' },
  { key: 'cost', label: 'Cost (AED)', format: 'currency' },
];

export default function Delivery() {
  const [filters, setFilters] = useState({});
  const { data, allData, isLoading, refetch } = useSheetData('delivery', { filters });

  const filterConfigs = useMemo(() => [
    { key: 'status', label: 'Status', type: 'select', options: [...new Set(allData.map(d => d.status).filter(Boolean))] },
    { key: 'carrier', label: 'Carrier', type: 'select', options: [...new Set(allData.map(d => d.carrier).filter(Boolean))] },
    { key: 'city', label: 'City', type: 'select', options: [...new Set(allData.map(d => d.city).filter(Boolean))] },
    { key: 'delivery_slot', label: 'Time Slot', type: 'select', options: [...new Set(allData.map(d => d.delivery_slot).filter(Boolean))] },
  ], [allData]);

  const kpis = useMemo(() => {
    const agg = computeAggregations(data, [
      { name: 'count', field: 'tracking_id', operation: 'count' },
      { name: 'totalCost', field: 'cost', operation: 'sum' },
    ]);
    const delivered = data.filter(d => d.status === 'Delivered').length;
    const sameDay = data.filter(d => d.is_same_day).length;
    return { ...agg, delivered, deliveryRate: data.length ? (delivered / data.length * 100) : 0, sameDay };
  }, [data]);

  const byArea = useMemo(() => {
    const areas = {};
    data.forEach(d => { areas[d.area] = (areas[d.area] || 0) + 1; });
    return Object.entries(areas).map(([name, value]) => ({ name, value }));
  }, [data]);

  const byStatus = useMemo(() => {
    const s = {};
    data.forEach(d => { s[d.status] = (s[d.status] || 0) + 1; });
    return Object.entries(s).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery" subtitle="Track shipments, drivers & delivery zones" onRefresh={refetch} isLoading={isLoading} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Shipments" value={kpis.count} icon={Package} color="rose" />
        <KPICard title="Delivery Rate" value={`${kpis.deliveryRate.toFixed(0)}%`} icon={Truck} color="teal" change={3.2} />
        <KPICard title="Same-Day Orders" value={kpis.sameDay} icon={Clock} color="amber" />
        <KPICard title="Delivery Cost (AED)" value={`AED ${Math.round(kpis.totalCost).toLocaleString()}`} icon={MapPin} color="purple" />
      </div>

      <FilterBar filterConfigs={filterConfigs} filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Deliveries by Area (Dubai)" type="bar" data={byArea} dataKeys={[{ key: 'value', label: 'Deliveries' }]} xKey="name" />
        <ChartCard title="Shipments by Status" type="pie" data={byStatus} dataKeys={[{ key: 'value', label: 'Count' }]} xKey="name" />
      </div>

      <DataTable columns={columns} data={data} pageSize={12} />
    </div>
  );
}