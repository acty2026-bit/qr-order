'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WebPrntAdapter } from '@/lib/print/printAdapter';
import { formatYmdHm } from '@/lib/time';

type TableCard = {
  tableNo: number;
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
  const [notificationReady, setNotificationReady] = useState(false);
  const [printerUrl, setPrinterUrl] = useState('');

  const orderAudio = useRef<HTMLAudioElement | null>(null);
  const callAudio = useRef<HTMLAudioElement | null>(null);
  const printed = useRef<Set<string>>(new Set());
  const lastPolledAt = useRef<string>(new Date().toISOString());

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
      <h1>厨房モニター</h1>
      <p>
        店舗: <b>{store || '-'}</b>
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <a href={`/admin/menu?store=${encodeURIComponent(store)}`}>メニュー編集</a>
        <a href={`/admin/ranking?store=${encodeURIComponent(store)}`}>ランキング</a>
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
          </div>
        ))}
      </div>
    </main>
  );
}
