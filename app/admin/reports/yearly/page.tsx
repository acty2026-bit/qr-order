'use client';

import { useEffect, useState } from 'react';

type YearlyResponse = {
  store: { storeKey: string; name: string };
  year: number;
  timezone: string;
  annualSales: number;
  monthlySales: Array<{ month: string; sales: number }>;
  monthlyOrders: Array<{ month: string; orders: number }>;
  monthlyCustomers: Array<{ month: string; customers: number }>;
};

function currentYearJst() {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));
}

export default function YearlyReportPage() {
  const [store, setStore] = useState('');
  const [year, setYear] = useState(currentYearJst());
  const [data, setData] = useState<YearlyResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (storeKey: string, y: number) => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/reports/yearly?store=${encodeURIComponent(storeKey)}&year=${y}`);
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
    if (storeKey) void load(storeKey, year);
  }, []);

  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const q = `?store=${encodeURIComponent(store)}`;

  return (
    <main>
      <h1>年次レポート</h1>
      <p>
        <a href={`/admin/reports${q}`}>レポート入口へ戻る</a>
      </p>

      <section className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value || currentYearJst()))}
          min={2000}
          max={2100}
          style={{ maxWidth: 140 }}
        />
        <button className="btn-primary" onClick={() => void load(store, year)} disabled={!store || loading}>
          {loading ? '読込中...' : '再表示'}
        </button>
      </section>

      {error && <section className="card" style={{ color: '#9d1f1f' }}>{error}</section>}

      {data && (
        <>
          <section className="card" style={{ marginBottom: 12 }}>
            <h2>{data.year}年 (JST)</h2>
            <div>年間総売上: ¥{fmt(data.annualSales)}</div>
          </section>

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>月別売上推移</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">月</th>
                  <th align="right">売上</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlySales.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td align="right">¥{fmt(row.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ marginBottom: 12 }}>
            <h2>月別注文件数推移</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">月</th>
                  <th align="right">注文件数</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyOrders.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td align="right">{fmt(row.orders)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>月別客数推移</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">月</th>
                  <th align="right">客数</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyCustomers.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td align="right">{fmt(row.customers)}</td>
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
