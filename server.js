import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
}));

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = '2025-07';

app.get('/api/all-orders', async (req, res) => {
  try {
    const url = `https://${SHOP}/admin/api/${API_VERSION}/orders.json?status=any&limit=250`;

    const shopifyRes = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const data = await shopifyRes.json();

    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json(data);
    }

  const orders = (data.orders || []).map(order => {
  const getNote = name =>
    order.note_attributes?.find(item => item.name === name)?.value || '';

  return {
    id: order.id,
    order_id: order.name,
    order_date: order.created_at,

    delivery_date: getNote('Delivery-Date'),
    delivery_time: getNote('Delivery-Time'),
    emirate: getNote('Emirate'),

    customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
    email: order.email || '',
    phone: order.phone || '',

    total: Number(order.total_price || 0),
    currency: order.currency || 'AED',
    financial_status: order.financial_status || '',
    fulfillment_status: order.fulfillment_status || 'Unfulfilled',

    product: order.line_items?.map(item => item.title).join(', ') || '',
    quantity: order.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,

    city: order.shipping_address?.city || '',
    province: order.shipping_address?.province || '',
    area: order.shipping_address?.address2 || '',

    address: [
      order.shipping_address?.address1,
      order.shipping_address?.address2,
      order.shipping_address?.city,
      order.shipping_address?.province,
      order.shipping_address?.country,
      order.shipping_address?.phone,
    ].filter(Boolean).join(', '),

    payment: order.payment_gateway_names?.join(', ') || '',
    tags: order.tags || '',
    notes: order.note || '',
    shipping_method: order.shipping_lines?.map(item => item.title).join(', ') || '',
  };
});

    res.json({ orders });

  } catch (error) {

    res.status(500).json({
      message: 'Failed to fetch Shopify orders',
      error: error.message,
    });

  }
});

app.listen(3001, () => {
  console.log(
    'API server running on http://localhost:3001'
  );
});