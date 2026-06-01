import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import DataTable from '@/components/dashboard/DataTable';
import KPICard from '@/components/dashboard/KPICard';
import { useDashboardStore } from '@/lib/dashboardStore';

import {
    ShoppingBag,
    DollarSign,
    Truck,
    Search,
} from 'lucide-react';

import { loadAllOrders } from '@/modules/all-orders/allOrders.loader';

const columns = [
    { key: 'order_id', label: 'Order' },
    { key: 'order_date', label: 'Date' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'product', label: 'Products' },
    { key: 'quantity', label: 'Qty', format: 'number' },
    { key: 'financial_status', label: 'Payment' },
    { key: 'fulfillment_status', label: 'Fulfillment' },
    { key: 'city', label: 'City' },
    { key: 'total', label: 'Total', format: 'currency' },
      { key: 'delivery_date', label: 'Delivery Date' },
{ key: 'delivery_time', label: 'Delivery Time' },

];

export default function AllOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
const setPageData = useDashboardStore(s => s.setPageData);


    const fetchOrders = async () => {
        try {
            setLoading(true);

            const data = await loadAllOrders();

            setOrders(
                data.map(order => ({
                    ...order,
                    order_date: order.order_date
                        ? new Date(order.order_date).toLocaleString('en-AE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })
                        : '-',
                }))
            );
            setPageData('allOrders', data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        const q = search.toLowerCase();

        if (!q) return orders;

        return orders.filter(order =>
            [
                order.order_id,
                order.customer_name,
                order.product,
                order.city,
                order.financial_status,
            ]
                .join(' ')
                .toLowerCase()
                .includes(q)
        );
    }, [orders, search]);

    const totalRevenue = useMemo(() => {
        return filteredOrders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0
        );
    }, [filteredOrders]);

    const delivered = useMemo(() => {
        return filteredOrders.filter(order =>
            String(order.fulfillment_status)
                .toLowerCase()
                .includes('fulfilled')
        ).length;
    }, [filteredOrders]);

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border bg-gradient-to-br from-white via-blue-50/40 to-white p-6 shadow-sm">
                <PageHeader
                    title="All Shopify Orders"
                    subtitle="Live orders directly from Shopify"
                    onRefresh={fetchOrders}
                    isLoading={loading}
                />

                <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <KPICard
                        title="Orders"
                        value={filteredOrders.length}
                        icon={ShoppingBag}
                        color="blue"
                    />

                    <KPICard
                        title="Revenue"
                        value={`AED ${Math.round(totalRevenue).toLocaleString()}`}
                        icon={DollarSign}
                        color="green"
                    />

                    <KPICard
                        title="Fulfilled"
                        value={delivered}
                        icon={Truck}
                        color="purple"
                    />

                    <KPICard
                        title="Pending"
                        value={filteredOrders.length - delivered}
                        icon={ShoppingBag}
                        color="amber"
                    />
                </div>
            </div>

            <div className="rounded-3xl border bg-white p-4 shadow-sm">
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search orders, customer, products..."
                        className="h-11 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-blue-300"
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={filteredOrders}
                    pageSize={15}
                />
            </div>
        </div>
    );
}