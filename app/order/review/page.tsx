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
  const [toast, setToast] = useState('');

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
  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2000);
  };

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

  const callStaff = async () => {
    if (!store || !tableNo) return;
    const res = await fetch('/api/call/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, table_no: tableNo })
    });
    if (res.ok) showToast('店員を呼び出しました');
  };

  const shareQr = () => {
    const shareUrl = `${window.location.origin}/order?store=${encodeURIComponent(store)}&table=${tableNo}`;
    window.prompt('同じテーブル共有用URL', shareUrl);
  };

  return (
    <main
      style={{
        maxWidth: 430,
        width: '100%',
        margin: '0 auto',
        padding: '8px 10px 76px',
        background: '#f6f5f3',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        touchAction: 'pan-y'
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          textAlign: 'center',
          padding: '8px 0 10px',
          marginBottom: 10,
          background: '#f6f5f3',
          boxShadow: '0 8px 14px -12px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>ご注文内容</div>
        <div style={{ position: 'absolute', left: 2, top: 8, fontSize: 12, color: '#7a7469', fontWeight: 700 }}>
          {store || '-'} / T{tableNo || '-'}
        </div>
        <div style={{ position: 'absolute', right: 2, top: 8, display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            style={{ width: 42, height: 42, borderRadius: 10, fontSize: 20, padding: 0 }}
            onClick={() => router.push(`/order?store=${encodeURIComponent(store)}&table=${tableNo}`)}
            aria-label="メニューへ"
          >
            🔍
          </button>
          <button
            className="btn-danger"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              fontSize: 20,
              padding: 0,
              background: '#f59b2e',
              borderColor: '#f59b2e',
              color: '#fff'
            }}
            onClick={callStaff}
            aria-label="店員呼び出し"
          >
            🔔
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
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

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn-ghost" onClick={() => router.back()}>
            戻る
          </button>
          <button
            className={rows.length > 0 && !sending ? 'btn-primary soft-blink' : 'btn-primary'}
            onClick={submit}
            disabled={!rows.length || sending}
            style={{
              background: '#f59b2e',
              borderColor: '#f59b2e',
              color: '#fff'
            }}
          >
            {sending ? '送信中...' : 'この内容で注文する'}
          </button>
        </div>
      </section>

      <nav
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '100%',
          maxWidth: 430,
          background: '#fff',
          borderTop: '1px solid #ddd6c9',
          borderLeft: '1px solid #ddd6c9',
          borderRight: '1px solid #ddd6c9',
          height: 64,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          zIndex: 20
        }}
      >
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={() => router.push(`/order?store=${encodeURIComponent(store)}&table=${tableNo}`)}>
          <div>🍴</div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>メニュー</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={() => router.push(`/order/history?store=${encodeURIComponent(store)}&table=${tableNo}`)}>
          <div>🕘</div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>履歴</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={shareQr}>
          <div>▦</div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>QR</div>
        </button>
      </nav>

      {toast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            background: '#fff',
            color: '#222',
            padding: '12px 18px',
            borderRadius: 12,
            border: '1px solid #e4ddd1',
            boxShadow: '0 10px 22px rgba(0, 0, 0, 0.16)',
            fontWeight: 700,
            animation: 'toast-fade 2s ease-in-out'
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
