'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type HistoryOrder = {
  id: string;
  createdAt: string;
  total: number;
  items: Array<{
    id: string;
    nameSnapshot: string;
    qty: number;
    priceSnapshot: number;
  }>;
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [tableNo, setTableNo] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');

  const loadHistory = async (storeKey: string, table: number) => {
    setLoading(true);
    const res = await fetch(`/api/order/history?store=${encodeURIComponent(storeKey)}&table=${table}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error ?? '履歴の取得に失敗しました');
      setOrders([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    const table = Number(params.get('table') ?? '0');
    setStore(storeKey);
    setTableNo(table);

    if (!storeKey || !table) {
      setMessage('store/table が不足しています');
      setLoading(false);
      return;
    }

    void loadHistory(storeKey, table);
  }, []);

  useEffect(() => {
    if (!store || !tableNo) return;
    router.prefetch(`/order?store=${encodeURIComponent(store)}&table=${tableNo}`);
  }, [router, store, tableNo]);

  const grandTotal = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2000);
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

  const goToMenu = () => {
    router.push(`/order?store=${encodeURIComponent(store)}&table=${tableNo}`);
  };

  const checkout = async () => {
    if (!store || !tableNo || checkingOut) return;
    const ok = window.confirm('会計を確定します。よろしいですか？');
    if (!ok) return;

    setCheckingOut(true);
    const res = await fetch('/api/order/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, table_no: tableNo })
    });
    setCheckingOut(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(`会計に失敗しました: ${json.error ?? 'unknown'}`);
      return;
    }

    router.push(`/order/checkout-complete?store=${encodeURIComponent(store)}&table=${tableNo}`);
  };

  const orangeGradient = 'linear-gradient(135deg, #ffac3f 0%, #f08d17 55%, #de7600 100%)';
  const panelBg = '#f9f4ec';

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
          position: 'relative',
          textAlign: 'center',
          padding: '8px 10px 14px',
          marginLeft: -10,
          marginRight: -10,
          marginBottom: 10,
          background: panelBg,
          borderBottom: '1px solid #e6d8c8'
        }}
      >
        <div
          style={{
            display: 'block',
            width: 165,
            margin: '25px auto 2px',
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1,
            color: '#7a4a12'
          }}
        >
          注文履歴
        </div>
        <div style={{ position: 'absolute', left: 8, top: 8, zIndex: 2, fontSize: 12, color: '#7a7469', fontWeight: 700 }}>
          {store || '-'} / T{tableNo || '-'}
        </div>
        <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 2, display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              fontSize: 20,
              padding: 0,
              background: '#fffaf2',
              border: '1px solid #dfd1bf'
            }}
            onClick={goToMenu}
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
              fontSize: 16,
              padding: 0,
              background: orangeGradient,
              borderColor: '#cf6f16',
              color: '#fff'
            }}
            onClick={callStaff}
            aria-label="店員呼び出し"
          >
            🔔
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ color: '#666', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
          <div>合計金額は割引・クーポン適用前の金額です。</div>
          <div>お会計時にスタッフが最終金額をご案内いたします。</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>合計（税抜）</span>
          <strong>￥{grandTotal.toLocaleString('ja-JP')}</strong>
        </div>
      </section>

      {loading && <div className="card">読み込み中...</div>}

      {!loading &&
        orders.map((order) => (
          <section key={order.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <strong>￥{order.total.toLocaleString('ja-JP')}</strong>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.nameSnapshot} × {item.qty}</span>
                  <span>￥{(item.priceSnapshot * item.qty).toLocaleString('ja-JP')}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

      <nav
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '100%',
          maxWidth: 430,
          background: panelBg,
          borderTop: '1px solid #e2d5c5',
          borderLeft: '1px solid #e2d5c5',
          borderRight: '1px solid #e2d5c5',
          height: 64,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          zIndex: 20
        }}
      >
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={goToMenu}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 3V10" stroke="#e97a1f" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 3V7" stroke="#e97a1f" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 3V7" stroke="#e97a1f" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 10V21" stroke="#e97a1f" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 3C18.2 5.5 18.2 8.5 16 11V21" stroke="#e97a1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>MENU</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 7V12L15 14" stroke="#6f6f6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="7" stroke="#6f6f6f" strokeWidth="2" />
              <path d="M8 3.5H16" stroke="#6f6f6f" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>履歴</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={checkout} disabled={checkingOut}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 1 }}>
            {checkingOut ? (
              <span style={{ color: '#6f6f6f', fontWeight: 700 }}>…</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 4L11.3 10H8.5V12H11.8V14H8.5V16H11.8V20H13.8V16H17V14H13.8V12H17V10H14.3L17.6 4H15.3L12.8 8.9L10.3 4H8Z" fill="#6f6f6f" />
              </svg>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>{checkingOut ? '処理中' : 'お会計'}</div>
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

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </main>
  );
}
