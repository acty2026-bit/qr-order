import { WebPrntAdapter } from './printAdapter';

export async function samplePrintOrder() {
  const adapter = new WebPrntAdapter('http://192.168.0.100:8001/StarWebPRNT/SendMessage');

  await adapter.printOrder({
    orderId: 'sample-order-id',
    storeName: 'サンプル店舗',
    tableNo: 3,
    orderedAt: '02/20 19:30',
    items: [
      { name: '唐揚げ', qty: 2 },
      { name: '生ビール', qty: 1 }
    ]
  });
}
