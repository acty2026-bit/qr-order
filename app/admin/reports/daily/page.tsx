'use client';

import { useEffect, useState } from 'react';

type DailyResponse = {
  store: { storeKey: string; name: string };
  date: string;
  timezone: string;
  metrics: {
    sales: number;
    orders: number;
    customers: number;
    customerUnit: 'table' | 'orders';
    avgPerCustomer: number;
    avgPerOrder: number;
  };
  topProducts: Array<{ name: string; qty: number; sales: number }>;
  hourlySales: Array<{ hour: number; sales: number; orders: number }>;
};

function yesterdayJst() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export default function DailyReportPage() {
  const [store, setStore] = useState('');
  const [date, setDate] = useState(yesterdayJst());
  const [data, setData] = useState<DailyResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (storeKey: string, ymd: string) => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/reports/daily?store=${encodeURIComponent(storeKey)}&date=${encodeURIComponent(ymd)}`);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? '取得に失敗しました');
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    setStore(storeKey);
    if (storeKey) void load(storeKey, date);
  }, []);

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const q = `?store=${encodeURIComponent(store)}`;

  return (
    <main>
      <h1>日次レポート</h1>
      <p>
        <a href={`/admin/reports${q}`}>レポート入口へ戻る</a>
      </p>

      <section className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn-primary" onClick={() => void load(store, date)} disabled={!store || loading}>
          {loading ? '読込中...' : '再表示'}
        </button>
      </section>

      {error && <section className="card" style={{ color: '#9d1f1f' }}>{error}</section>}

      {data && (
        <>
          <section className="card" style={{ marginBottom: 12 }}>
            <h2>{data.date} (JST)</h2>
            <div>総売上: ¥{fmt(data.metrics.sales)}</div>
            <div>注文件数: {fmt(data.metrics.orders)}</div>
            <div>客数: {fmt(data.metrics.customers)} ({data.metrics.customerUnit === 'table' ? 'テーブル数' : '注文件数代替'})</div>
            <div>客単価: ¥{fmt(data.metrics.avgPerCustomer)}</div>
            <div>平均注文単価: ¥{fmt(data.metrics.avgPerOrder)}</div>
          </section>

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>商品別売上 TOP5</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">商品名</th>
                  <th align="right">数量</th>
                  <th align="right">売上</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td align="right">{fmt(row.qty)}</td>
                    <td align="right">¥{fmt(row.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>時間帯別売上（1時間）</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">時間</th>
                  <th align="right">注文件数</th>
                  <th align="right">売上</th>
                </tr>
              </thead>
              <tbody>
                {data.hourlySales.map((row) => (
                  <tr key={row.hour}>
                    <td>{String(row.hour).padStart(2, '0')}:00</td>
                    <td align="right">{fmt(row.orders)}</td>
                    <td align="right">¥{fmt(row.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
