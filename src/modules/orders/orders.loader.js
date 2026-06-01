import { SHEETS } from '@/config/sheets';

const clean = value => String(value ?? '').trim();

const num = value =>
  Number(clean(value).replace(/[^0-9.]/g, '')) || 0;

function normalizeStatus(value, printed) {
  const status = clean(value).toLowerCase();

  if (status.includes('delivered')) return 'Delivered';
  if (status.includes('printed')) return 'Printed';
  if (printed) return 'Printed';

  return status ? clean(value) : 'Pending';
}

function mapAllOrdersRow(row) {
  const orderId = clean(row[1]);

  if (!orderId) return null;

  const printedStatus = clean(row[5]);
  const floristName = clean(row[6]);
  const deliveryStatus = clean(row[7]);

  return {
    delivery_date: clean(row[0]),
    order_id: orderId,
    customer_name: clean(row[2]),
    product: clean(row[3]) || 'N/A',
    quantity: num(row[4]) || 1,

    print_status: printedStatus || 'Not Printed',
    printed: printedStatus.toUpperCase().includes('PRINTED'),

    florist: floristName || 'Not Ready',
    delivery_status: deliveryStatus || 'No Driver',

    address: clean(row[8]),
    order_date: clean(row[9]),

    florist_time: clean(row[10]),
    storage_time: clean(row[11]),
    time_to_delivery: clean(row[12]),
    dispatch_time: clean(row[13]),

    status: normalizeStatus(deliveryStatus || printedStatus, printedStatus),
    city: 'Dubai',
    payment: orderId.startsWith('800F') ? 'Shopify' : 'Manual',
  };
}
export async function loadOrders(fetchTab) {
  const config = SHEETS.operations;

  const rows = await fetchTab(config.id, config.tabs.orders);

  return rows
    .slice(1)
    .map(mapAllOrdersRow)
    .filter(Boolean);
}



// ViewTransition

// logistic
// flourist

