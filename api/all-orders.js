export default async function handler(req, res) {
  const SHOP = process.env.SHOPIFY_STORE;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const API_VERSION = '2025-07';

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

    const getNote = (order, name) =>
      order.note_attributes?.find(item => item.name === name)?.value || '';

    const orders = (data.orders || []).map(order => ({
      id: order.id,
      order_id: order.name,
      order_date: order.created_at,
      delivery_date: getNote(order, 'Delivery-Date'),
      delivery_time: getNote(order, 'Delivery-Time'),
      emirate: getNote(order, 'Emirate'),
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
    }));

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch Shopify orders',
      error: error.message,
    });
  }
}