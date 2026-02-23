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
  isAllYouCan: boolean;
  isSoldOut: boolean;
};

type Cart = Record<string, { menu: Menu; qty: number }>;

type RailKey =
  | 'recommendation'
  | 'repeat'
  | 'call'
  | 'food'
  | 'drink'
  | 'dessert'
  | 'other'
  | 'seafood'
  | 'grill'
  | 'fried'
  | 'small_dish'
  | 'rice'
  | 'beer'
  | 'highball'
  | 'sour'
  | 'cocktail'
  | 'shochu'
  | 'sake'
  | 'wine'
  | 'fruit_liquor'
  | 'non_alcohol'
  | 'soft_drink';

const labelMap: Record<RailKey, string> = {
  recommendation: 'おすすめ',
  repeat: 'おかわり',
  call: '店員呼出',
  food: 'フード',
  drink: 'ドリンク',
  dessert: '前菜',
  other: 'その他',
  seafood: '海鮮',
  grill: '焼き物',
  fried: '揚げ物',
  small_dish: '一品料理',
  rice: 'ご飯物',
  beer: 'ビール',
  highball: 'ハイボール',
  sour: 'サワー',
  cocktail: 'カクテル',
  shochu: '焼酎',
  sake: '日本酒',
  wine: 'ワイン',
  fruit_liquor: '果実酒',
  non_alcohol: 'ノンアル',
  soft_drink: 'ソフトD'
};

const railColor: Record<RailKey, string> = {
  recommendation: '#f8a94f',
  repeat: '#8ecf57',
  call: '#8ecf57',
  food: '#63c255',
  drink: '#59b6ff',
  dessert: '#f8a2c7',
  other: '#b6b6b6',
  seafood: '#5bc0de',
  grill: '#f3a84b',
  fried: '#f2cb4d',
  small_dish: '#8dcf50',
  rice: '#8b9ee8',
  beer: '#ffc34d',
  highball: '#ff9b54',
  sour: '#7bd98f',
  cocktail: '#ea8cff',
  shochu: '#cda879',
  sake: '#9ea7ff',
  wine: '#d45c7d',
  fruit_liquor: '#ff8ea7',
  non_alcohol: '#67d2d1',
  soft_drink: '#7cc5ff'
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
  const [repeatMenuIds, setRepeatMenuIds] = useState<string[]>([]);
  const [planTab, setPlanTab] = useState<'all' | 'houdai'>('all');
  const [activeRail, setActiveRail] = useState<RailKey>('recommendation');

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

  const filteredByPlanAndSearch = useMemo(
    () => menus.filter((menu) => isMatch(menu) && (planTab === 'all' || menu.isAllYouCan)),
    [menus, planTab, normalizedSearch]
  );

  const recommendationMenus = useMemo(
    () => filteredByPlanAndSearch.filter((menu) => menu.category === 'recommendation'),
    [filteredByPlanAndSearch]
  );

  const repeatMenus = useMemo(
    () => filteredByPlanAndSearch.filter((menu) => repeatMenuIds.includes(menu.id)),
    [filteredByPlanAndSearch, repeatMenuIds]
  );

  const listMenus = useMemo(() => {
    if (activeRail === 'recommendation') return recommendationMenus;
    if (activeRail === 'repeat') return repeatMenus;
    if (activeRail === 'food') return filteredByPlanAndSearch.filter((m) => m.category === 'food' || m.category === 'quick');
    if (activeRail === 'drink') return filteredByPlanAndSearch.filter((m) => m.category === 'drink');
    if (activeRail === 'dessert') return filteredByPlanAndSearch.filter((m) => m.category === 'dessert');
    if (activeRail === 'other') return filteredByPlanAndSearch.filter((m) => m.category === 'other');

    if (['seafood', 'grill', 'fried', 'small_dish', 'rice'].includes(activeRail)) {
      return filteredByPlanAndSearch.filter(
        (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === activeRail
      );
    }

    if (
      ['beer', 'highball', 'sour', 'cocktail', 'shochu', 'sake', 'wine', 'fruit_liquor', 'non_alcohol', 'soft_drink'].includes(activeRail)
    ) {
      return filteredByPlanAndSearch.filter((m) => m.category === 'drink' && (m.drinkSubCategory ?? 'soft_drink') === activeRail);
    }

    return filteredByPlanAndSearch;
  }, [activeRail, filteredByPlanAndSearch, recommendationMenus, repeatMenus]);

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
    'repeat',
    'call',
    'drink',
    'dessert',
    'grill',
    'fried',
    'small_dish',
    'rice'
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
      <div style={{ position: 'relative', textAlign: 'center', padding: '8px 0 10px' }}>
        <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 2 }}>メニュー</div>
        <div style={{ fontSize: 12, color: '#7a7469' }}>{store || '-'} / T{tableNo || '-'}</div>
        <button
          className="btn-ghost"
          style={{ position: 'absolute', right: 2, top: 8, width: 42, height: 42, borderRadius: 10 }}
          onClick={() => setIsSearchOpen((prev) => !prev)}
        >
          🔍
        </button>
      </div>

      {isSearchOpen && (
        <div style={{ marginBottom: 8 }}>
          <input placeholder="商品名で検索" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      )}

      {hasAllYouCanMenus && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <button className={planTab === 'all' ? 'btn-primary' : 'btn-ghost'} onClick={() => setPlanTab('all')}>
            全て
          </button>
          <button className={planTab === 'houdai' ? 'btn-primary' : 'btn-ghost'} onClick={() => setPlanTab('houdai')}>
            放題
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '98px 1fr', gap: 8 }}>
        <aside style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
          {railItems.map((key) => (
            <button
              key={key}
              className={activeRail === key ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setActiveRail(key)}
              style={{
                justifyContent: 'flex-start',
                fontSize: 13,
                borderRadius: 10,
                height: 50,
                borderLeft: `4px solid ${railColor[key]}`
              }}
            >
              {labelMap[key]}
            </button>
          ))}
          {activeRail === 'call' && (
            <button className="btn-danger" style={{ height: 44 }} onClick={callStaff}>
              呼び出す
            </button>
          )}
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
          <div style={{ fontSize: 11 }}>カート</div>
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
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          borderTop: '1px solid #ddd6c9',
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
