/**
 * sheetsEngine.js
 */

import { useQuery } from '@tanstack/react-query';
import { loadOrders } from '@/modules/orders/orders.loader';

const memoryCache = {};

function isStale(entry, refreshMinutes = 15) {
  if (!entry?.lastFetched) return true;
  return (Date.now() - entry.lastFetched) / 60000 > refreshMinutes;
}

function makeGvizUrl(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
}

export async function fetchTab(sheetId, tabName) {
  const res = await fetch(makeGvizUrl(sheetId, tabName));

  if (!res.ok) {
    throw new Error(`Tab "${tabName}" fetch failed: ${res.status}`);
  }

  const text = await res.text();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error(`Invalid Google Sheet response for "${tabName}"`);
  }

  const { table } = JSON.parse(text.slice(start, end + 1));

  if (!table?.rows) return [];

  return table.rows
    .map(row =>
      (row.c || []).map(cell => {
        if (!cell) return '';
        if (typeof cell === 'object') return cell.f ?? cell.v ?? '';
        return String(cell);
      })
    )
    .filter(row => row.some(value => String(value).trim() !== ''));
}

export function applyFilters(rows, filters) {
  if (!filters || !Object.keys(filters).length) return rows;

  return rows.filter(row =>
    Object.entries(filters).every(([key, val]) => {
      if (!val || val === '' || val === 'all') return true;

      return String(row[key] ?? '')
        .toLowerCase()
        .includes(String(val).toLowerCase());
    })
  );
}

export function computeAggregations(rows, aggregations) {
  const results = {};

  aggregations.forEach(agg => {
    const vals = rows.map(row => Number(row[agg.field]) || 0);

    switch (agg.operation) {
      case 'sum':
        results[agg.name] = vals.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        results[agg.name] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        break;
      case 'count':
        results[agg.name] = rows.length;
        break;
      case 'countDistinct':
        results[agg.name] = new Set(rows.map(row => row[agg.field])).size;
        break;
      default:
        results[agg.name] = 0;
    }
  });

  return results;
}

function splitProducts(productText) {
  return String(productText || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

function cleanProductName(text) {
  return String(text || '')
    .replace(/^\d+\s*x\s*/i, '')
    .trim();
}

function extractProductQty(text) {
  const match = String(text || '').match(/^(\d+)\s*x/i);
  return match ? Number(match[1]) : 1;
}

async function loadProductsFromOrders() {
  const orders = await loadOrders(fetchTab);
  const productMap = {};

  orders.forEach(order => {
    const products = splitProducts(order.product);

    products.forEach(productLine => {
      const name = cleanProductName(productLine);
      const qty = extractProductQty(productLine);

      if (!name || name === 'N/A') return;

      if (!productMap[name]) {
        productMap[name] = {
          product_id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name,
          category: guessCategory(name),
          occasion: guessOccasion(name),
          sales_count: 0,
          order_count: 0,
          revenue: 0,
          last_order_date: order.order_date || '',
          status: 'Active',
          trend: 'Normal',
        };
      }

      productMap[name].sales_count += qty;
      productMap[name].order_count += 1;
    });
  });

  const products = Object.values(productMap);

  const maxSales = Math.max(...products.map(p => p.sales_count), 0);

  return products
    .map(p => ({
      ...p,
      trend:
        p.sales_count === maxSales
          ? 'Best Selling'
          : p.sales_count <= 1
            ? 'Least Selling'
            : p.order_count >= 3
              ? 'Trending'
              : 'Normal',
    }))
    .sort((a, b) => b.sales_count - a.sales_count);
}

function guessCategory(name) {
  const n = String(name).toLowerCase();

  if (n.includes('rose')) return 'Roses';
  if (n.includes('tulip')) return 'Tulips';
  if (n.includes('orchid')) return 'Orchids';
  if (n.includes('hydrangea')) return 'Hydrangea';
  if (n.includes('peony')) return 'Peonies';
  if (n.includes('balloon')) return 'Add-ons';
  if (n.includes('chocolate') || n.includes('card') || n.includes('teddy')) return 'Gifts';

  return 'Bouquets';
}

function guessOccasion(name) {
  const n = String(name).toLowerCase();

  if (n.includes('birthday')) return 'Birthday';
  if (n.includes('love') || n.includes('valentine')) return 'Love';
  if (n.includes('get well')) return 'Get Well';
  if (n.includes('newborn') || n.includes('baby')) return 'New Baby';
  if (n.includes('premium')) return 'Premium';

  return 'General';
}

const LOADERS = {
  orders: () => loadOrders(fetchTab),
  products: () => loadProductsFromOrders(),
};

export const DEFAULT_SHEET_CONFIGS = [
  {
    name: 'Orders',
    sheet_key: 'orders',
    refresh_interval_minutes: 10,
    is_active: true,
  },
  {
    name: 'Products',
    sheet_key: 'products',
    refresh_interval_minutes: 10,
    is_active: true,
  },
];

export async function fetchSheetData(sheetConfig, forceRefresh = false) {
  const key = `sheet_${sheetConfig.sheet_key}`;
  const loader = LOADERS[sheetConfig.sheet_key];

  if (!loader) {
    throw new Error(`No loader for sheet key: "${sheetConfig.sheet_key}"`);
  }

  if (
    !forceRefresh &&
    memoryCache[key] &&
    !isStale(memoryCache[key], sheetConfig.refresh_interval_minutes)
  ) {
    return memoryCache[key].data;
  }

  const data = await loader();

  memoryCache[key] = {
    data,
    lastFetched: Date.now(),
  };

  return data;
}

export function useSheetData(sheetKey, options = {}) {
  const { filters = {}, enabled = true } = options;

  const config =
    DEFAULT_SHEET_CONFIGS.find(c => c.sheet_key === sheetKey) || {
      sheet_key: sheetKey,
      refresh_interval_minutes: 15,
    };

  const dataQuery = useQuery({
    queryKey: ['sheetData', sheetKey],
    queryFn: () => fetchSheetData(config),
    enabled,
    staleTime: (config.refresh_interval_minutes || 15) * 60 * 1000,
  });

  const allData = dataQuery.data || [];

  return {
    config,
    allData,
    data: applyFilters(allData, filters),
    isLoading: dataQuery.isLoading,
    error: dataQuery.error,
    refetch: dataQuery.refetch,
  };
}