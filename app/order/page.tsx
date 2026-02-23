'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Menu = {
  id: string;
  name: string;
  category: 'quick' | 'food' | 'recommendation' | 'drink' | 'dessert' | 'other';
  foodSubCategory?: 'seafood' | 'grill' | 'fried' | 'small_dish' | 'rice' | null;
  drinkSubCategory?:
    | 'beer'
    | 'highball'
    | 'sour'
    | 'cocktail'
    | 'shochu'
    | 'sake'
    | 'wine'
    | 'fruit_liquor'
    | 'non_alcohol'
    | 'soft_drink'
    | null;
  price: number;
  isSoldOut: boolean;
};

type Cart = Record<string, { menu: Menu; qty: number }>;

const labels: Record<Menu['category'], string> = {
  food: 'フード',
  recommendation: 'おすすめ',
  drink: 'ドリンク',
  dessert: 'デザート',
  other: 'その他',
  quick: 'フード'
};

const icons: Record<Menu['category'], string> = {
  food: '🍽️',
  recommendation: '⭐',
  drink: '🥤',
  dessert: '🍰',
  other: '🍴',
  quick: '🍽️'
};

export default function OrderPage() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [tableNo, setTableNo] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeCategory, setActiveCategory] = useState<Menu['category']>('food');
  const [activeFoodSubCategory, setActiveFoodSubCategory] = useState<
    'seafood' | 'grill' | 'fried' | 'small_dish' | 'rice'
  >('small_dish');
  const [activeDrinkSubCategory, setActiveDrinkSubCategory] = useState<
    'beer' | 'highball' | 'sour' | 'cocktail' | 'shochu' | 'sake' | 'wine' | 'fruit_liquor' | 'non_alcohol' | 'soft_drink'
  >('soft_drink');
  const [cart, setCart] = useState<Cart>({});
  const [message, setMessage] = useState('');
  const [cartKey, setCartKey] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [repeatMenuIds, setRepeatMenuIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    const table = Number(params.get('table') ?? '0');
    setStore(storeKey);
    setTableNo(table);

    const key = `qr-cart:${storeKey}:${table}`;
    setCartKey(key);
    const rawCart = sessionStorage.getItem(key);
    if (rawCart) {
      try {
        setCart(JSON.parse(rawCart));
      } catch {
        sessionStorage.removeItem(key);
      }
    }

    if (params.get('ordered') === '1') {
      setMessage('注文を送信しました。');
    }

    if (!storeKey) return;
    fetch(`/api/order/context?store=${encodeURIComponent(storeKey)}`)
      .then(async (r) => {
        if (!r.ok) {
          const json = await r.json().catch(() => null);
          throw new Error(json?.error ?? '注文画面の初期データ取得に失敗しました');
        }
        return r.json();
      })
      .then((data) => {
        setMenus(data.menus ?? []);
        setTaxRate(data.store?.taxRate ?? 10);
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : '注文画面の初期データ取得に失敗しました');
      });
  }, []);

  useEffect(() => {
    if (!cartKey) return;
    sessionStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  useEffect(() => {
    if (!store || !tableNo) return;
    fetch(`/api/order/repeat?store=${encodeURIComponent(store)}&table=${tableNo}`)
      .then(async (r) => {
        if (!r.ok) return { menuIds: [] as string[] };
        return r.json();
      })
      .then((data) => setRepeatMenuIds(Array.isArray(data.menuIds) ? data.menuIds : []))
      .catch(() => setRepeatMenuIds([]));
  }, [store, tableNo]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isMatch = (menu: Menu) => {
    if (!normalizedSearch) return true;
    return menu.name.toLowerCase().includes(normalizedSearch);
  };

  const categoryMenus = useMemo(() => {
    const rows =
      activeCategory === 'food'
        ? menus.filter((menu) => menu.category === 'food' || menu.category === 'quick')
        : menus.filter((menu) => menu.category === activeCategory);
    const matchedRows = rows.filter(isMatch);
    if (activeCategory === 'food') {
      return matchedRows.filter((menu) => (menu.foodSubCategory ?? 'small_dish') === activeFoodSubCategory);
    }
    if (activeCategory === 'drink') {
      return matchedRows.filter((menu) => (menu.drinkSubCategory ?? 'soft_drink') === activeDrinkSubCategory);
    }
    return matchedRows;
  }, [menus, activeCategory, activeFoodSubCategory, activeDrinkSubCategory, normalizedSearch]);

  const recommendationMenus = useMemo(
    () => menus.filter((menu) => menu.category === 'recommendation' && isMatch(menu)),
    [menus, normalizedSearch]
  );

  const repeatMenus = useMemo(
    () => menus.filter((menu) => repeatMenuIds.includes(menu.id) && isMatch(menu)),
    [menus, repeatMenuIds, normalizedSearch]
  );

  const subtotal = Object.values(cart).reduce((sum, item) => sum + item.menu.price * item.qty, 0);
  const totalQty = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const formatPrice = (value: number) => value.toLocaleString('ja-JP');
  const taxIncluded = (value: number) => Math.round(value * (1 + taxRate / 100));

  const changeQty = (menuId: string, qty: number, menu?: Menu) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[menuId];
      } else {
        const resolvedMenu = next[menuId]?.menu ?? menu;
        if (!resolvedMenu) return prev;
        next[menuId] = { menu: resolvedMenu, qty };
      }
      return next;
    });
  };

  const getQty = (menuId: string) => cart[menuId]?.qty ?? 0;

  const callStaff = async () => {
    const res = await fetch('/api/call/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, table_no: tableNo })
    });
    if (res.ok) {
      setMessage('店員を呼び出しました。');
    }
  };

  const goToReview = () => {
    if (totalQty === 0) {
      window.alert('商品を選択してください');
      return;
    }
    router.push(`/order/review?store=${encodeURIComponent(store)}&table=${tableNo}`);
  };

  const renderMenuCard = (menu: Menu, keyPrefix = '') => (
    <div
      key={`${keyPrefix}${menu.id}`}
      className="card"
      style={{
        borderRadius: 24,
        padding: 12,
        opacity: menu.isSoldOut ? 0.5 : 1,
        background: '#fff',
        border: '1px solid #efe9df'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(145deg, #f3efe7, #fff)'
          }}
        >
          <span style={{ fontSize: 44 }}>{icons[menu.category]}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.25 }}>{menu.name}</div>
          {menu.isSoldOut ? (
            <button className="btn-ghost" disabled style={{ marginTop: 8 }}>
              売り切れ
            </button>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 10 }}>
              <div
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: '36px 36px 36px',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  borderRadius: 14
                }}
              >
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 14 }}
                  onClick={() => changeQty(menu.id, getQty(menu.id) - 1, menu)}
                >
                  -
                </button>
                <div style={{ fontWeight: 700 }}>{getQty(menu.id)}</div>
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 14 }}
                  onClick={() => changeQty(menu.id, getQty(menu.id) + 1, menu)}
                >
                  +
                </button>
              </div>
              <div style={{ minWidth: 116, textAlign: 'right' }}>
                <div style={{ fontSize: 19, fontWeight: 800, whiteSpace: 'nowrap', paddingRight: 10 }}>
                  ￥{formatPrice(menu.price)}
                </div>
                <div style={{ fontSize: 12, color: '#8d877b', whiteSpace: 'nowrap' }}>
                  （税込￥{formatPrice(taxIncluded(menu.price))}）
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#8d877b' }}>Table delivery</div>
          <div style={{ fontWeight: 700 }}>
            {store || '-'} / T{tableNo || '-'}
          </div>
        </div>
        <button className="btn-ghost" style={{ borderRadius: 12 }} onClick={() => setIsSearchOpen((prev) => !prev)}>
          🔍
        </button>
      </div>

      {isSearchOpen && (
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="商品名で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <h1 style={{ margin: '0 0 10px', fontSize: 44, lineHeight: 1.02, letterSpacing: -1 }}>
        Hungry? <span style={{ color: '#8d877b', fontWeight: 400 }}>Order & Eat.</span>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6, marginBottom: 10 }}>
        {(['food', 'recommendation', 'drink', 'dessert', 'other'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            style={{
              width: '100%',
              minHeight: 92,
              borderRadius: 16,
              border: activeCategory === category ? '2px solid #161616' : '1px solid #e0dbcf',
              background: '#fff',
              padding: '11px 4px'
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 3 }}>{icons[category]}</div>
            <div style={{ fontSize: 16, whiteSpace: 'nowrap', fontWeight: 700 }}>{labels[category]}</div>
          </button>
        ))}
      </div>

      {activeCategory === 'food' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 6,
            marginBottom: 10
          }}
        >
          {(
            [
              ['seafood', '海鮮'],
              ['grill', '焼き物'],
              ['fried', '揚げ物'],
              ['small_dish', '一品料理'],
              ['rice', 'ご飯物']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={activeFoodSubCategory === value ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setActiveFoodSubCategory(value)}
              style={{
                width: '100%',
                minHeight: 56,
                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: 'normal',
                padding: '6px 4px'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeCategory === 'drink' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 6,
            marginBottom: 10
          }}
        >
          {(
            [
              ['beer', 'ビール'],
              ['highball', 'ハイボール'],
              ['sour', 'サワー・酎ハイ'],
              ['cocktail', 'カクテル'],
              ['shochu', '焼酎'],
              ['sake', '日本酒'],
              ['wine', 'ワイン'],
              ['fruit_liquor', '梅酒・果実酒'],
              ['non_alcohol', 'ノンアルコール'],
              ['soft_drink', 'ソフト\nドリンク']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={activeDrinkSubCategory === value ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setActiveDrinkSubCategory(value)}
              style={{
                width: '100%',
                minHeight: 56,
                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: 'pre-line',
                padding: '6px 4px'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {recommendationMenus.length > 0 && (
          <div className="card" style={{ borderRadius: 16, background: '#fff9ec' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>おすすめ</div>
            <div style={{ display: 'grid', gap: 8 }}>{recommendationMenus.slice(0, 3).map((menu) => renderMenuCard(menu, 'rec-'))}</div>
          </div>
        )}

        {repeatMenus.length > 0 && (
          <div className="card" style={{ borderRadius: 16, background: '#eef8f2' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>おかわり</div>
            <div style={{ display: 'grid', gap: 8 }}>{repeatMenus.slice(0, 3).map((menu) => renderMenuCard(menu, 'repeat-'))}</div>
          </div>
        )}

        {activeCategory === 'other' && (
          <div className="card" style={{ borderRadius: 24, padding: 14, border: '1px solid #efe9df' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>店員呼び出し</div>
            <div style={{ color: '#6f6b61', marginBottom: 10 }}>ご要望がある場合はこちらを押してください</div>
            <button className="btn-danger" onClick={callStaff}>
              店員を呼ぶ
            </button>
          </div>
        )}
        {categoryMenus.map((menu) => renderMenuCard(menu))}
      </div>

      <div
        className="card"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '94%',
          maxWidth: 488,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 12,
          background: '#f2f2f5',
          borderTop: '1px solid #ddd6c9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#666' }}>
          <span>数量</span>
          <b>{totalQty}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#666' }}>
          <span>合計（税込）</span>
          <span>￥{formatPrice(taxIncluded(subtotal))}</span>
        </div>
        <button
          className={totalQty > 0 ? 'btn-primary soft-blink' : 'btn-primary'}
          onClick={goToReview}
          style={{
            display: 'block',
            width: '94%',
            margin: '8px auto 0',
            background: '#171717',
            color: '#fff',
            borderRadius: 14,
            height: 48
          }}
        >
          ご注文内容を確認
        </button>
      </div>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </main>
  );
}
