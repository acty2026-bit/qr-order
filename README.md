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
- ランキング: `/admin/ranking?store=demo-store`

## 3. 実装ポイント

- 注文送信は `orders` + `order_items` へ保存（送信1回=1注文）
- 売り切れは客画面でグレーアウトし、送信APIでも防御
- 厨房は 2.5 秒 polling
- 新規注文は赤帯 + 1回音、呼び出しは黄帯 + ループ音
- 新規注文通知を優先（呼び出し音再生中でも新規注文を優先表示）
- 印刷は厨房ブラウザから `WebPrntAdapter` を使い Star WebPRNT 実行
- 印刷結果は `orders.print_status` / `orders.print_error_message` に反映
- 管理画面で直近10件の再印刷（`print_status = pending` に戻して厨房で再実行）
- ランキングは JST の「今日」でカテゴリ別TOP

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
- `GET /api/admin/ranking?store=...`
- `POST /api/print/report`
