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
  const [savingAll, setSavingAll] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 1500);
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
  const categoryFilterButtonStyle = { width: '100%', height: 40, padding: '0 8px' };
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

  return (
    <main>
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
            borderRadius: 12,
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              columnGap: 8,
              rowGap: 8,
              marginBottom: 25
            }}
          >
            <button
              className={menuFilter === 'alcohol' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('alcohol')}
            >
              アルコール
            </button>
            <button
              className={menuFilter === 'soft_drink' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('soft_drink')}
            >
              ソフトドリンク
            </button>
            <button
              className={menuFilter === 'seafood' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('seafood')}
            >
              海鮮
            </button>
            <button
              className={menuFilter === 'salad' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('salad')}
            >
              サラダ
            </button>
            <button
              className={menuFilter === 'grill' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('grill')}
            >
              焼き物
            </button>
            <button
              className={menuFilter === 'fried' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('fried')}
            >
              揚げ物
            </button>
            <button
              className={menuFilter === 'small_dish' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('small_dish')}
            >
              一品料理
            </button>
            <button
              className={menuFilter === 'rice' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('rice')}
            >
              ご飯物
            </button>
            <button
              className={menuFilter === 'dessert' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('dessert')}
            >
              デザート
            </button>
            <button
              className={menuFilter === 'other' ? 'btn-primary' : 'btn-ghost'}
              style={categoryFilterButtonStyle}
              onClick={() => setMenuFilter('other')}
            >
              その他
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `48px ${baseColumns} 0.8fr 0.8fr 0.8fr 0.9fr`,
              columnGap: 10,
              rowGap: 8,
              width: '100%',
              fontSize: 15,
              color: '#6d665c',
              marginBottom: 4,
              fontWeight: 700,
              paddingBottom: 8,
              borderBottom: '1px solid #ddd6c9'
            }}
          >
            <div style={{ textAlign: 'center' }}>並替え</div>
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

        {filteredMenus.map((menu) => (
          <div
            key={menu.id}
            draggable
            onDragStart={() => setDraggingMenuId(menu.id)}
            onDragEnd={() => setDraggingMenuId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void moveMenu(menu.id, filteredIds);
              setDraggingMenuId(null);
            }}
            style={{
              borderBottom: '1px solid #eee',
              padding: '4px 0',
              cursor: 'grab',
              opacity: draggingMenuId === menu.id ? 0.55 : 1,
              background: draggingMenuId === menu.id ? '#f7f3e7' : 'transparent'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `48px ${baseColumns} 0.8fr 0.8fr 0.8fr 0.9fr`,
                columnGap: 10,
                rowGap: 8,
                width: '100%'
              }}
            >
              <div style={{ display: 'grid', placeItems: 'center', height: 42, fontSize: 22, color: '#8d877b' }}>☰</div>
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
      </section>
    </main>
  );
}
