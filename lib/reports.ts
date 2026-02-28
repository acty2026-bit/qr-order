import { prisma } from '@/lib/prisma';

const JST_TIMEZONE = 'Asia/Tokyo';

type MetricRow = { sales: bigint | number | null; orders: bigint | number | null; customers: bigint | number | null };
type TopRow = { name: string; qty: bigint | number | null; sales: bigint | number | null };
type HourRow = { hour: number; sales: bigint | number | null; orders: bigint | number | null };
type DailyTrendRow = { date: string; sales: bigint | number | null; orders: bigint | number | null; customers: bigint | number | null };
type MonthlyTrendRow = { month: string; sales: bigint | number | null; orders: bigint | number | null; customers: bigint | number | null };

type BaseMetrics = {
  sales: number;
  orders: number;
  customers: number;
  customerUnit: 'table' | 'orders';
  avgPerCustomer: number;
  avgPerOrder: number;
};

export type ReportTopItem = { name: string; qty: number; sales: number };
export type ReportHourItem = { hour: number; sales: number; orders: number };
export type ReportDailyTrendItem = { date: string; sales: number; orders: number; customers: number };
export type ReportMonthlyTrendItem = { month: string; sales: number; orders: number; customers: number };

export type DailyReport = {
  date: string;
  timezone: 'Asia/Tokyo';
  metrics: BaseMetrics;
  topProducts: ReportTopItem[];
  hourlySales: ReportHourItem[];
};

export type RangeReport = {
  start: string;
  end: string;
  timezone: 'Asia/Tokyo';
  metrics: BaseMetrics;
  dailyTrend: ReportDailyTrendItem[];
  topProducts: ReportTopItem[];
  leastProducts: ReportTopItem[];
  hourlySales: ReportHourItem[];
};

export type YearlyReport = {
  year: number;
  timezone: 'Asia/Tokyo';
  annualSales: number;
  monthlySales: Array<{ month: string; sales: number }>;
  monthlyOrders: Array<{ month: string; orders: number }>;
  monthlyCustomers: Array<{ month: string; customers: number }>;
};

function toNumber(v: bigint | number | null | undefined) {
  if (typeof v === 'bigint') return Number(v);
  return Number(v ?? 0);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function div(base: number, d: number) {
  if (!d) return 0;
  return round2(base / d);
}

function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function getTodayYmdJst(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export function getYesterdayYmdJst(now = new Date()) {
  const y = new Date(now);
  y.setUTCDate(y.getUTCDate() - 1);
  return getTodayYmdJst(y);
}

export function getCurrentYearJst(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: JST_TIMEZONE,
      year: 'numeric'
    }).format(now)
  );
}

export function getJstUtcRangeFromYmd(ymd: string) {
  const p = parseYmd(ymd);
  if (!p) throw new Error('invalid date format (YYYY-MM-DD)');
  const utcStart = new Date(Date.UTC(p.year, p.month - 1, p.day, -9, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, -9, 0, 0, 0));
  return { utcStart, utcEnd };
}

export function getJstUtcRangeFromYmdRange(start: string, end: string) {
  const s = parseYmd(start);
  const e = parseYmd(end);
  if (!s || !e) throw new Error('invalid date format (YYYY-MM-DD)');
  const utcStart = new Date(Date.UTC(s.year, s.month - 1, s.day, -9, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(e.year, e.month - 1, e.day + 1, -9, 0, 0, 0));
  if (utcStart >= utcEnd) throw new Error('start must be <= end');
  return { utcStart, utcEnd };
}

export function getJstUtcYearRange(year: number) {
  const utcStart = new Date(Date.UTC(year, 0, 1, -9, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(year + 1, 0, 1, -9, 0, 0, 0));
  return { utcStart, utcEnd };
}

async function fetchBaseMetrics(storeId: string, utcStart: Date, utcEnd: Date): Promise<BaseMetrics> {
  const rows = await prisma.$queryRaw<MetricRow[]>`
    SELECT
      COALESCE(SUM(oi.qty * oi.price_snapshot), 0) AS sales,
      COUNT(DISTINCT o.id) AS orders,
      COUNT(DISTINCT o.table_no) AS customers
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
  `;

  const row = rows[0] ?? { sales: 0, orders: 0, customers: 0 };
  const sales = toNumber(row.sales);
  const orders = toNumber(row.orders);
  const customersRaw = toNumber(row.customers);
  const customers = customersRaw > 0 ? customersRaw : orders;
  const customerUnit: 'table' | 'orders' = customersRaw > 0 ? 'table' : 'orders';

  return {
    sales,
    orders,
    customers,
    customerUnit,
    avgPerCustomer: div(sales, customers),
    avgPerOrder: div(sales, orders)
  };
}

async function fetchTopProducts(storeId: string, utcStart: Date, utcEnd: Date, limit: number) {
  const rows = await prisma.$queryRaw<TopRow[]>`
    SELECT
      oi.name_snapshot AS name,
      SUM(oi.qty) AS qty,
      COALESCE(SUM(oi.qty * oi.price_snapshot), 0) AS sales
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
    GROUP BY oi.name_snapshot
    ORDER BY sales DESC, qty DESC, oi.name_snapshot ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    name: r.name,
    qty: toNumber(r.qty),
    sales: toNumber(r.sales)
  }));
}

async function fetchHourlySales(storeId: string, utcStart: Date, utcEnd: Date): Promise<ReportHourItem[]> {
  const rows = await prisma.$queryRaw<HourRow[]>`
    SELECT
      EXTRACT(HOUR FROM timezone(${JST_TIMEZONE}, o.created_at))::int AS hour,
      COALESCE(SUM(oi.qty * oi.price_snapshot), 0) AS sales,
      COUNT(DISTINCT o.id) AS orders
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  const map = new Map(rows.map((r) => [Number(r.hour), { sales: toNumber(r.sales), orders: toNumber(r.orders) }]));
  const result: ReportHourItem[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const row = map.get(hour);
    result.push({
      hour,
      sales: row?.sales ?? 0,
      orders: row?.orders ?? 0
    });
  }
  return result;
}

async function fetchDailyTrend(storeId: string, utcStart: Date, utcEnd: Date): Promise<ReportDailyTrendItem[]> {
  const rows = await prisma.$queryRaw<DailyTrendRow[]>`
    SELECT
      to_char((timezone(${JST_TIMEZONE}, o.created_at))::date, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(oi.qty * oi.price_snapshot), 0) AS sales,
      COUNT(DISTINCT o.id) AS orders,
      COUNT(DISTINCT o.table_no) AS customers
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
    GROUP BY date
    ORDER BY date ASC
  `;

  const map = new Map(rows.map((r) => [r.date, { sales: toNumber(r.sales), orders: toNumber(r.orders), customers: toNumber(r.customers) }]));

  const days: ReportDailyTrendItem[] = [];
  const cursor = new Date(utcStart);
  while (cursor < utcEnd) {
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: JST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(cursor);
    const row = map.get(ymd);
    days.push({
      date: ymd,
      sales: row?.sales ?? 0,
      orders: row?.orders ?? 0,
      customers: row?.customers ?? 0
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

async function fetchLeastProducts(storeId: string, utcStart: Date, utcEnd: Date, limit: number): Promise<ReportTopItem[]> {
  const rows = await prisma.$queryRaw<TopRow[]>`
    SELECT
      m.name AS name,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty ELSE 0 END), 0) AS qty,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty * oi.price_snapshot ELSE 0 END), 0) AS sales
    FROM menus m
    LEFT JOIN order_items oi ON oi.menu_id = m.id
    LEFT JOIN orders o ON o.id = oi.order_id
      AND o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
    WHERE m.store_id = ${storeId}
      AND m.deleted_at IS NULL
    GROUP BY m.id, m.name
    ORDER BY qty ASC, sales ASC, m.name ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    name: r.name,
    qty: toNumber(r.qty),
    sales: toNumber(r.sales)
  }));
}

async function fetchMonthlyTrend(storeId: string, utcStart: Date, utcEnd: Date): Promise<ReportMonthlyTrendItem[]> {
  const rows = await prisma.$queryRaw<MonthlyTrendRow[]>`
    SELECT
      to_char(date_trunc('month', timezone(${JST_TIMEZONE}, o.created_at)), 'YYYY-MM') AS month,
      COALESCE(SUM(oi.qty * oi.price_snapshot), 0) AS sales,
      COUNT(DISTINCT o.id) AS orders,
      COUNT(DISTINCT o.table_no) AS customers
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${utcStart}
      AND o.created_at < ${utcEnd}
    GROUP BY month
    ORDER BY month ASC
  `;

  return rows.map((r) => ({
    month: r.month,
    sales: toNumber(r.sales),
    orders: toNumber(r.orders),
    customers: toNumber(r.customers)
  }));
}

export async function buildDailyReport(storeId: string, dateYmd: string): Promise<DailyReport> {
  const { utcStart, utcEnd } = getJstUtcRangeFromYmd(dateYmd);
  const [metrics, topProducts, hourlySales] = await Promise.all([
    fetchBaseMetrics(storeId, utcStart, utcEnd),
    fetchTopProducts(storeId, utcStart, utcEnd, 5),
    fetchHourlySales(storeId, utcStart, utcEnd)
  ]);

  return {
    date: dateYmd,
    timezone: 'Asia/Tokyo',
    metrics,
    topProducts,
    hourlySales
  };
}

export async function buildRangeReport(storeId: string, startYmd: string, endYmd: string): Promise<RangeReport> {
  const { utcStart, utcEnd } = getJstUtcRangeFromYmdRange(startYmd, endYmd);
  const [metrics, dailyTrend, topProducts, leastProducts, hourlySales] = await Promise.all([
    fetchBaseMetrics(storeId, utcStart, utcEnd),
    fetchDailyTrend(storeId, utcStart, utcEnd),
    fetchTopProducts(storeId, utcStart, utcEnd, 10),
    fetchLeastProducts(storeId, utcStart, utcEnd, 10),
    fetchHourlySales(storeId, utcStart, utcEnd)
  ]);

  return {
    start: startYmd,
    end: endYmd,
    timezone: 'Asia/Tokyo',
    metrics,
    dailyTrend,
    topProducts,
    leastProducts,
    hourlySales
  };
}

export async function buildYearlyReport(storeId: string, year: number): Promise<YearlyReport> {
  const { utcStart, utcEnd } = getJstUtcYearRange(year);
  const rows = await fetchMonthlyTrend(storeId, utcStart, utcEnd);
  const map = new Map(rows.map((r) => [r.month, r]));

  const monthlySales: Array<{ month: string; sales: number }> = [];
  const monthlyOrders: Array<{ month: string; orders: number }> = [];
  const monthlyCustomers: Array<{ month: string; customers: number }> = [];

  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const row = map.get(key);
    monthlySales.push({ month: key, sales: row?.sales ?? 0 });
    monthlyOrders.push({ month: key, orders: row?.orders ?? 0 });
    monthlyCustomers.push({ month: key, customers: row?.customers ?? 0 });
  }

  const annualSales = monthlySales.reduce((sum, row) => sum + row.sales, 0);

  return {
    year,
    timezone: 'Asia/Tokyo',
    annualSales,
    monthlySales,
    monthlyOrders,
    monthlyCustomers
  };
}

export function parseYear(input: string | null, fallback: number) {
  if (!input) return fallback;
  const n = Number(input);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error('invalid year');
  return n;
}

export function ensureStoreParam(storeKey: string | null) {
  if (!storeKey) throw new Error('store is required');
  return storeKey;
}
