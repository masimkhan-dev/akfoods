import { forwardRef } from 'react';

interface ReceiptProps {
  bill: any;
  settings: Record<string, string>;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ bill, settings }, ref) => {
  console.log("Rendering Receipt Component - Ref Attached:", !!ref, "Bill Available:", !!bill);

  if (!bill) {
    return (
      <div ref={ref} className="print-container-hidden" style={{ display: 'none' }}>
        {/* Placeholder to keep ref valid while not printing */}
      </div>
    );
  }

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

  const formatNum = (num: any) => {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatFooter = (text: string) => {
    if (!text) return 'THANK YOU FOR YOUR ORDER!';
    // Only use first line of footer — keeps it clean
    const firstLine = text.replace(/\\n/g, '\n').split('\n')[0];
    return firstLine || 'THANK YOU FOR YOUR ORDER!';
  };

  // Word-wrap at word boundaries, max maxLen chars per line
  const wrapText = (text: string, maxLen: number): string[] => {
    if (!text) return [''];
    try {
      const words = String(text).toUpperCase().split(/\s+/);
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        if (!word) continue;
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
    } catch (e) {
      console.error("wrapText Error:", e);
      return [String(text).substring(0, maxLen)];
    }
  };

  const subtotal = Number(bill.subtotal) || 0;
  const total = Number(bill.total) || 0;
  const tax = Number(bill.tax) || 0;
  const discount = Number(bill.discount) || 0;

  // Since delivery charges are mathematically included in total but not saved as a separate column or item
  const deliveryCharge = Math.round(total - subtotal - tax + discount);
  const standardItems = bill.items.filter((i: any) => (i.name || i.item_name) !== 'Delivery Charges');

  const totalQty = standardItems.reduce((s: number, i: any) => s + i.quantity, 0);

  return (
    <div
      ref={ref}
      className="print-receipt receipt-width px-3 py-4 font-mono-receipt text-[12px] leading-[1.5] text-black bg-white"
      style={{ fontFamily: 'monospace' }}
    >
      {/* ── HEADER ── */}

      <div className="text-center py-2">
        <h1 className="text-[16px] font-bold uppercase tracking-tight leading-tight">
          {settings.restaurant_name || 'AKF FOODS'}
        </h1>
        <p className="text-[11px] mt-1 whitespace-pre-wrap leading-snug">
          {settings.address || 'Inqilab Road, Peshawar'}
        </p>
        {(settings.phone1 || settings.phone2) && (
          <p className="text-[11px] font-semibold mt-1">
            Ph: {settings.phone1}{settings.phone2 ? ` | ${settings.phone2}` : ''}
          </p>
        )}
      </div>


      {/* ── BILL INFO ── */}
      <div className="mt-3 mb-3 text-[12px]">
        <div className="flex justify-between">
          <span>Bill No: <strong>{bill.bill_number?.split('-').pop() || '000'}</strong></span>
          <span className="font-bold uppercase">{bill.order_type}</span>
        </div>
        <div className="flex justify-between mt-0.5 text-[11px]">
          <span>Date: {dateStr}</span>
          <span>{timeStr}</span>
        </div>
        {bill.customer_name && (
          <div className="mt-0.5 text-[11px]">
            <span>Customer: {bill.customer_name}</span>
          </div>
        )}
        {bill.customer_phone && (
          <div className="mt-0.5 text-[11px]">
            <span>Phone: {bill.customer_phone}</span>
          </div>
        )}
      </div>

      {/* ── ITEMS TABLE ── */}
      <p className="border-t border-black"></p>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: 'inherit', fontSize: 'inherit' }}>
        <colgroup>
          <col style={{ width: '22ch' }} />
          <col style={{ width: '4ch' }} />
          <col style={{ width: '8ch' }} />
          <col style={{ width: '8ch' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid black' }}>
            <th className="text-left font-bold py-1">ITEM</th>
            <th className="text-right font-bold py-1">QTY</th>
            <th className="text-right font-bold py-1">RATE</th>
            <th className="text-right font-bold py-1">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {standardItems.flatMap((item: any, idx: number) => {
            const nameLines = wrapText(item.name || item.item_name, 22);
            const basePrice = item.unitPrice ?? item.unit_price ?? 0;
            const extra = item.extraCharge ?? 0;
            const finalRate = basePrice + extra;
            return nameLines.map((line: string, lineIdx: number) => {
              const isLastLine = lineIdx === nameLines.length - 1;
              return (
                <tr key={`${idx}-${lineIdx}`}>
                  <td className="align-top py-0.5">{line}</td>
                  <td className="text-right tabular-nums py-0.5">{isLastLine ? item.quantity : ''}</td>
                  <td className="text-right tabular-nums py-0.5">{isLastLine ? formatNum(finalRate) : ''}</td>
                  <td className="text-right tabular-nums py-0.5">{isLastLine ? formatNum(item.totalPrice) : ''}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>


      {/* ── ITEMS SUMMARY ── */}
      <div className="flex justify-between text-[11px] py-1">
        <span>Items: {standardItems.length}</span>
        <span>Qty: {totalQty}</span>
      </div>

      {/* ── TOTALS ── */}
      <div className="mt-1 text-[12px]">
        <div className="flex justify-between py-0.5">
          <span>Subtotal:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.subtotal)}</span>
        </div>
        {Number(bill.discount) > 0 && (
          <div className="flex justify-between py-0.5">
            <span>Discount:</span>
            <span className="tabular-nums">-Rs. {formatNum(bill.discount)}</span>
          </div>
        )}
        {Number(bill.tax) > 0 && (
          <div className="flex justify-between py-0.5">
            <span>Tax ({settings.tax_percentage}%):</span>
            <span className="tabular-nums">Rs. {formatNum(bill.tax)}</span>
          </div>
        )}
        {Number(deliveryCharge) > 0 && (
          <div className="flex justify-between py-0.5">
            <span>Delivery:</span>
            <span className="tabular-nums">Rs. {formatNum(deliveryCharge)}</span>
          </div>
        )}
        <p className="border-t border-black mt-1"></p>
        <div className="flex justify-between font-bold text-[14px] py-1">
          <span>NET TOTAL:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.total)}</span>
        </div>
      </div>

      {/* ── PAYMENT ── */}
      <div className="mt-3 text-[12px] space-y-0.5">
        <div className="flex justify-between">
          <span>Payment:</span>
          <span className="font-bold uppercase">{bill.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span className="tabular-nums">Rs. {formatNum(bill.amount_paid)}</span>
        </div>
        {Number(bill.change_returned) > 0 && (
          <div className="flex justify-between font-bold">
            <span>Change:</span>
            <span className="tabular-nums">Rs. {formatNum(bill.change_returned)}</span>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <p className="border-t-2 border-black mt-4"></p>
      <div className="text-center py-2">
        <p className="font-bold text-[13px] leading-snug">
          {formatFooter(settings.receipt_footer)}
        </p>
      </div>

    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;
