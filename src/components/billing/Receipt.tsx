import { forwardRef } from 'react';

interface ReceiptProps {
  bill: any;
  settings: Record<string, string>;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ bill, settings }, ref) => {
  if (!bill) return <div ref={ref} />;

  const date = new Date(bill.created_at);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const divider = "========================================";
  const line = "----------------------------------------";

  const formatNum = (num: any) => {
    const val = Number(num) || 0;
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Helper to handle manual \n or real newlines
  const formatFooter = (text: string) => {
    if (!text) return 'THANK YOU! VISIT AGAIN';
    return text.replace(/\\n/g, '\n');
  };

  // Word-wrap: splits text at word boundaries, max maxLen chars per line
  const wrapText = (text: string, maxLen: number): string[] => {
    const words = text.toUpperCase().split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  };

  return (
    <div ref={ref} className="print-receipt receipt-width px-3 py-4 font-mono-receipt text-[12px] leading-[1.4] text-black bg-white" style={{ letterSpacing: '-0.02em' }}>
      {/* HEADER SECTION */}
      <div className="text-center">
        <h1 className="text-lg font-bold uppercase tracking-tight leading-tight mb-1">
          {settings.restaurant_name || 'AKF BURGERS'}
        </h1>
        <div className="px-1 text-[12px] space-y-0.5">
          <p className="whitespace-pre-wrap">{settings.address || 'Inqilab Road, Peshawar'}</p>
          <p className="font-bold border-y border-black border-dashed py-0.5 mt-1">
            {settings.phone1 ? `Ph: ${settings.phone1}` : ''}
            {settings.phone2 ? ` | ${settings.phone2}` : ''}
          </p>
        </div>
      </div>

      {/* BILL INFO */}
      <div className="mt-2 text-[10px]">
        <p className="border-t border-black pt-1"></p>
        <div className="flex justify-between font-bold">
          <span>Bill#: {bill.bill_number?.split('-').pop() || '000'}</span>
          <span className="uppercase">{bill.order_type}</span>
        </div>
        <div className="flex justify-between text-[11px] mt-0.5">
          <span>{dateStr} {timeStr}</span>
          {bill.customer_name && <span>{bill.customer_name}</span>}
        </div>
        <p className="border-t border-black border-dashed mt-1"></p>
      </div>

      {/* ITEMS TABLE */}
      <div className="mt-2 text-[12px]">
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: 'inherit', fontSize: 'inherit' }}>
          <colgroup>
            <col style={{ width: '22ch' }} />
            <col style={{ width: '4ch' }} />
            <col style={{ width: '8ch' }} />
            <col style={{ width: '6ch' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid black' }}>
              <th className="text-left font-bold pb-0.5">ITEM</th>
              <th className="text-right font-bold pb-0.5">QTY</th>
              <th className="text-right font-bold pb-0.5">RATE</th>
              <th className="text-right font-bold pb-0.5">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.flatMap((item: any, idx: number) => {
              const nameLines = wrapText(item.name, 22);
              const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
              return nameLines.map((line: string, lineIdx: number) => {
                const isLastLine = lineIdx === nameLines.length - 1;
                return (
                  <tr key={`${idx}-${lineIdx}`} className="leading-tight">
                    <td className="align-top">{line}</td>
                    <td className="text-right tabular-nums">{isLastLine ? item.quantity : ''}</td>
                    <td className="text-right tabular-nums">{isLastLine ? formatNum(unitPrice) : ''}</td>
                    <td className="text-right tabular-nums font-medium">{isLastLine ? formatNum(item.totalPrice) : ''}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
        <div className="flex justify-between mt-1 border-t border-black border-dashed pt-0.5 text-[11px]">
          <span>Items: {bill.items.length}</span>
          <span>Qty: {bill.items.reduce((s: number, i: any) => s + i.quantity, 0)}</span>
        </div>
      </div>

      {/* TOTALS SECTION */}
      <div className="mt-3 text-[12px] space-y-1">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.subtotal)}</span>
        </div>
        {Number(bill.discount) > 0 && (
          <div className="flex justify-between">
            <span>DISCOUNT:</span>
            <span className="tabular-nums">-Rs. {formatNum(bill.discount)}</span>
          </div>
        )}
        {Number(bill.tax) > 0 && (
          <div className="flex justify-between">
            <span>TAX/GST ({settings.tax_percentage}%):</span>
            <span className="tabular-nums">Rs. {formatNum(bill.tax)}</span>
          </div>
        )}
        <p className="border-t border-black"></p>
        <div className="flex justify-between font-bold text-[13px]">
          <span>NET TOTAL:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.total)}</span>
        </div>
        <p className="border-t border-black"></p>
      </div>

      {/* PAYMENT INFO */}
      <div className="mt-2 text-[12px] space-y-1">
        <div className="flex justify-between">
          <span>PAYMENT:</span>
          <span className="font-bold uppercase">{bill.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>PAID:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.amount_paid)}</span>
        </div>
        {Number(bill.change_returned) > 0 && (
          <div className="flex justify-between font-bold">
            <span>CHANGE:</span>
            <span className="tabular-nums">Rs. {formatNum(bill.change_returned)}</span>
          </div>
        )}
      </div>

      {/* FOOTER SECTION */}
      <div className="text-center mt-4 pt-2 border-t border-black">
        <p className="font-bold text-[11px] whitespace-pre-line leading-tight">
          {formatFooter(settings.receipt_footer)}
        </p>
        <p className="text-[8px] mt-2 opacity-50">MAK.dev</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;

