'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WebPrntAdapter } from '@/lib/print/printAdapter';
import { formatYmdHm } from '@/lib/time';

type TableCard = {
  tableNo: number;
  partySize: number | null;
  latestOrderAt: string;
  orderIds: string[];
  hasPendingPrint: boolean;
  failedOrderIds: string[];
  items: Record<string, number>;
};

type KitchenPoll = {
  store: { id: string; name: string; storeKey: string };
  tableCards: TableCard[];
  activeCalls: Array<{ id: string; tableNo: number; createdAt: string }>;
  hasNewOrder: boolean;
  hasNewCall: boolean;
  pendingOrders: Array<{
    id: string;
    tableNo: number;
    createdAt: string;
    items: Array<{ name: string; qty: number }>;
  }>;
};

export default function KitchenPage() {
  const [store, setStore] = useState('');
  const [data, setData] = useState<KitchenPoll | null>(null);
  const [message, setMessage] = useState('通知を有効化してください');
  const [toast, setToast] = useState('');
  const [notificationReady, setNotificationReady] = useState(false);
  const [printerUrl, setPrinterUrl] = useState('');
  const [partySizeDrafts, setPartySizeDrafts] = useState<Record<number, string>>({});

  const orderAudio = useRef<HTMLAudioElement | null>(null);
  const callAudio = useRef<HTMLAudioElement | null>(null);
  const printed = useRef<Set<string>>(new Set());
  const lastPolledAt = useRef<string>(new Date().toISOString());

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 1600);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    setStore(storeKey);
    setPrinterUrl(localStorage.getItem('printerUrl') ?? 'http://192.168.0.100:8001/StarWebPRNT/SendMessage');

    orderAudio.current = new Audio('/order.mp3');
    callAudio.current = new Audio('/call.mp3');
    if (callAudio.current) callAudio.current.loop = true;

    if (!storeKey) return;
    const run = async () => {
      const res = await fetch(
        `/api/kitchen/poll?store=${encodeURIComponent(storeKey)}&since=${encodeURIComponent(lastPolledAt.current)}`
      );
      if (!res.ok) return;
      const json = (await res.json()) as KitchenPoll;
      setData(json);
      setPartySizeDrafts((prev) => {
        const next: Record<number, string> = {};
        for (const card of json.tableCards) {
          next[card.tableNo] = prev[card.tableNo] ?? (card.partySize ? String(card.partySize) : '');
        }
        return next;
      });

      if (notificationReady) {
        if (json.hasNewOrder) {
          void orderAudio.current?.play().catch(() => undefined);
          setMessage('新規注文があります');
          void callAudio.current?.pause();
        } else if (json.hasNewCall) {
          void callAudio.current?.play().catch(() => undefined);
          setMessage('店員呼び出しがあります');
        } else {
          void callAudio.current?.pause();
          setMessage('待機中');
        }
      }

      lastPolledAt.current = new Date().toISOString();
    };

    run();
    const id = window.setInterval(run, 2500);
    return () => window.clearInterval(id);
  }, [notificationReady]);

  useEffect(() => {
    if (!data || !printerUrl) return;

    const adapter = new WebPrntAdapter(printerUrl);
    const currentPendingOrderIds = new Set(data.pendingOrders.map((order) => order.id));
    printed.current.forEach((orderId) => {
      if (!currentPendingOrderIds.has(orderId)) {
        printed.current.delete(orderId);
      }
    });
    const targetOrders = data.pendingOrders.filter((order) => !printed.current.has(order.id));
    for (const order of targetOrders) {
      printed.current.add(order.id);
      adapter
        .printOrder({
          orderId: order.id,
          storeName: data.store.name,
          tableNo: order.tableNo,
          orderedAt: formatYmdHm(order.createdAt),
          items: order.items
        })
        .then(async () => {
          await fetch('/api/print/report', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ order_id: order.id, status: 'success' })
          });
        })
        .catch(async (e: Error) => {
          await fetch('/api/print/report', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              order_id: order.id,
              status: 'failed',
              error_message: e.message
            })
          });
          setMessage(`印刷失敗: ${order.id}`);
        });
    }
  }, [data, printerUrl]);

  const enableNotification = async () => {
    setNotificationReady(true);
    setMessage('通知を有効化しました');
    await orderAudio.current?.play().catch(() => undefined);
    await orderAudio.current?.pause();
    if (orderAudio.current) orderAudio.current.currentTime = 0;
  };

  const acknowledge = async (callId: string) => {
    await fetch('/api/call/ack', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ call_id: callId })
    });
    if (callAudio.current) {
      callAudio.current.pause();
      callAudio.current.currentTime = 0;
    }
  };

  const reprintFailed = async (tableNo: number, orderIds: string[]) => {
    if (!orderIds.length) return;
    const tasks = orderIds.map((orderId) =>
      fetch('/api/admin/reprint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })
    );
    const results = await Promise.all(tasks);
    const failed = results.filter((res) => !res.ok).length;
    if (failed > 0) {
      setMessage(`T${tableNo} 再印刷に失敗(${failed}件)`);
      return;
    }
    setMessage(`T${tableNo} 再印刷をキューしました`);
  };

  const checkoutTable = async (tableNo: number) => {
    if (!store) return;
    const ok = window.confirm(`T${tableNo} を会計確定して次の客に切り替えます。よろしいですか？`);
    if (!ok) return;

    const res = await fetch('/api/order/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, table_no: tableNo })
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(`T${tableNo} 会計確定失敗: ${json.error ?? 'unknown'}`);
      return;
    }

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tableCards: prev.tableCards.filter((card) => card.tableNo !== tableNo),
        activeCalls: prev.activeCalls.filter((call) => call.tableNo !== tableNo),
        pendingOrders: prev.pendingOrders.filter((order) => order.tableNo !== tableNo)
      };
    });
    setMessage(`T${tableNo} 会計確定しました（次の客に切替）`);
  };

  const savePartySize = async (tableNo: number) => {
    if (!store) return;
    const raw = partySizeDrafts[tableNo] ?? '';
    const partySize = Number(raw);
    if (!Number.isInteger(partySize) || partySize <= 0 || partySize > 30) {
      showToast(`T${tableNo} 来店人数は1〜30で入力してください`);
      return;
    }

    const res = await fetch('/api/table/party-size', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        store_key: store,
        table_no: tableNo,
        party_size: partySize
      })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      showToast(`T${tableNo} 来店人数の保存失敗: ${json.error ?? 'unknown'}`);
      return;
    }

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tableCards: prev.tableCards.map((card) => (card.tableNo === tableNo ? { ...card, partySize } : card))
      };
    });
    showToast(`T${tableNo} 来店人数を保存しました`);
  };

  const activeCallsByTable = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const call of data?.activeCalls ?? []) {
      if (!map.has(call.tableNo)) map.set(call.tableNo, []);
      map.get(call.tableNo)?.push(call.id);
    }
    return map;
  }, [data?.activeCalls]);

  return (
    <main>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 45,
            background: '#fff',
            color: '#1f1f1b',
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid #ddd6c9',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
            fontWeight: 700
          }}
        >
          {toast}
        </div>
      )}
      <h1>厨房モニター</h1>
      <p>
        店舗: <b>{store || '-'}</b>
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <a href={`/admin/menu?store=${encodeURIComponent(store)}`}>メニュー編集</a>
        <a href={`/admin/reports?store=${encodeURIComponent(store)}`}>売上レポート</a>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={enableNotification}>
            通知を有効化
          </button>
          <div>
            <div>Star WebPRNT URL</div>
            <input
              value={printerUrl}
              onChange={(e) => setPrinterUrl(e.target.value)}
              onBlur={() => localStorage.setItem('printerUrl', printerUrl)}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 10,
          borderRadius: 10,
          marginBottom: 12,
          color: '#fff',
          background: data?.hasNewOrder ? '#b30000' : data?.hasNewCall ? '#ac7b00' : '#34624b'
        }}
      >
        {message}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {(data?.tableCards ?? []).map((card) => (
          <div key={card.tableNo} className="card" style={{ minHeight: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 30 }}>T{card.tableNo}</h2>
              <div>{formatYmdHm(card.latestOrderAt)}</div>
            </div>

            <div style={{ marginTop: 8, fontSize: 24, lineHeight: 1.4 }}>
              {Object.entries(card.items).map(([name, qty]) => (
                <div key={name}>
                  {name} x {qty}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 700 }}>来店人数</label>
              <input
                type="number"
                min={1}
                max={30}
                value={partySizeDrafts[card.tableNo] ?? ''}
                onChange={(e) => {
                  const normalized = e.target.value.replace(/[^\d]/g, '');
                  setPartySizeDrafts((prev) => ({ ...prev, [card.tableNo]: normalized }));
                }}
                placeholder="人数"
                style={{ width: 88, height: 38 }}
              />
              <button className="btn-ghost" style={{ height: 38 }} onClick={() => savePartySize(card.tableNo)}>
                保存
              </button>
            </div>

            {card.failedOrderIds.length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px dashed #c77b7b', paddingTop: 8 }}>
                <div style={{ marginBottom: 6, color: '#9d1f1f', fontWeight: 700 }}>印刷失敗あり</div>
                <button
                  className="btn-danger soft-blink"
                  onClick={() => reprintFailed(card.tableNo, card.failedOrderIds)}
                >
                  再印刷 ({card.failedOrderIds.length})
                </button>
              </div>
            )}

            {!!activeCallsByTable.get(card.tableNo)?.length && (
              <div style={{ marginTop: 10, borderTop: '1px dashed #cfb962', paddingTop: 8 }}>
                <div style={{ marginBottom: 6, color: '#8a6300' }}>呼び出し中</div>
                {activeCallsByTable.get(card.tableNo)?.map((callId) => (
                  <button key={callId} className="btn-danger" onClick={() => acknowledge(callId)}>
                    対応
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 10, borderTop: '1px dashed #c8c8c8', paddingTop: 8 }}>
              <button className="btn-primary" onClick={() => checkoutTable(card.tableNo)}>
                会計してリセット
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
