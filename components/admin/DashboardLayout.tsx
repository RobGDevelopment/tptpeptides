'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { POList } from './POList';
import { InventoryPanel } from './InventoryPanel';
import { OrdersPanel } from './OrdersPanel';

export const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'po'>('po');

  return (
    <div className="min-h-screen bg-void text-primary p-8">
      <header className="mb-8 border-b border-white/[0.06] pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="admin-heading">TPT Peptides Back-Office</h1>
            <p className="admin-subheading">Inventory, orders, and purchase order management</p>
          </div>
          <Link href="/" className="terminal-link text-[10px]">
            Back to Storefront
          </Link>
        </div>
        <nav className="flex gap-6 mt-6">
          {(['po', 'inventory', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`admin-filter capitalize ${activeTab === tab ? 'admin-filter-active' : 'admin-filter-inactive'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activeTab === 'po' && <POList />}
        {activeTab === 'inventory' && <InventoryPanel />}
        {activeTab === 'orders' && <OrdersPanel />}
      </main>
    </div>
  );
};
