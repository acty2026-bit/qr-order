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
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 2 }}>注文履歴</div>
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
          <div style={{ fontSize: 12 }}>メニュー</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }}>
          <div>🕘</div>
          <div style={{ fontSize: 12 }}>履歴</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={shareQr}>
          <div>▦</div>
          <div style={{ fontSize: 12 }}>QR</div>
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
