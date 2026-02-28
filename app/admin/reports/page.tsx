'use client';

import { useEffect, useState } from 'react';

export default function ReportsIndexPage() {
  const [store, setStore] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStore(params.get('store') ?? '');
  }, []);

  const q = `?store=${encodeURIComponent(store)}`;

  return (
    <main>
      <h1>売上レポート</h1>
      <p>
        <a href={`/admin${q}`}>管理へ戻る</a>
      </p>
      <section className="card" style={{ display: 'grid', gap: 10 }}>
        <a href={`/admin/reports/daily${q}`}>日次レポート</a>
        <a href={`/admin/reports/range${q}`}>期間レポート</a>
        <a href={`/admin/reports/yearly${q}`}>年次レポート</a>
      </section>
    </main>
  );
}
