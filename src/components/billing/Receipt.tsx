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

  return (
    <div ref={ref} className="print-receipt receipt-width p-5 font-mono-receipt text-[11px] leading-[1.3] text-black bg-white">
      {/* HEADER SECTION */}
      <div className="text-center">
        <h1 className="text-lg font-bold uppercase tracking-tight leading-tight mb-1">
          {settings.restaurant_name || 'AKF BURGERS'}
        </h1>
        <div className="px-1 text-[10px] space-y-0.5">
          <p className="whitespace-pre-wrap">{settings.address || 'Inqilab Road, Peshawar'}</p>
          <p className="font-bold border-y border-black border-dashed py-0.5 mt-1">
            {settings.phone1 ? `Ph: ${settings.phone1}` : ''}
            {settings.phone2 ? ` | ${settings.phone2}` : ''}
          </p>
        </div>
      </div>

      {/* BILL INFO */}
      <div className="mt-3 py-1 border-b border-black flex justify-between items-end">
        <div>
          <p className="text-[14px] font-bold">#{bill.bill_number?.split('-').pop() || '000'}</p>
          <p className="text-[9px] text-black">{bill.bill_number}</p>
        </div>
        <div className="text-right">
          <p className="font-bold uppercase tracking-widest text-[12px]">{bill.order_type}</p>
          <p className="text-[9px]">{dateStr} {timeStr}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="mt-2 text-[11px]">
        <div className="flex justify-between font-bold border-b border-black pb-0.5 mb-1">
          <span className="w-[55%]">DESCRIPTION</span>
          <span className="w-[15%] text-center">QTY</span>
          <span className="w-[30%] text-right">TOTAL</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {bill.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', lineHeight: '1.2', fontWeight: 'bold' }}>
              <div style={{ width: '55%', paddingRight: '4px', textTransform: 'uppercase', fontSize: '10px' }}>
                {item.name}
              </div>
              <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
              <div style={{ width: '30%', textAlign: 'right' }}>{formatNum(item.totalPrice)}</div>
            </div>
          ))}
        </div>
        <p className="mt-1 border-t border-black border-dashed"></p>
      </div>

      {/* TOTALS SECTION */}
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>SUBTOTAL:</span>
          <span>{formatNum(bill.subtotal)}</span>
        </div>
        {Number(bill.discount) > 0 && (
          <div className="flex justify-between font-medium">
            <span>DISCOUNT:</span>
            <span className="tabular-nums">-{formatNum(bill.discount)}</span>
          </div>
        )}
        {Number(bill.tax) > 0 && (
          <div className="flex justify-between">
            <span>TAX/GST ({settings.tax_percentage}%):</span>
            <span className="tabular-nums">{formatNum(bill.tax)}</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-black text-white px-1 py-1 mt-1 font-bold text-[14px]">
          <span>NET TOTAL:</span>
          <span>Rs. {formatNum(bill.total)}</span>
        </div>
      </div>

      {/* PAYMENT INFO */}
      <div className="mt-2 flex justify-between text-[10px] italic">
        <span>MODE: {bill.payment_method?.toUpperCase()}</span>
        <span>PAID: {formatNum(bill.amount_paid)}</span>
      </div>
      {Number(bill.change_returned) > 0 && (
        <div className="flex justify-between font-bold border-t border-black border-dotted pt-0.5 mt-0.5">
          <span>CHANGE:</span>
          <span>Rs. {formatNum(bill.change_returned)}</span>
        </div>
      )}

      {/* FOOTER SECTION */}
      <div className="text-center mt-6 pt-2 border-t border-black space-y-1">
        <p className="font-bold text-[11px] whitespace-pre-line leading-tight">
          {formatFooter(settings.receipt_footer)}
        </p>
        <div className="mt-2 text-[8px] tracking-tighter">
          <p>POWERED BY AKF POS SYSTEM</p>
          <p>PROUDLY SERVING QUALITY</p>
        </div>
        <div className="mt-1 flex justify-center items-center gap-1">
          <div className="h-[1px] bg-black flex-1"></div>
          <span className="text-[7px]">*** END OF RECEIPT ***</span>
          <div className="h-[1px] bg-black flex-1"></div>
        </div>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;

