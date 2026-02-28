# qr-order-mvp

Next.js(TypeScript) + Prisma + PostgreSQL で構成した飲食店向け QR オーダーMVPです。

## 1. セットアップ

```bash
npm install
cp .env.example .env
```

`.env` の例:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB"
APP_BASE_URL="http://localhost:3000"
STORE_KEY_SALT="optional-salt"
```

DB反映:

```bash
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

起動:

```bash
npm run dev
```

## 2. URL

- 客: `/order?store=demo-store&table=3`
- 厨房: `/kitchen?store=demo-store`
- 管理: `/admin?store=demo-store`
- メニュー編集: `/admin/menu?store=demo-store`
- レポート入口: `/admin/reports?store=demo-store`
- 日次レポート: `/admin/reports/daily?store=demo-store`
- 期間レポート: `/admin/reports/range?store=demo-store`
- 年次レポート: `/admin/reports/yearly?store=demo-store`

## 3. 実装ポイント

- 注文送信は `orders` + `order_items` へ保存（送信1回=1注文）
- 売り切れは客画面でグレーアウトし、送信APIでも防御
- 厨房は 2.5 秒 polling
- 新規注文は赤帯 + 1回音、呼び出しは黄帯 + ループ音
- 新規注文通知を優先（呼び出し音再生中でも新規注文を優先表示）
- 印刷は厨房ブラウザから `WebPrntAdapter` を使い Star WebPRNT 実行
- 印刷結果は `orders.print_status` / `orders.print_error_message` に反映
- 管理画面で直近10件の再印刷（`print_status = pending` に戻して厨房で再実行）

## 4. WebPRNT 設定メモ

`window.print` は使っていません。`lib/print/printAdapter.ts` を利用します。

前提:
- 厨房タブレットから LAN プリンターへ到達できること
- Star WebPRNT SDK がページ上で利用可能であること
  - `window.StarWebPrintBuilder`
  - `window.StarWebPrintTrader`

厨房画面の `Star WebPRNT URL` へ例を入力:

- `http://<printer-ip>:8001/StarWebPRNT/SendMessage`

通知音ファイル:
- `public/order.mp3`
- `public/call.mp3`

(必要な音声ファイルを配置してください)

## 5. Render デプロイ

### Web Service
- Runtime: Node
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Start Command: `npm run prisma:migrate && npm run start`
- Env:
  - `DATABASE_URL`
  - `APP_BASE_URL` (任意)
  - `STORE_KEY_SALT` (任意)

### PostgreSQL
- Render PostgreSQL を作成し、`DATABASE_URL` を Web Service に設定

### Cron Job (32日削除)
- Command: `npm install && npm run prisma:generate && npm run cron:cleanup`
- Schedule: 毎日1回 (例: `0 3 * * *`)

## 6. API

- `POST /api/order/create`
- `GET /api/order/context?store=...`
- `GET /api/kitchen/poll?store=...&since=...`
- `POST /api/call/create`
- `POST /api/call/ack`
- `GET /api/admin/orders?store=...`
- `POST /api/admin/reprint`
- `GET/POST/PUT/DELETE /api/admin/menus`
- `POST /api/print/report`
- `GET /api/reports/daily?store=...&date=YYYY-MM-DD`
- `GET /api/reports/range?store=...&start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/reports/yearly?store=...&year=YYYY`

## 7. 売上レポートの確認手順

1) 管理画面から開く

- 入口: `/admin/reports?store=demo-store`
- 日次: `/admin/reports/daily?store=demo-store`
- 期間: `/admin/reports/range?store=demo-store`
- 年次: `/admin/reports/yearly?store=demo-store`

2) APIを直接確認する（curl例）

```bash
# 日次（date省略時は昨日JST）
curl "http://localhost:3000/api/reports/daily?store=demo-store&date=2026-02-27"

# 期間
curl "http://localhost:3000/api/reports/range?store=demo-store&start=2026-02-01&end=2026-02-27"

# 年次
curl "http://localhost:3000/api/reports/yearly?store=demo-store&year=2026"
```

3) 集計の仕様

- 日付集計は `Asia/Tokyo (JST)` 基準
- 売上は `order_items.price_snapshot * qty` の合計
- 客数は `orders.table_no` のユニーク数（0件時は注文件数を代替）
