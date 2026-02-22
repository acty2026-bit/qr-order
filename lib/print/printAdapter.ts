export type PrintLineItem = {
  name: string;
  qty: number;
};

export type PrintPayload = {
  orderId: string;
  storeName?: string;
  tableNo: number;
  orderedAt: string;
  items: PrintLineItem[];
};

declare global {
  interface Window {
    StarWebPrintBuilder?: new () => {
      createInitializationElement: () => string;
      createTextElement: (value: string) => string;
      createCutPaperElement: (type: string) => string;
    };
    StarWebPrintTrader?: new (options: { url: string }) => {
      onReceive?: (response: { traderSuccess: boolean; status: string }) => void;
      sendMessage: (message: { request: string; timeout?: number }) => void;
    };
  }
}

export class WebPrntAdapter {
  constructor(private readonly printerUrl: string) {}

  printOrder(payload: PrintPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.StarWebPrintBuilder || !window.StarWebPrintTrader) {
        reject(new Error('Star WebPRNT SDK が読み込まれていません。'));
        return;
      }

      const builder = new window.StarWebPrintBuilder();
      let request = builder.createInitializationElement();
      request += builder.createTextElement((payload.storeName ?? '店舗') + '\n');
      request += builder.createTextElement(`テーブル: ${payload.tableNo}\n`);
      request += builder.createTextElement(`注文時刻: ${payload.orderedAt}\n`);
      request += builder.createTextElement('------------------------------\n');

      for (const item of payload.items) {
        request += builder.createTextElement(`${item.name} x ${item.qty}\n`);
      }

      request += builder.createTextElement('------------------------------\n');
      request += builder.createTextElement(`orderId: ${payload.orderId}\n\n\n`);
      request += builder.createCutPaperElement('partial');

      const trader = new window.StarWebPrintTrader({ url: this.printerUrl });
      trader.onReceive = (res) => {
        if (res.traderSuccess) {
          resolve();
        } else {
          reject(new Error(`印刷失敗: ${res.status}`));
        }
      };

      try {
        trader.sendMessage({ request, timeout: 10000 });
      } catch (e) {
        reject(e instanceof Error ? e : new Error('印刷送信に失敗しました。'));
      }
    });
  }
}
