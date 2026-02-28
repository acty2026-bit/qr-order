'use client';

import { useEffect, useState } from 'react';
import { formatYmdHm } from '@/lib/time';

type Order = {
  id: string;
  tableNo: number;
  createdAt: string;
  printStatus: 'success' | 'failed' | 'pending';
  printErrorMessage: string | null;
  orderItems: Array<{ id: string; nameSnapshot: string; qty: number }>;
};

type AdminData = {
  store: { name: string; storeKey: string };
  orders: Order[];
  activeCalls: Array<{ id: string; tableNo: number; createdAt: string }>;
  recentForReprint: Order[];
};

export default function AdminPage() {
  const [store, setStore] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState('');

  const load = async (storeKey: string) => {
    const res = await fetch(`/api/admin/orders?store=${encodeURIComponent(storeKey)}`);
    if (res.ok) {
      setData(await res.json());
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    setStore(storeKey);
    if (!storeKey) return;
    load(storeKey);

    const id = window.setInterval(() => load(storeKey), 3000);
    return () => clearInterval(id);
  }, []);

  const reprint = async (orderId: string) => {
    const res = await fetch('/api/admin/reprint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order_id: orderId })
    });
    if (res.ok) {
      setMessage('再印刷をキューしました。厨房画面で実行されます。');
      await load(store);
    }
  };

  return (
    <main>
      <h1>管理画面</h1>
      <p>
        店舗: <b>{store || '-'}</b>
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <a href={`/admin/menu?store=${encodeURIComponent(store)}`}>メニュー編集</a>
        <a href={`/admin/reports?store=${encodeURIComponent(store)}`}>売上レポート</a>
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2>未対応 呼び出し</h2>
        {(data?.activeCalls ?? []).map((call) => (
          <div key={call.id}>
            T{call.tableNo} / {formatYmdHm(call.createdAt)}
          </div>
        ))}
        {!(data?.activeCalls?.length ?? 0) && <div>なし</div>}
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2>直近10件 再印刷</h2>
        {(data?.recentForReprint ?? []).map((order) => (
          <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>
              {formatYmdHm(order.createdAt)} / T{order.tableNo} / {order.id.slice(0, 8)}
            </span>
            <button className="btn-ghost" onClick={() => reprint(order.id)}>
              再印刷
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>注文一覧（新しい順）</h2>
        {(data?.orders ?? []).map((order) => (
          <div
            key={order.id}
            style={{
              border: '1px solid #d9d4c8',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              background: order.printStatus === 'failed' ? '#ffe4e4' : 'transparent'
            }}
          >
            <div>
              {formatYmdHm(order.createdAt)} / T{order.tableNo} / print: {order.printStatus}
            </div>
            {order.printErrorMessage && <div style={{ color: '#9d1f1f' }}>{order.printErrorMessage}</div>}
            <div>
              {order.orderItems.map((item) => `${item.nameSnapshot} x ${item.qty}`).join(' / ')}
            </div>
          </div>
        ))}
      </section>

      {message && <p>{message}</p>}
    </main>
  );
}
