'use client';

import { useEffect, useState } from 'react';

type Row = { menuId: string; menuName: string; qty: number };

type RankingData = {
  ranking: {
    food: Row[];
    drink: Row[];
    other: Row[];
  };
};

export default function AdminRankingPage() {
  const [store, setStore] = useState('');
  const [data, setData] = useState<RankingData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    setStore(storeKey);
    if (!storeKey) return;

    fetch(`/api/admin/ranking?store=${encodeURIComponent(storeKey)}`)
      .then((r) => r.json())
      .then((json) => setData(json));
  }, []);

  const renderRows = (title: string, rows: Row[]) => (
    <section className="card" style={{ marginBottom: 12 }}>
      <h2>{title}</h2>
      {rows.map((row, idx) => (
        <div key={row.menuId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>
            {idx + 1}. {row.menuName}
          </span>
          <b>{row.qty}</b>
        </div>
      ))}
      {!rows.length && <div>データなし</div>}
    </section>
  );

  return (
    <main>
      <h1>注文数ランキング（今日/JST）</h1>
      <p>
        <a href={`/admin?store=${encodeURIComponent(store)}`}>管理へ戻る</a>
      </p>

      {renderRows('フード', data?.ranking.food ?? [])}
      {renderRows('ドリンク', data?.ranking.drink ?? [])}
      {renderRows('その他', data?.ranking.other ?? [])}
    </main>
  );
}
