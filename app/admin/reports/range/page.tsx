'use client';

import { useEffect, useState } from 'react';

type RangeResponse = {
  store: { storeKey: string; name: string };
  start: string;
  end: string;
  timezone: string;
  metrics: {
    sales: number;
    orders: number;
    customers: number;
    customerUnit: 'table' | 'orders';
    avgPerCustomer: number;
    avgPerOrder: number;
  };
  dailyTrend: Array<{ date: string; sales: number; orders: number; customers: number }>;
  topProducts: Array<{ name: string; qty: number; sales: number }>;
  leastProducts: Array<{ name: string; qty: number; sales: number }>;
  hourlySales: Array<{ hour: number; sales: number; orders: number }>;
};

function ymdFromOffset(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export default function RangeReportPage() {
  const [store, setStore] = useState('');
  const [start, setStart] = useState(ymdFromOffset(-7));
  const [end, setEnd] = useState(ymdFromOffset(-1));
  const [data, setData] = useState<RangeResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (storeKey: string, startYmd: string, endYmd: string) => {
    setLoading(true);
    setError('');
    const res = await fetch(
      `/api/reports/range?store=${encodeURIComponent(storeKey)}&start=${encodeURIComponent(startYmd)}&end=${encodeURIComponent(endYmd)}`
    );
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
    if (storeKey) void load(storeKey, start, end);
  }, []);

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const q = `?store=${encodeURIComponent(store)}`;

  return (
    <main>
      <h1>期間レポート</h1>
      <p>
        <a href={`/admin/reports${q}`}>レポート入口へ戻る</a>
      </p>

      <section className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ maxWidth: 180 }} />
        <span>〜</span>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn-primary" onClick={() => void load(store, start, end)} disabled={!store || loading}>
          {loading ? '読込中...' : '再表示'}
        </button>
      </section>

      {error && <section className="card" style={{ color: '#9d1f1f' }}>{error}</section>}

      {data && (
        <>
          <section className="card" style={{ marginBottom: 12 }}>
            <h2>
              {data.start} 〜 {data.end} (JST)
            </h2>
            <div>総売上: ¥{fmt(data.metrics.sales)}</div>
            <div>注文件数: {fmt(data.metrics.orders)}</div>
            <div>客数: {fmt(data.metrics.customers)} ({data.metrics.customerUnit === 'table' ? 'テーブル数' : '注文件数代替'})</div>
            <div>客単価: ¥{fmt(data.metrics.avgPerCustomer)}</div>
            <div>平均注文単価: ¥{fmt(data.metrics.avgPerOrder)}</div>
          </section>

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>日別売上推移</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">日付</th>
                  <th align="right">注文</th>
                  <th align="right">客数</th>
                  <th align="right">売上</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrend.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td align="right">{fmt(row.orders)}</td>
                    <td align="right">{fmt(row.customers)}</td>
                    <td align="right">¥{fmt(row.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>商品別売上 TOP10</h2>
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

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>売れていない/少ない商品</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">商品名</th>
                  <th align="right">数量</th>
                  <th align="right">売上</th>
                </tr>
              </thead>
              <tbody>
                {data.leastProducts.map((row) => (
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
            <h2>時間帯別売上（合算）</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">時間</th>
                  <th align="right">注文</th>
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
