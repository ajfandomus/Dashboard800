export async function loadAllOrders() {
  const res = await fetch('http://localhost:3001/api/all-orders');

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch orders');
  }

  const data = await res.json();

  return data.orders || [];
}

export async function loadAllOrders() {
  const res = await fetch('/api/all-orders');

  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }

  const data = await res.json();
  return data.orders || [];
}