'use client';

import { useEffect, useState } from 'react';

type Menu = {
  id: string;
  name: string;
  nameKana: string;
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
  sortOrder: number;
};

type CategoryChoice =
  | 'food:seafood'
  | 'food:salad'
  | 'food:grill'
  | 'food:fried'
  | 'food:small_dish'
  | 'food:rice'
  | 'drink:beer'
  | 'drink:highball'
  | 'drink:sour'
  | 'drink:cocktail'
  | 'drink:shochu'
  | 'drink:sake'
  | 'drink:wine'
  | 'drink:fruit_liquor'
  | 'drink:non_alcohol'
  | 'drink:soft_drink'
  | 'drink'
  | 'dessert'
  | 'other';

export default function AdminMenuPage() {
  const [store, setStore] = useState('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [form, setForm] = useState({
    name: '',
    name_kana: '',
    category_choice: 'food:small_dish' as CategoryChoice,
    price: '',
    is_all_you_can: false
  });
  const [menuFilter, setMenuFilter] = useState<
    'alcohol' | 'soft_drink' | 'seafood' | 'salad' | 'grill' | 'fried' | 'small_dish' | 'rice' | 'dessert' | 'other'
  >('alcohol');
  const [taxRate, setTaxRate] = useState(10);
  const [toast, setToast] = useState('');
  const [draggingMenuId, setDraggingMenuId] = useState<string | null>(null);
  const [dragOverMenuId, setDragOverMenuId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [canDragRows, setCanDragRows] = useState(false);

  const load = async (storeKey: string) => {
    const res = await fetch(`/api/admin/menus?store=${encodeURIComponent(storeKey)}`);
    if (res.ok) {
      const json = await res.json();
      setMenus(json.menus);
      return;
    }
    const json = await res.json().catch(() => null);
    showToast(json?.error ?? 'メニュー取得に失敗しました');
  };

  const loadStoreConfig = async (storeKey: string) => {
    const res = await fetch(`/api/admin/store?store=${encodeURIComponent(storeKey)}`);
    if (res.ok) {
      const json = await res.json();
      setTaxRate(json.store?.taxRate ?? 10);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get('store') ?? '';
    setStore(storeKey);
    if (!storeKey) return;
    load(storeKey);
    loadStoreConfig(storeKey);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    setCanDragRows(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);


  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 1500);
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('画像変換に失敗しました'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('画像変換に失敗しました'));
      reader.readAsDataURL(blob);
    });

  const loadImageFromFile = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('画像読み込みに失敗しました'));
      };
      img.src = url;
    });

  const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('画像圧縮に失敗しました'));
            return;
          }
          resolve(blob);
        },
        type,
        quality
      );
    });

  const compressImageTo2MBDataUrl = async (file: File) => {
    const MAX_BYTES = 2 * 1024 * 1024;
    const MAX_DIM = 1600;
    const img = await loadImageFromFile(file);

    const baseScale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    let width = Math.max(1, Math.round(img.naturalWidth * baseScale));
    let height = Math.max(1, Math.round(img.naturalHeight * baseScale));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('画像処理コンテキストが取得できません');

    let quality = 0.88;
    let attempts = 0;
    let blob: Blob | null = null;

    while (attempts < 12) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob.size <= MAX_BYTES) break;

      if (quality > 0.52) {
        quality -= 0.08;
      } else {
        width = Math.max(1, Math.round(width * 0.9));
        height = Math.max(1, Math.round(height * 0.9));
      }
      attempts += 1;
    }

    if (!blob || blob.size > MAX_BYTES) {
      throw new Error('画像サイズを2MB以下にできませんでした');
    }

    return blobToDataUrl(blob);
  };

  const onMenuImageChange = (id: string, file?: File) => {
    void (async () => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        showToast('画像サイズは20MB以下にしてください');
        return;
      }
      try {
        const dataUrl = await compressImageTo2MBDataUrl(file);
        setMenuById(id, (m) => ({ ...m, imageUrl: dataUrl }));
        showToast('画像を最適化して設定しました');
      } catch (e) {
        showToast(e instanceof Error ? e.message : '画像の処理に失敗しました');
      }
    })();
  };

  const toInt = (value: string) => {
    const normalized = value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
    const onlyDigits = normalized.replace(/[^\d]/g, '');
    return onlyDigits ? Number(onlyDigits) : 0;
  };

  const onlyDigits = (value: string) => {
    const normalized = value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
    return normalized.replace(/[^\d]/g, '');
  };

  const formatDigits = (value: string | number) => {
    const n = typeof value === 'number' ? value : Number(onlyDigits(value) || 0);
    return n.toLocaleString('ja-JP');
  };

  const parseCategoryChoice = (choice: CategoryChoice) => {
    if (choice.startsWith('food:')) {
      return {
        category: 'food' as const,
        food_sub_category: choice.replace('food:', '') as 'seafood' | 'salad' | 'grill' | 'fried' | 'small_dish' | 'rice',
        drink_sub_category: null
      };
    }
    if (choice.startsWith('drink:')) {
      return {
        category: 'drink' as const,
        food_sub_category: null,
        drink_sub_category: choice.replace('drink:', '') as
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
      };
    }
    return {
      category: choice as 'drink' | 'dessert' | 'other',
      food_sub_category: null,
      drink_sub_category: null
    };
  };

  const menuToCategoryChoice = (menu: Menu): CategoryChoice => {
    if (menu.category === 'food' || menu.category === 'quick') {
      return `food:${menu.foodSubCategory ?? 'small_dish'}` as CategoryChoice;
    }
    if (menu.category === 'drink') {
      return `drink:${menu.drinkSubCategory ?? 'soft_drink'}` as CategoryChoice;
    }
    if (menu.category === 'recommendation') return 'other';
    return menu.category as CategoryChoice;
  };

  const createMenu = async () => {
    const parsed = parseCategoryChoice(form.category_choice);
    const nextSortOrder = Math.max(0, ...menus.map((m) => m.sortOrder ?? 0)) + 1;
    const res = await fetch('/api/admin/menus', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        store_key: store,
        name: form.name,
        name_kana: form.name_kana,
        category: parsed.category,
        food_sub_category: parsed.food_sub_category,
        drink_sub_category: parsed.drink_sub_category,
        price: toInt(form.price),
        is_all_you_can: form.is_all_you_can,
        is_recommended: false,
        image_url: null,
        sort_order: nextSortOrder
      })
    });

    if (res.ok) {
      const json = await res.json();
      setMenus((prev) => [...prev, json.menu]);
      setForm({ name: '', name_kana: '', category_choice: 'food:small_dish', price: '', is_all_you_can: false });
      showToast('登録しました');
    }
  };

  const updateMenu = async (menu: Menu, doneMessage?: string) => {
    const parsed = parseCategoryChoice(menuToCategoryChoice(menu));
    const res = await fetch('/api/admin/menus', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: menu.id,
        name: menu.name,
        name_kana: menu.nameKana,
        category: parsed.category,
        food_sub_category: parsed.food_sub_category,
        drink_sub_category: parsed.drink_sub_category,
        price: Number(menu.price),
        is_all_you_can: menu.isAllYouCan,
        is_recommended: menu.isRecommended,
        is_sold_out: menu.isSoldOut,
        image_url: menu.imageUrl ?? null,
        sort_order: Number(menu.sortOrder)
      })
    });

    if (res.ok) {
      const json = await res.json();
      setMenus((prev) => prev.map((m) => (m.id === json.menu.id ? json.menu : m)));
      if (doneMessage) showToast(doneMessage);
    }
  };

  const saveOrder = async (orderedIds: string[]) => {
    const rankById = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
    const nextMenus = menus.map((menu) => (rankById.has(menu.id) ? { ...menu, sortOrder: rankById.get(menu.id)! } : menu));
    setMenus(nextMenus);
    setDirty(true);
  };

  const moveMenu = async (targetId: string, orderedIds: string[]) => {
    if (!draggingMenuId || draggingMenuId === targetId) return;
    const sourceIndex = orderedIds.indexOf(draggingMenuId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextOrderedIds = [...orderedIds];
    const [moved] = nextOrderedIds.splice(sourceIndex, 1);
    nextOrderedIds.splice(targetIndex, 0, moved);
    await saveOrder(nextOrderedIds);
  };

  const getFilteredMenus = (source: Menu[]) => {
    const alcoholSubs = ['beer', 'highball', 'sour', 'cocktail', 'shochu', 'sake', 'wine', 'fruit_liquor'] as const;
    const rows = source.filter((menu) => {
      if (menuFilter === 'alcohol') {
        return menu.category === 'drink' && alcoholSubs.includes((menu.drinkSubCategory ?? 'soft_drink') as (typeof alcoholSubs)[number]);
      }
      if (menuFilter === 'soft_drink') {
        return menu.category === 'drink' && ['soft_drink', 'non_alcohol'].includes(menu.drinkSubCategory ?? 'soft_drink');
      }
      if (menuFilter === 'dessert') return menu.category === 'dessert';
      if (menuFilter === 'other') return menu.category === 'other';
      return (menu.category === 'food' || menu.category === 'quick') && (menu.foodSubCategory ?? 'small_dish') === menuFilter;
    });
    return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const filteredMenus = getFilteredMenus(menus);
  const filteredIds = filteredMenus.map((menu) => menu.id);

  const removeMenu = async (menu: Menu) => {
    const ok = window.confirm(`「${menu.name}」を削除しますがよろしいですか？`);
    if (!ok) return;

    const res = await fetch('/api/admin/menus', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: menu.id })
    });

    if (res.ok) {
      setMenus((prev) => prev.filter((m) => m.id !== menu.id));
      showToast('削除しました');
      return;
    }

    const json = await res.json().catch(() => null);
    showToast(json?.error ?? '削除に失敗しました');
  };

  const setMenuById = (id: string, updater: (m: Menu) => Menu) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    setDirty(true);
  };

  const toggleRecommended = (menu: Menu) => {
    setMenuById(menu.id, (m) => ({ ...m, isRecommended: !m.isRecommended }));
  };

  const saveAllChanges = async () => {
    setSavingAll(true);
    const requests = menus.map(async (menu) => {
      const parsed = parseCategoryChoice(menuToCategoryChoice(menu));
      const res = await fetch('/api/admin/menus', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: menu.id,
          name: menu.name,
          name_kana: menu.nameKana,
          category: parsed.category,
          food_sub_category: parsed.food_sub_category,
          drink_sub_category: parsed.drink_sub_category,
          price: Number(menu.price),
          is_all_you_can: menu.isAllYouCan,
          is_recommended: menu.isRecommended,
          is_sold_out: menu.isSoldOut,
          image_url: menu.imageUrl ?? null,
          sort_order: Number(menu.sortOrder)
        })
      });
      return res.ok;
    });

    const result = await Promise.all(requests);
    setSavingAll(false);
    if (result.every(Boolean)) {
      setDirty(false);
      showToast('変更を保存しました');
      void load(store);
    } else {
      showToast('保存に失敗した項目があります');
    }
  };

  const changeTaxRate = async () => {
    const input = window.prompt('税率(%)を入力してください', String(taxRate));
    if (input === null) return;
    const next = toInt(input);
    if (next < 0 || next > 99) {
      window.alert('税率は0〜99で入力してください');
      return;
    }

    const res = await fetch('/api/admin/store', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_key: store, tax_rate: next })
    });

    if (res.ok) {
      setTaxRate(next);
      window.alert(`税率を${next}%に変更しました`);
    }
  };

  const controlStyle = { height: 42 };
  const baseColumns = '2fr 1.4fr 1fr 1.6fr';
  const priceWrapStyle = { position: 'relative' as const, height: 42 };
  const priceInputStyle = { ...controlStyle, paddingRight: 28 };
  const yenStyle = {
    position: 'absolute' as const,
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
    pointerEvents: 'none' as const
  };
  const filterItems: Array<{ key: typeof menuFilter; label: string; color: string }> = [
    { key: 'alcohol', label: 'アルコール', color: '#5a9ce6' },
    { key: 'soft_drink', label: 'ソフトドリンク', color: '#59b6ff' },
    { key: 'seafood', label: '海鮮', color: '#5bc0de' },
    { key: 'salad', label: 'サラダ', color: '#8ad36d' },
    { key: 'grill', label: '焼き物', color: '#f3a84b' },
    { key: 'fried', label: '揚げ物', color: '#f2cb4d' },
    { key: 'small_dish', label: '一品料理', color: '#8dcf50' },
    { key: 'rice', label: 'ご飯物', color: '#8b9ee8' },
    { key: 'dessert', label: 'デザート', color: '#f8a2c7' },
    { key: 'other', label: 'その他', color: '#b3b3b3' }
  ];

  return (
    <main
      style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        paddingBottom: 24
      }}
    >
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 40,
            background: '#fff',
            color: '#1f1f1b',
            padding: '10px 16px',
            borderRadius: 5,
            fontWeight: 700,
            border: '1px solid #ddd6c9',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            animation: 'toast-fade 1.5s ease-in-out'
          }}
        >
          {toast}
        </div>
      )}

      <h1>メニュー編集</h1>
      <p>
        <a href={`/admin?store=${encodeURIComponent(store)}`}>管理へ戻る</a>
      </p>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2>新規メニュー登録</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${baseColumns} 0.9fr 0.9fr 1.2fr`,
            columnGap: 10,
            rowGap: 8,
            width: '100%'
          }}
        >
          <input
            placeholder="商品名"
            style={controlStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="よみがな"
            style={controlStyle}
            value={form.name_kana}
            onChange={(e) => setForm({ ...form, name_kana: e.target.value })}
          />
          <div style={priceWrapStyle}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="金額"
              style={priceInputStyle}
              value={form.price ? formatDigits(form.price) : ''}
              onChange={(e) => setForm({ ...form, price: onlyDigits(e.target.value) })}
            />
            <span style={yenStyle}>円</span>
          </div>
          <select
            style={controlStyle}
            value={form.category_choice}
            onChange={(e) => setForm({ ...form, category_choice: e.target.value as CategoryChoice })}
          >
            <optgroup label="フード">
              <option value="food:seafood">海鮮</option>
              <option value="food:salad">サラダ</option>
              <option value="food:grill">焼き物</option>
              <option value="food:fried">揚げ物</option>
              <option value="food:small_dish">一品料理</option>
              <option value="food:rice">ご飯物</option>
            </optgroup>
            <optgroup label="その他カテゴリ">
              <option value="dessert">デザート</option>
              <option value="other">その他</option>
            </optgroup>
            <optgroup label="アルコール">
              <option value="drink:beer">アルコール &gt; ビール</option>
              <option value="drink:highball">アルコール &gt; ハイボール</option>
              <option value="drink:sour">アルコール &gt; サワー・酎ハイ</option>
              <option value="drink:cocktail">アルコール &gt; カクテル</option>
              <option value="drink:shochu">アルコール &gt; 焼酎</option>
              <option value="drink:sake">アルコール &gt; 日本酒</option>
              <option value="drink:wine">アルコール &gt; ワイン</option>
              <option value="drink:fruit_liquor">アルコール &gt; 梅酒・果実酒</option>
            </optgroup>
            <optgroup label="ソフトドリンク">
              <option value="drink:soft_drink">ソフトドリンク</option>
              <option value="drink:non_alcohol">ノンアルコール</option>
            </optgroup>
          </select>
          <button className="btn-primary" style={controlStyle} onClick={createMenu}>
            登録
          </button>
          <button
            className={form.is_all_you_can ? 'btn-primary' : 'btn-ghost'}
            style={form.is_all_you_can ? { ...controlStyle, background: '#1f5fd1', color: '#fff' } : controlStyle}
            onClick={() => setForm((prev) => ({ ...prev, is_all_you_can: !prev.is_all_you_can }))}
          >
            放題
          </button>
          <button className="btn-ghost" style={controlStyle} onClick={changeTaxRate}>
            税率変更 ({taxRate}%)
          </button>
        </div>
      </section>

      <section className="card">
        <div
          style={{
            position: 'sticky',
            top: 10,
            zIndex: 8,
            background: 'var(--paper)',
            paddingBottom: 10,
            marginBottom: 8
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14
            }}
          >
            <h2 style={{ margin: 0 }}>既存メニュー編集</h2>
            <button className="btn-primary" onClick={saveAllChanges} disabled={savingAll || !dirty}>
              {savingAll ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </div>

        <div
          style={{
            position: 'sticky',
            top: 98,
            zIndex: 7,
            background: '#f3f3f3',
            border: '1px solid #dedede',
            borderRadius: 5,
            display: 'grid',
            gridTemplateColumns: '148px 1fr',
            alignItems: 'stretch',
            marginBottom: 4
          }}
        >
          <div
            style={{
              color: '#5f5f5f',
              fontWeight: 700,
              fontSize: 15,
              display: 'grid',
              placeItems: 'center'
            }}
          >
            カテゴリー
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `48px 104px ${baseColumns} 0.8fr 0.8fr 0.8fr 0.9fr`,
              columnGap: 10,
              rowGap: 8,
              width: '100%',
              fontSize: 15,
              color: '#5f5f5f',
              fontWeight: 700,
              padding: '10px 8px'
            }}
          >
            <div style={{ textAlign: 'center' }}>並替え</div>
            <div style={{ textAlign: 'center' }}>画像</div>
            <div>商品名</div>
            <div>かな</div>
            <div>金額</div>
            <div>カテゴリ</div>
            <div style={{ textAlign: 'center' }}>放題</div>
            <div style={{ textAlign: 'center' }}>おすすめ</div>
            <div style={{ textAlign: 'center' }}>品切れ</div>
            <div style={{ textAlign: 'center' }}>削除</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '148px 1fr', gap: 0, alignItems: 'start' }}>
          <aside
            className="hide-scrollbar"
            style={{
              position: 'sticky',
              top: 152,
              display: 'grid',
              gap: 8,
              alignContent: 'start',
              paddingRight: 8
            }}
          >
            {filterItems.map((item) => (
              <button
                key={item.key}
                className="btn-ghost"
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 8px',
                  justifyContent: 'flex-start',
                  borderRadius: 5,
                  borderLeft: `4px solid ${item.color}`,
                  background: menuFilter === item.key ? '#fdf0dd' : '#fff',
                  color: menuFilter === item.key ? '#7a4a12' : '#6d665c',
                  fontWeight: menuFilter === item.key ? 700 : 500,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onClick={() => setMenuFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div
            style={{
              borderLeft: '1px solid #dedede'
            }}
          >
            {filteredMenus.map((menu) => (
              <div
                key={menu.id}
                draggable={false}
                onDragStart={() => {}}
                onDragEnd={() => {
                  setDraggingMenuId(null);
                  setDragOverMenuId(null);
                }}
                onDragOver={(e) => {
                  if (!canDragRows) return;
                  e.preventDefault();
                  if (dragOverMenuId !== menu.id) setDragOverMenuId(menu.id);
                }}
                onDrop={(e) => {
                  if (!canDragRows) return;
                  e.preventDefault();
                  void moveMenu(menu.id, filteredIds);
                  setDraggingMenuId(null);
                  setDragOverMenuId(null);
                }}
                style={{
                  borderBottom: '1px solid #eee',
                  padding: '4px 0',
                  cursor: 'default',
                  opacity: draggingMenuId === menu.id ? 0.55 : 1,
                  background: draggingMenuId === menu.id ? '#f7f3e7' : 'transparent',
                  touchAction: 'pan-y',
                  boxShadow: canDragRows && draggingMenuId && dragOverMenuId === menu.id ? 'inset 0 3px 0 #f08d17' : 'none'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `48px 104px ${baseColumns} 0.8fr 0.8fr 0.8fr 0.9fr`,
                    columnGap: 10,
                    rowGap: 8,
                    width: '100%'
                  }}
                >
                  <div
                    draggable={canDragRows}
                    onDragStart={() => canDragRows && setDraggingMenuId(menu.id)}
                    onDragEnd={() => {
                      setDraggingMenuId(null);
                      setDragOverMenuId(null);
                    }}
                    title={canDragRows ? 'ドラッグで並び替え' : '並び替えはPCで利用できます'}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      height: 42,
                      fontSize: 22,
                      color: '#8d877b',
                      cursor: canDragRows ? 'grab' : 'default',
                      userSelect: 'none'
                    }}
                  >
                    ☰
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center', height: 42 }}>
                    <label
                      htmlFor={`menu-image-${menu.id}`}
                      title="画像を変更"
                      style={{
                        width: 78,
                        height: 42,
                        borderRadius: 5,
                        border: '1px solid #ddd6c9',
                        background: '#f6f5f3',
                        overflow: 'hidden',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {menu.imageUrl ? (
                        <img src={menu.imageUrl} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#999', fontSize: 11 }}>画像選択</span>
                      )}
                    </label>
                    <input
                      id={`menu-image-${menu.id}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onClick={(e) => {
                        const input = e.currentTarget as HTMLInputElement;
                        input.value = '';
                      }}
                      onChange={(e) => onMenuImageChange(menu.id, e.target.files?.[0])}
                    />
                  </div>
                  <input
                    style={controlStyle}
                    value={menu.name}
                    onChange={(e) => setMenuById(menu.id, (m) => ({ ...m, name: e.target.value }))}
                  />
                  <input
                    style={controlStyle}
                    value={menu.nameKana}
                    onChange={(e) => setMenuById(menu.id, (m) => ({ ...m, nameKana: e.target.value }))}
                  />
                  <div style={priceWrapStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="金額"
                      style={priceInputStyle}
                      value={formatDigits(menu.price)}
                      onChange={(e) => setMenuById(menu.id, (m) => ({ ...m, price: toInt(e.target.value) }))}
                    />
                    <span style={yenStyle}>円</span>
                  </div>
                  <select
                    style={controlStyle}
                    value={menuToCategoryChoice(menu)}
                    onChange={(e) => {
                      const parsed = parseCategoryChoice(e.target.value as CategoryChoice);
                      setMenuById(menu.id, (m) => ({
                        ...m,
                        category: parsed.category,
                        foodSubCategory: parsed.food_sub_category,
                        drinkSubCategory: parsed.drink_sub_category
                      }));
                    }}
                  >
                    <optgroup label="フード">
                      <option value="food:seafood">海鮮</option>
                      <option value="food:salad">サラダ</option>
                      <option value="food:grill">焼き物</option>
                      <option value="food:fried">揚げ物</option>
                      <option value="food:small_dish">一品料理</option>
                      <option value="food:rice">ご飯物</option>
                    </optgroup>
                    <optgroup label="その他カテゴリ">
                      <option value="dessert">デザート</option>
                      <option value="other">その他</option>
                    </optgroup>
                    <optgroup label="アルコール">
                      <option value="drink:beer">アルコール &gt; ビール</option>
                      <option value="drink:highball">アルコール &gt; ハイボール</option>
                      <option value="drink:sour">アルコール &gt; サワー・酎ハイ</option>
                      <option value="drink:cocktail">アルコール &gt; カクテル</option>
                      <option value="drink:shochu">アルコール &gt; 焼酎</option>
                      <option value="drink:sake">アルコール &gt; 日本酒</option>
                      <option value="drink:wine">アルコール &gt; ワイン</option>
                      <option value="drink:fruit_liquor">アルコール &gt; 梅酒・果実酒</option>
                    </optgroup>
                    <optgroup label="ソフトドリンク">
                      <option value="drink:soft_drink">ソフトドリンク</option>
                      <option value="drink:non_alcohol">ノンアルコール</option>
                    </optgroup>
                  </select>
                  <div style={{ display: 'grid', placeItems: 'center', height: 42 }}>
                    <input
                      type="checkbox"
                      checked={menu.isAllYouCan}
                      onChange={() => setMenuById(menu.id, (m) => ({ ...m, isAllYouCan: !m.isAllYouCan }))}
                    />
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center', height: 42 }}>
                    <input
                      type="checkbox"
                      checked={menu.isRecommended}
                      onChange={() => toggleRecommended(menu)}
                    />
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center', height: 42 }}>
                    <input
                      type="checkbox"
                      checked={menu.isSoldOut}
                      onChange={() => setMenuById(menu.id, (m) => ({ ...m, isSoldOut: !m.isSoldOut }))}
                    />
                  </div>
                  <button className="btn-danger" style={controlStyle} onClick={() => removeMenu(menu)}>
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <style jsx global>{`
        body {
          overscroll-behavior-y: auto;
        }
      `}</style>
    </main>
  );
}
