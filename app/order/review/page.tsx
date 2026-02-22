'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CartRow = {
  menu: { id: string; name: string; price: number };
  qty: number;
};

export default function OrderReviewPage() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [tableNo, setTableNo] = useState(0);

  const [taxRate, setTaxRate] = useState(10);
  const [rows, setRows] = useState<CartRow[]>([]);
  const [sending, setSending] = useState(false);

  const cartKey = `qr-cart:${store}:${tableNo || 0}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    const table = Number(params.get('table') ?? '0');
    setStore(storeKey);
    setTableNo(table);

    const key = `qr-cart:${storeKey}:${table}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, CartRow>;
        setRows(Object.values(parsed));
      } catch {
        setRows([]);
      }
    }

    if (!storeKey) return;
    fetch(`/api/order/context?store=${encodeURIComponent(storeKey)}`)
      .then((r) => r.json())
      .then((data) => setTaxRate(data.store?.taxRate ?? 10));
  }, []);

  useEffect(() => {
    if (!store) return;
    const raw = sessionStorage.getItem(cartKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, CartRow>;
        setRows(Object.values(parsed));
      } catch {
        setRows([]);
      }
    }

  }, [cartKey, store]);

  const subtotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.menu.price * row.qty, 0),
    [rows]
  );
  const total = Math.round(subtotal * (1 + taxRate / 100));
  const formatPrice = (value: number) => value.toLocaleString('ja-JP');

  const updateQty = (menuId: string, nextQty: number) => {
    setRows((prev) => {
      const updated = prev
        .map((row) => (row.menu.id === menuId ? { ...row, qty: nextQty } : row))
        .filter((row) => row.qty > 0);

      const asRecord = updated.reduce<Record<string, CartRow>>((acc, row) => {
        acc[row.menu.id] = row;
        return acc;
      }, {});
      sessionStorage.setItem(cartKey, JSON.stringify(asRecord));
      return updated;
    });
  };

  const submit = async () => {
    if (!rows.length || sending) return;
    setSending(true);

    const res = await fetch('/api/order/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        store_key: store,
        table_no: tableNo,
        items: rows.map((row) => ({ menu_id: row.menu.id, qty: row.qty }))
      })
    });

    setSending(false);
    if (!res.ok) {
      const json = await res.json();
      window.alert(`注文失敗: ${json.error ?? 'unknown'}`);
      return;
    }

    sessionStorage.removeItem(cartKey);
    router.push(`/order?store=${encodeURIComponent(store)}&table=${tableNo}&ordered=1`);
  };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 110px' }}>
      <h1 style={{ marginBottom: 12 }}>ご注文内容</h1>

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ color: '#666', marginBottom: 8 }}>
          店舗: {store} / テーブル: {tableNo}
        </div>
        {!rows.length && <div>注文内容がありません。</div>}
        {rows.map((row) => (
          <div key={row.menu.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{row.menu.name}</div>
              <div
                style={{
                  marginTop: 6,
                  display: 'inline-grid',
                  gridTemplateColumns: '34px 34px 34px',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  borderRadius: 12
                }}
              >
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 12 }}
                  onClick={() => updateQty(row.menu.id, row.qty - 1)}
                >
                  -
                </button>
                <div style={{ fontWeight: 700 }}>{row.qty}</div>
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 12 }}
                  onClick={() => updateQty(row.menu.id, row.qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>￥{formatPrice(row.menu.price * row.qty)}</div>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid #ddd', margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#666' }}>
          <span>小計</span>
          <span>￥{formatPrice(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 22 }}>
          <span>合計（税込）</span>
          <span>￥{formatPrice(total)}</span>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="btn-ghost" onClick={() => router.back()}>
          戻る
        </button>
        <button
          className={rows.length > 0 && !sending ? 'btn-primary soft-blink' : 'btn-primary'}
          onClick={submit}
          disabled={!rows.length || sending}
        >
          {sending ? '送信中...' : 'この内容で注文する'}
        </button>
      </div>
    </main>
  );
}
