'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase/firestore';
import type { Order } from '../../lib/types';

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Customer Orders</h2>
      {orders.length === 0 && <p className="text-gray-500">No orders found.</p>}
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white/5 p-6 rounded-xl border border-white/10 flex justify-between items-center"
        >
          <div>
            <h3 className="font-bold">Order #{order.id.slice(-6)}</h3>
            <p className="text-sm text-gray-400">
              User: {order.userId === 'guest' ? 'Guest' : order.userId.slice(-6)}
            </p>
            <p className="text-sm text-gray-400">
              {order.items?.length ?? 0} item(s)
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold">${order.total?.toFixed(2) ?? '0.00'}</p>
            <span className="text-green-400 font-mono text-sm">{order.status || 'pending'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
