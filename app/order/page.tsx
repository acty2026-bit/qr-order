'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Menu = {
  id: string;
  name: string;
  category: 'quick' | 'food' | 'recommendation' | 'drink' | 'dessert' | 'other';
  foodSubCategory?: 'seafood' | 'salad' | 'grill' | 'fried' | 'small_dish' | 'rice' | null;
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
  isRecommended: boolean;
  isSoldOut: boolean;
  imageUrl?: string | null;
};

type Cart = Record<string, { menu: Menu; qty: number }>;

type RailKey =
  | 'recommendation'
  | 'quick'
  | 'alcohol'
  | 'drink'
  | 'seafood'
  | 'salad'
  | 'grill'
  | 'fried'
  | 'small_dish'
  | 'rice'
  | 'other'
  | 'dessert';

const labelMap: Record<RailKey, string> = {
  recommendation: 'おすすめ',
  quick: 'おかわり',
  alcohol: 'アルコール',
  drink: 'ソフトドリンク',
  seafood: '海鮮',
  salad: 'サラダ',
  grill: '焼き物',
  fried: '揚げ物',
  small_dish: '一品料理',
  rice: 'ご飯物',
  other: 'その他',
  dessert: 'デザート'
};

const railColor: Record<RailKey, string> = {
  recommendation: '#f8a94f',
  quick: '#f3c85a',
  alcohol: '#5a9ce6',
  drink: '#59b6ff',
  seafood: '#5bc0de',
  salad: '#8ad36d',
  grill: '#f3a84b',
  fried: '#f2cb4d',
  small_dish: '#8dcf50',
  rice: '#8b9ee8',
  other: '#b3b3b3',
  dessert: '#f8a2c7'
};

const icons: Record<Menu['category'], string> = {
  food: '🍽️',
  recommendation: '⭐',
  drink: '🍺',
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
  const [cart, setCart] = useState<Cart>({});
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [cartKey, setCartKey] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [repeatMenuIds, setRepeatMenuIds] = useState<string[]>([]);
  const [planTab, setPlanTab] = useState<'all' | 'houdai'>('all');
  const [activeRail, setActiveRail] = useState<RailKey>('recommendation');
  const [activeAlcoholSub, setActiveAlcoholSub] = useState<
    'all' | 'beer' | 'highball' | 'sour' | 'cocktail' | 'shochu' | 'sake' | 'wine'
  >('all');
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const prevPlanTabRef = useRef<'all' | 'houdai'>('all');
  const [viewportHeight, setViewportHeight] = useState(800);
  const [viewportWidth, setViewportWidth] = useState(390);
  const [chromeHeight, setChromeHeight] = useState(180);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const planWrapRef = useRef<HTMLDivElement | null>(null);

  const hasAllYouCanMenus = menus.some((menu) => menu.isAllYouCan);

  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const nextChromeHeight =
      (headerRef.current?.offsetHeight ?? 0) +
      (searchWrapRef.current?.offsetHeight ?? 0) +
      (planWrapRef.current?.offsetHeight ?? 0) +
      28;
    if (nextChromeHeight > 0) setChromeHeight(nextChromeHeight);
  }, [viewportHeight, viewportWidth, isSearchOpen, hasAllYouCanMenus, planTab, menus.length]);

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
      showToast('注文が送信されました');
      const next = new URL(window.location.href);
      next.searchParams.delete('ordered');
      window.history.replaceState({}, '', next.toString());
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

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2000);
  };

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
    () => filteredByPlanAndSearch.filter((menu) => menu.isRecommended),
    [filteredByPlanAndSearch]
  );

  const repeatMenus = useMemo(
    () =>
      filteredByPlanAndSearch
        .filter((menu) => repeatMenuIds.includes(menu.id))
        .sort((a, b) => repeatMenuIds.indexOf(a.id) - repeatMenuIds.indexOf(b.id)),
    [filteredByPlanAndSearch, repeatMenuIds]
  );

  const listMenus = useMemo(() => {
    const drinkRows = filteredByPlanAndSearch.filter((m) => m.category === 'drink');
    const drinkSub = (menu: Menu) => menu.drinkSubCategory ?? 'soft_drink';
    const alcoholSubs = ['beer', 'highball', 'sour', 'cocktail', 'shochu', 'sake', 'wine', 'fruit_liquor'] as const;

    if (activeRail === 'recommendation') return recommendationMenus;
    if (activeRail === 'quick') return repeatMenus;
    if (activeRail === 'alcohol') {
      const alcoholRows = drinkRows.filter((m) => alcoholSubs.includes(drinkSub(m) as (typeof alcoholSubs)[number]));
      if (activeAlcoholSub === 'all') return alcoholRows;
      return alcoholRows.filter((m) => drinkSub(m) === activeAlcoholSub);
    }
    if (activeRail === 'drink') {
      return drinkRows.filter((m) => ['soft_drink', 'non_alcohol'].includes(drinkSub(m)));
    }
    if (activeRail === 'seafood') {
      return filteredByPlanAndSearch.filter(
        (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'seafood'
      );
    }
    if (activeRail === 'salad') {
      return filteredByPlanAndSearch.filter(
        (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'salad'
      );
    }
    if (activeRail === 'other') return filteredByPlanAndSearch.filter((m) => m.category === 'other');
    if (activeRail === 'dessert') return filteredByPlanAndSearch.filter((m) => m.category === 'dessert');

    if (['grill', 'fried', 'small_dish', 'rice'].includes(activeRail)) {
      return filteredByPlanAndSearch.filter(
        (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === activeRail
      );
    }

    return filteredByPlanAndSearch;
  }, [activeRail, filteredByPlanAndSearch, recommendationMenus, repeatMenus, activeAlcoholSub]);

  const subtotal = Object.values(cart).reduce((sum, item) => sum + item.menu.price * item.qty, 0);
  const totalQty = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const formatPrice = (value: number) => value.toLocaleString('ja-JP');

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

  const openMenuModal = (menu: Menu) => {
    if (menu.isSoldOut) return;
    setSelectedMenu(menu);
    setModalQty(1);
  };

  const closeMenuModal = () => {
    setSelectedMenu(null);
    setModalQty(1);
  };

  const addFromModal = () => {
    if (!selectedMenu) return;
    const current = getQty(selectedMenu.id);
    changeQty(selectedMenu.id, current + modalQty, selectedMenu);
    showToast('注文リストへ追加しました');
    closeMenuModal();
  };

  const callStaff = async () => {
    const res = await fetch('/api/call/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, table_no: tableNo })
    });
    if (res.ok) showToast('店員を呼び出しました');
  };

  const goToReview = () => {
    if (totalQty === 0) {
      window.alert('商品を選択してください');
      return;
    }
    router.push(`/order/review?store=${encodeURIComponent(store)}&table=${tableNo}`);
  };

  const goToHistory = () => {
    router.push(`/order/history?store=${encodeURIComponent(store)}&table=${tableNo}`);
  };

  const shareQr = () => {
    const shareUrl = `${window.location.origin}/order?store=${encodeURIComponent(store)}&table=${tableNo}`;
    window.prompt('同じテーブル共有用URL', shareUrl);
  };

  const railItems: RailKey[] = [
    'recommendation',
    'quick',
    'alcohol',
    'drink',
    'seafood',
    'salad',
    'grill',
    'fried',
    'small_dish',
    'rice',
    'dessert',
    'other'
  ];

  useEffect(() => {
    const prevPlanTab = prevPlanTabRef.current;
    prevPlanTabRef.current = planTab;
    if (prevPlanTab === planTab) return;
    if (planTab !== 'houdai') return;

    const drinkSub = (menu: Menu) => menu.drinkSubCategory ?? 'soft_drink';
    const alcoholSubs = ['beer', 'highball', 'sour', 'cocktail', 'shochu', 'sake', 'wine', 'fruit_liquor'] as const;
    const hasInRail = (rail: RailKey) => {
      if (rail === 'recommendation') return recommendationMenus.length > 0;
      if (rail === 'quick') return repeatMenus.length > 0;
      if (rail === 'alcohol') {
        return filteredByPlanAndSearch.some(
          (m) => m.category === 'drink' && alcoholSubs.includes(drinkSub(m) as (typeof alcoholSubs)[number])
        );
      }
      if (rail === 'drink') {
        return filteredByPlanAndSearch.some((m) => m.category === 'drink' && ['soft_drink', 'non_alcohol'].includes(drinkSub(m)));
      }
      if (rail === 'seafood') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'seafood'
        );
      }
      if (rail === 'salad') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'salad'
        );
      }
      if (rail === 'grill') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'grill'
        );
      }
      if (rail === 'fried') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'fried'
        );
      }
      if (rail === 'small_dish') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'small_dish'
        );
      }
      if (rail === 'rice') {
        return filteredByPlanAndSearch.some(
          (m) => (m.category === 'food' || m.category === 'quick') && (m.foodSubCategory ?? 'small_dish') === 'rice'
        );
      }
      if (rail === 'dessert') return filteredByPlanAndSearch.some((m) => m.category === 'dessert');
      if (rail === 'other') return filteredByPlanAndSearch.some((m) => m.category === 'other');
      return false;
    };

    if (hasInRail(activeRail)) return;
    const fallbackRail = railItems.find((rail) => hasInRail(rail));
    if (fallbackRail) setActiveRail(fallbackRail);
  }, [activeRail, filteredByPlanAndSearch, recommendationMenus, repeatMenus, planTab]);

  const mainWidth = Math.min(430, Math.max(320, viewportWidth));
  const isCompactPhone = mainWidth <= 360;
  const railWidth = mainWidth <= 350 ? 94 : mainWidth <= 390 ? 106 : 116;
  const footerHeight = 64;
  const scrollPaneHeight = Math.max(260, viewportHeight - chromeHeight - footerHeight - 6);
  const railGap = 6;
  const railButtonHeight = isCompactPhone ? 46 : 52;

  const imageSize = isCompactPhone ? 84 : 96;
  const railFontSize = isCompactPhone ? 13 : 14;
  const productNameFontSize = isCompactPhone ? 15 : 17;
  const productNameLineHeight = 1.25;
  const productNameMinHeight = Math.round(productNameFontSize * productNameLineHeight * 2);

  const renderMenuCard = (menu: Menu) => (
    <button
      key={menu.id}
      className="card"
      onClick={() => openMenuModal(menu)}
      disabled={menu.isSoldOut}
      style={{
        display: 'grid',
        gridTemplateColumns: `1fr ${imageSize}px`,
        gap: 8,
        padding: 0,
        borderRadius: 5,
        border: '1px solid #e7e1d8',
        opacity: menu.isSoldOut ? 0.55 : 1,
        background: '#fff',
        minWidth: 0,
        textAlign: 'left',
        overflow: 'hidden',
        minHeight: imageSize
      }}
    >
      <div
        style={{
          minWidth: 0,
          padding: 10,
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: productNameFontSize,
            lineHeight: productNameLineHeight,
            color: '#666',
            wordBreak: 'break-word',
            minHeight: productNameMinHeight,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {menu.name}
        </div>
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <span style={{ color: '#666', fontWeight: 700, fontSize: isCompactPhone ? 16 : 18 }}>
            ￥{formatPrice(menu.price)}
          </span>
          {menu.isAllYouCan && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1,
                color: '#7a5a00',
                background: '#ffe266',
                borderRadius: 5,
                padding: '4px 6px',
                border: '1px solid #f2cf3f',
                flexShrink: 0
              }}
            >
              放題
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          width: imageSize,
          height: '100%',
          minHeight: imageSize,
          background: 'linear-gradient(145deg, #f4f0e9, #ffffff)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          alignSelf: 'stretch',
          position: 'relative'
        }}
      >
        {menu.imageUrl ? (
          <img
            src={menu.imageUrl}
            alt={menu.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: isCompactPhone ? 42 : 48 }}>{icons[menu.category]}</span>
        )}
        {getQty(menu.id) > 0 && (
          <span
            className="soft-blink"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 24,
              height: 24,
              borderRadius: 5,
              background: '#f08d17',
              color: '#fff',
              border: '2px solid #fff',
              fontSize: 13,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              padding: '0 6px',
              lineHeight: 1
            }}
          >
            {getQty(menu.id)}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <main
      style={{
        maxWidth: 430,
        width: '100%',
        margin: '0 auto',
        padding: '8px 10px 66px',
        background: '#f6f5f3',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        touchAction: 'pan-y'
      }}
    >
      <div
        ref={headerRef}
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '8px 0 10px',
          marginBottom: 10,
          boxShadow: '0 8px 14px -12px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>メニュー</div>
        <div style={{ position: 'absolute', left: 2, top: 8, fontSize: 12, color: '#7a7469', fontWeight: 700 }}>
          {store || '-'} / T{tableNo || '-'}
        </div>
        <div style={{ position: 'absolute', right: 2, top: 8, display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            style={{ width: 42, height: 42, borderRadius: 5, fontSize: 20, padding: 0 }}
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
              borderRadius: 5,
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
        <div ref={searchWrapRef} style={{ marginBottom: 8 }}>
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
          ref={planWrapRef}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${railWidth}px 1fr`,
          gap: 8,
          minWidth: 0
        }}
      >
        <aside
          className="hide-scrollbar"
          style={{
            display: 'grid',
            gap: railGap,
            alignContent: 'start',
            maxHeight: `${scrollPaneHeight}px`,
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            overscrollBehaviorX: 'none',
            paddingRight: 2
          }}
        >
          {railItems.map((key) => (
            <button
              key={key}
              className="btn-ghost"
              onClick={() => setActiveRail(key)}
              style={{
                justifyContent: 'flex-start',
                fontSize: railFontSize,
                borderRadius: 5,
                height: railButtonHeight,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 4px',
                borderLeft: `4px solid ${railColor[key]}`,
                background: activeRail === key ? '#fdf0dd' : '#fff',
                color: activeRail === key ? '#7a4a12' : '#6d665c',
                fontWeight: activeRail === key ? 700 : 500
              }}
            >
              {labelMap[key]}
            </button>
          ))}
        </aside>

        <section
          className="hide-scrollbar"
          style={{
            display: 'grid',
            gap: 8,
            alignContent: 'start',
            minWidth: 0,
            maxHeight: `${scrollPaneHeight}px`,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            overscrollBehaviorX: 'none',
            paddingRight: 2
          }}
        >
          {activeRail === 'alcohol' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 6,
                paddingBottom: 2
              }}
            >
              {(
                [
                  ['all', 'すべて'],
                  ['beer', 'ビール'],
                  ['sour', 'サワー'],
                  ['highball', 'ハイボール'],
                  ['cocktail', 'カクテル'],
                  ['shochu', '焼酎'],
                  ['sake', '日本酒'],
                  ['wine', 'ワイン']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className="btn-ghost"
                  onClick={() => setActiveAlcoholSub(key)}
                  style={{
                    width: '100%',
                    height: 34,
                    borderRadius: 5,
                    fontSize: isCompactPhone ? 10 : 11,
                    padding: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    background: activeAlcoholSub === key ? '#fdf0dd' : '#fff',
                    color: activeAlcoholSub === key ? '#7a4a12' : '#4e463d',
                    borderColor: activeAlcoholSub === key ? '#f0c38a' : undefined,
                    fontWeight: activeAlcoholSub === key ? 700 : 500
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

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
          width: 82,
          height: 82,
          borderRadius: 41,
          background: '#f59b2e',
          color: '#fff',
          border: '3px solid #fff',
          boxShadow: '0 10px 24px rgba(0,0,0,0.32)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800
        }}
      >
        <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 2 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 4H5L7.2 14.2C7.3 14.7 7.8 15 8.3 15H17.1C17.6 15 18.1 14.7 18.2 14.2L20 8H6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.2" cy="19" r="1.6" fill="#fff" />
              <circle cx="17" cy="19" r="1.6" fill="#fff" />
            </svg>
          </div>
          <div style={{ fontSize: 13 }}>注文へ</div>
        </div>
        {totalQty > 0 && (
          <span
            className="soft-blink"
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
          <div style={{ fontSize: 12, color: '#6d665c' }}>メニュー</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={goToHistory}>
          <div>🕘</div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>履歴</div>
        </button>
        <button className="btn-ghost" style={{ border: 0, borderRadius: 0 }} onClick={shareQr}>
          <div>▦</div>
          <div style={{ fontSize: 12, color: '#6d665c' }}>QR</div>
        </button>
      </nav>

      {selectedMenu && (
        <div
          onClick={closeMenuModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 60,
            display: 'grid',
            placeItems: 'center',
            padding: 10
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 430,
              background: '#fff',
              borderRadius: 5,
              overflow: 'hidden',
              border: '1px solid #d9d2c4',
              boxShadow: '0 14px 30px rgba(0,0,0,0.28)',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                background: 'linear-gradient(145deg, #f4f0e9, #ffffff)',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden'
              }}
            >
              {selectedMenu.imageUrl ? (
                <img
                  src={selectedMenu.imageUrl}
                  alt={selectedMenu.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 180 }}>{icons[selectedMenu.category]}</span>
              )}
              <button
                className="btn-ghost"
                onClick={closeMenuModal}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  background: '#fff',
                  fontSize: 28
                }}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px 14px 96px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.35 }}>{selectedMenu.name}</div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#5f5a52' }}>
                ￥{formatPrice(selectedMenu.price)}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                background: '#fff',
                borderTop: '1px solid #ddd6c9',
                padding: 12,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 10,
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: '48px 48px 48px',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: 30,
                  background: '#f6f5f3',
                  border: '1px solid #d9d4c8',
                  height: 54
                }}
              >
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 30, fontSize: 24 }}
                  onClick={() => setModalQty((v) => Math.max(1, v - 1))}
                >
                  －
                </button>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{modalQty}</div>
                <button
                  className="btn-ghost"
                  style={{ border: 0, background: 'transparent', borderRadius: 30, fontSize: 24 }}
                  onClick={() => setModalQty((v) => Math.min(99, v + 1))}
                >
                  ＋
                </button>
              </div>

              <button
                className="btn-primary soft-blink"
                onClick={addFromModal}
                style={{
                  height: 48,
                  borderRadius: 5,
                  background: '#f08d17',
                  borderColor: '#f08d17',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px'
                }}
              >
                注文リストへ追加
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            zIndex: 70,
            background: '#fff',
            color: '#222',
            padding: '12px 18px',
            borderRadius: 5,
            border: '1px solid #e4ddd1',
            boxShadow: '0 10px 22px rgba(0, 0, 0, 0.16)',
            fontWeight: 700,
            animation: 'toast-fade 2s ease-in-out'
          }}
        >
          {toast}
        </div>
      )}

      {message && <p style={{ marginTop: 8 }}>{message}</p>}
    </main>
  );
}
