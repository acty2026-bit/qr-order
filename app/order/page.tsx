'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  isAllYouCan: boolean;
  isSoldOut: boolean;
};

type Cart = Record<string, { menu: Menu; qty: number }>;

type RailKey =
  | 'recommendation'
  | 'quick'
  | 'drink'
  | 'salad'
  | 'grill'
  | 'fried'
  | 'small_dish'
  | 'rice'
  | 'otsumami'
  | 'dessert'
  ;

const labelMap: Record<RailKey, string> = {
  recommendation: 'おすすめ',
  quick: 'とりあえず一品',
  drink: 'ドリンク',
  salad: 'サラダ',
  grill: '焼き物',
  fried: '揚げ物',
  small_dish: '一品料理',
  rice: 'ご飯物',
  otsumami: 'おつまみ',
  dessert: 'デザート'
};

const railColor: Record<RailKey, string> = {
  recommendation: '#f8a94f',
  quick: '#f3c85a',
  drink: '#59b6ff',
  salad: '#8ad36d',
  grill: '#f3a84b',
  fried: '#f2cb4d',
  small_dish: '#8dcf50',
  rice: '#8b9ee8',
  otsumami: '#b3b3b3',
  dessert: '#f8a2c7'
};

const icons: Record<Menu['category'], string> = {
  food: '🍽️',
  recommendation: '⭐',
  drink: '🍺',
  dessert: '🥗',
  other: '🍴',
  quick: '🍽️'
};

export default function OrderPage() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [tableNo, setTableNo] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [message, setMessage] = useState('');
  const [cartKey, setCartKey] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [planTab, setPlanTab] = useState<'all' | 'houdai'>('all');
  const [activeRail, setActiveRail] = useState<RailKey>('recommendation');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isMatch = (menu: Menu) => {
    if (!normalizedSearch) return true;
    return menu.name.toLowerCase().includes(normalizedSearch);
  };

  const filteredByPlanAndSearch = useMemo(
    () => menus.filter((menu) => isMatch(menu) && (planTab === 'all' || menu.isAllYouCan)),
    [menus, planTab, normalizedSearch]
  );

  const recommendationMenus = useMemo(
    () => filteredByPlanAndSearch.filter((menu) => menu.category === 'recommendation'),
    [filteredByPlanAndSearch]
  );

  const listMenus = useMemo(() => {
    if (activeRail === 'recommendation') return recommendationMenus;
    if (activeRail === 'quick') return filteredByPlanAndSearch.filter((m) => m.category === 'quick');
    if (activeRail === 'drink') return filteredByPlanAndSearch.filter((m) => m.category === 'drink');
    if (activeRail === 'salad') {
      return filteredByPlanAndSearch.filter(
        (m) =>
          (m.category === 'food' || m.category === 'quick') &&
          ((m.foodSubCategory ?? 'small_dish') === 'seafood' || m.name.includes('サラダ'))
      );
    }
    if (activeRail === 'dessert') return filteredByPlanAndSearch.filter((m) => m.category === 'dessert');
    if (activeRail === 'otsumami') {
      return filteredByPlanAndSearch.filter((m) => m.category === 'other' || m.name.includes('おつまみ'));
    }

    if (['grill', 'fried', 'small_dish', 'rice'].includes(activeRail)) {
      return filteredByPlanAndSearch.filter(
        (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === activeRail
      );
    }

    return filteredByPlanAndSearch;
  }, [activeRail, filteredByPlanAndSearch, recommendationMenus]);

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

  const shareQr = () => {
    const shareUrl = `${window.location.origin}/order?store=${encodeURIComponent(store)}&table=${tableNo}`;
    window.prompt('同じテーブル共有用URL', shareUrl);
  };

  const railItems: RailKey[] = [
    'recommendation',
    'quick',
    'drink',
    'salad',
    'grill',
    'fried',
    'small_dish',
    'rice',
    'otsumami',
    'dessert'
  ];

  const hasAllYouCanMenus = menus.some((menu) => menu.isAllYouCan);

  const renderMenuCard = (menu: Menu) => (
    <div
      key={menu.id}
      className="card"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 96px',
        gap: 8,
        padding: 10,
        borderRadius: 12,
        border: '1px solid #e7e1d8',
        opacity: menu.isSoldOut ? 0.55 : 1,
        background: '#fff'
      }}
    >
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{menu.name}</div>
        <div style={{ marginTop: 4, color: '#666', fontWeight: 700 }}>￥{formatPrice(menu.price)}</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-grid',
              gridTemplateColumns: '30px 30px 30px',
              borderRadius: 10,
              background: '#f2eee6',
              textAlign: 'center',
              alignItems: 'center'
            }}
          >
            <button
              className="btn-ghost"
              style={{ border: 0, background: 'transparent' }}
              onClick={() => changeQty(menu.id, getQty(menu.id) - 1, menu)}
              disabled={menu.isSoldOut}
            >
              -
            </button>
            <div style={{ fontWeight: 800 }}>{getQty(menu.id)}</div>
            <button
              className="btn-ghost"
              style={{ border: 0, background: 'transparent' }}
              onClick={() => changeQty(menu.id, getQty(menu.id) + 1, menu)}
              disabled={menu.isSoldOut}
            >
              +
            </button>
          </div>
          {menu.isAllYouCan && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#996700', background: '#fff0c7', borderRadius: 6, padding: '1px 6px' }}>
              放題
            </span>
          )}
          {menu.isSoldOut && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8a3a3a', background: '#ffe7e7', borderRadius: 6, padding: '1px 6px' }}>
              売切
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 10,
          background: 'linear-gradient(145deg, #f4f0e9, #ffffff)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 48
        }}
      >
        {icons[menu.category]}
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: '8px 10px 88px', background: '#f6f5f3', minHeight: '100dvh' }}>
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '8px 0 10px',
          marginBottom: 10,
          boxShadow: '0 8px 14px -12px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 2 }}>メニュー</div>
        <div style={{ position: 'absolute', left: 2, top: 8, fontSize: 12, color: '#7a7469', fontWeight: 700 }}>
          {store || '-'} / T{tableNo || '-'}
        </div>
        <div style={{ position: 'absolute', right: 2, top: 8, display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            style={{ width: 42, height: 42, borderRadius: 10, fontSize: 20, padding: 0 }}
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              window.setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            aria-label="検索"
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

      {isSearchOpen && (
        <div style={{ marginBottom: 8 }}>
          <input
            ref={searchInputRef}
            placeholder="商品名で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {hasAllYouCanMenus && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            marginBottom: 8,
            borderBottom: '1px solid #e5dfd4'
          }}
        >
          <button
            onClick={() => setPlanTab('all')}
            style={{
              height: 44,
              border: 0,
              background: 'transparent',
              fontSize: 20,
              fontWeight: planTab === 'all' ? 800 : 500,
              color: planTab === 'all' ? '#d26a00' : '#2a2824',
              borderBottom: planTab === 'all' ? '4px solid #d26a00' : '4px solid transparent'
            }}
          >
            全て
          </button>
          <button
            onClick={() => setPlanTab('houdai')}
            style={{
              height: 44,
              border: 0,
              background: 'transparent',
              fontSize: 20,
              fontWeight: planTab === 'houdai' ? 800 : 500,
              color: planTab === 'houdai' ? '#d26a00' : '#2a2824',
              borderBottom: planTab === 'houdai' ? '4px solid #d26a00' : '4px solid transparent'
            }}
          >
            放題
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '98px 1fr', gap: 8 }}>
        <aside style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
          {railItems.map((key) => (
            <button
              key={key}
              className="btn-ghost"
              onClick={() => setActiveRail(key)}
              style={{
                justifyContent: 'flex-start',
                fontSize: 13,
                borderRadius: 10,
                height: 50,
                borderLeft: `4px solid ${railColor[key]}`,
                background: activeRail === key ? '#f4efe4' : '#fff',
                color: activeRail === key ? '#2d2a24' : '#6d665c',
                fontWeight: activeRail === key ? 700 : 500
              }}
            >
              {labelMap[key]}
            </button>
          ))}
        </aside>

        <section style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {listMenus.length === 0 && (
            <div className="card" style={{ padding: 16, color: '#767068' }}>
              表示できる商品がありません
            </div>
          )}
          {listMenus.map((menu) => renderMenuCard(menu))}
        </section>
      </div>

      <button
        className={totalQty > 0 ? 'btn-primary soft-blink' : 'btn-primary'}
        onClick={goToReview}
        style={{
          position: 'fixed',
          right: 'max(12px, calc((100vw - 430px) / 2 + 12px))',
          bottom: 78,
          width: 72,
          height: 72,
          borderRadius: 36,
          background: '#f59b2e',
          color: '#fff',
          border: '3px solid #fff',
          boxShadow: '0 8px 18px rgba(0,0,0,0.2)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800
        }}
      >
        <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
          <div style={{ fontSize: 20 }}>🛒</div>
          <div style={{ fontSize: 11 }}>注文へ進む</div>
        </div>
        {totalQty > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              background: '#ff7f17',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              padding: '0 6px'
            }}
          >
            {totalQty}
          </span>
        )}
      </button>

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
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={() => setActiveRail('recommendation')}>
          <div>🍴</div>
          <div style={{ fontSize: 12 }}>メニュー</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={goToReview}>
          <div>🕘</div>
          <div style={{ fontSize: 12 }}>履歴</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={shareQr}>
          <div>▦</div>
          <div style={{ fontSize: 12 }}>QR</div>
        </button>
      </nav>

      <div style={{ display: 'none' }}>￥{formatPrice(taxIncluded(subtotal))}</div>
      {message && <p style={{ marginTop: 8 }}>{message}</p>}
    </main>
  );
}
