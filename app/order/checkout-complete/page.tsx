'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Satisfaction = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied';

const satisfactionOptions: Array<{ value: Satisfaction; label: string }> = [
  { value: 'very_satisfied', label: 'とても満足' },
  { value: 'satisfied', label: '満足' },
  { value: 'neutral', label: 'ふつう' },
  { value: 'dissatisfied', label: '不満' }
];

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CheckoutCompletePage() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [tableNo, setTableNo] = useState(0);
  const [orderId, setOrderId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [dishNames, setDishNames] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [satisfaction, setSatisfaction] = useState<Satisfaction | ''>('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    const table = Number(params.get('table') ?? '0');
    const orderIdParam = (params.get('orderId') ?? '').trim();
    const dishesParam = (params.get('dishes') ?? '').trim();

    setStore(storeKey);
    setTableNo(table);
    setOrderId(orderIdParam);

    if (storeKey && table > 0) {
      const key = `qr-feedback-session:${storeKey}:${table}`;
      const current = sessionStorage.getItem(key);
      if (current) {
        setSessionId(current);
      } else {
        const generated = createSessionId();
        sessionStorage.setItem(key, generated);
        setSessionId(generated);
      }
    }

    if (dishesParam) {
      setDishNames(
        dishesParam
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 5)
      );
    }
  }, []);

  const mapsReviewUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_GOOGLE_MAPS_REVIEW_URL ?? '').trim(),
    []
  );

  const isReviewFlow = satisfaction === 'very_satisfied' || satisfaction === 'satisfied';
  const isFeedbackFlow = satisfaction === 'neutral' || satisfaction === 'dissatisfied';

  const generateReview = async () => {
    if (generating || !isReviewFlow) return;
    setGenerating(true);
    const res = await fetch('/api/review/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dishNames })
    });
    setGenerating(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(`口コミ生成に失敗しました: ${json.error ?? 'unknown'}`);
      return;
    }

    const data = (await res.json()) as { review?: string };
    setReviewText((data.review ?? '').trim());
  };

  const copyReview = async () => {
    if (!reviewText) return;
    try {
      await navigator.clipboard.writeText(reviewText);
      window.alert('口コミ文をコピーしました');
    } catch {
      window.alert('コピーに失敗しました');
    }
  };

  const submitFeedback = async () => {
    if (!isFeedbackFlow || !feedbackComment.trim() || submittingFeedback) return;

    setSubmittingFeedback(true);
    const res = await fetch('/api/review/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        store_key: store,
        table_no: tableNo || undefined,
        order_id: orderId || undefined,
        session_id: sessionId || undefined,
        satisfaction,
        comment: feedbackComment.trim()
      })
    });
    setSubmittingFeedback(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(`送信に失敗しました: ${json.error ?? 'unknown'}`);
      return;
    }

    setFeedbackSubmitted(true);
    setFeedbackComment('');
  };

  return (
    <main
      style={{
        maxWidth: 430,
        width: '100%',
        margin: '0 auto',
        padding: '18px 12px 24px',
        background: '#f6f5f3',
        minHeight: '100dvh',
        boxSizing: 'border-box'
      }}
    >
      <section className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>会計完了</div>
        <div style={{ textAlign: 'center', color: '#7a7469', fontWeight: 700, fontSize: 12, marginBottom: 16 }}>
          {store || '-'} / T{tableNo || '-'}
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', textAlign: 'center' }}>ご来店ありがとうございました！</p>
        <p style={{ margin: '0 0 12px', textAlign: 'center', lineHeight: 1.7 }}>今回のご利用はいかがでしたか？</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {satisfactionOptions.map((option) => (
            <button
              key={option.value}
              className="btn-ghost"
              onClick={() => {
                setSatisfaction(option.value);
                setFeedbackSubmitted(false);
              }}
              style={{
                borderColor: satisfaction === option.value ? '#f59b2e' : '#ddd6c9',
                fontWeight: satisfaction === option.value ? 800 : 600,
                background: satisfaction === option.value ? '#fff6ea' : '#fff'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {isReviewFlow && (
        <section className="card" style={{ padding: 12, marginBottom: 12 }}>
          <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
            ありがとうございます。よろしければGoogle口コミをお願いします。
          </p>
          <button
            className="btn-primary"
            onClick={generateReview}
            disabled={generating}
            style={{
              width: '100%',
              background: '#f59b2e',
              borderColor: '#f59b2e',
              color: '#fff',
              fontSize: 16,
              fontWeight: 800
            }}
          >
            {generating ? '生成中...' : '口コミを書く'}
          </button>

          {reviewText && (
            <>
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  whiteSpace: 'pre-wrap',
                  background: '#fff',
                  border: '1px solid #e5ded2',
                  borderRadius: 12,
                  lineHeight: 1.8
                }}
              >
                {reviewText}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button className="btn-ghost" onClick={copyReview}>
                  口コミ文をコピー
                </button>
                {mapsReviewUrl ? (
                  <button className="btn-primary" onClick={() => window.open(mapsReviewUrl, '_blank', 'noopener,noreferrer')}>
                    Googleマップで口コミを書く
                  </button>
                ) : (
                  <button className="btn-primary" disabled>
                    Google口コミURL未設定
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {isFeedbackFlow && (
        <section className="card" style={{ padding: 12, marginBottom: 12 }}>
          <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
            ご意見ありがとうございます。改善のため、よろしければご要望をお聞かせください。
          </p>
          {!feedbackSubmitted ? (
            <>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="ご要望・気になった点をご記入ください"
                rows={5}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <button
                className="btn-primary"
                onClick={submitFeedback}
                disabled={!feedbackComment.trim() || submittingFeedback}
                style={{ width: '100%', marginTop: 8 }}
              >
                {submittingFeedback ? '送信中...' : '送信する'}
              </button>
            </>
          ) : (
            <div
              style={{
                padding: 12,
                border: '1px solid #e5ded2',
                borderRadius: 12,
                background: '#fff',
                lineHeight: 1.6
              }}
            >
              ご意見を受け付けました。ありがとうございます。
            </div>
          )}
        </section>
      )}

      <button
        className="btn-ghost"
        style={{ marginTop: 4, width: '100%' }}
        onClick={() => router.push(`/order?store=${encodeURIComponent(store)}&table=${tableNo}`)}
      >
        注文画面に戻る
      </button>
    </main>
  );
}
