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
    <div
      ref={ref}
      className="receipt-container receipt-width p-4 font-mono-receipt text-[11px] leading-[1.2] text-black bg-white"
      style={{
        width: '56mm',
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: 'bold'
      }}
    >
      {/* HEADER SECTION */}
      <div className="text-center space-y-1">
        <h1 className="text-[18px] font-bold uppercase leading-none mb-1">
          {settings.restaurant_name || 'AKF FOODS'}
        </h1>
        <div className="text-[10px] leading-tight">
          <p className="whitespace-pre-wrap">{settings.address || 'Inqilab Road, Peshawar'}</p>
          <div className="font-bold border-y border-black border-dashed py-1 my-2">
            {settings.phone1 ? `Ph: ${settings.phone1}` : ''}
            {settings.phone2 ? ` | ${settings.phone2}` : ''}
          </div>
        </div>
      </div>

      {/* BILL INFO */}
      <div className="mt-2 flex justify-between items-end border-b border-black pb-1">
        <div className="text-left">
          <p className="text-[12px] font-bold leading-none">ORDER: #{bill.bill_number?.split('-').pop() || '000'}</p>
          <p className="text-[9px] mt-0.5">{bill.bill_number}</p>
        </div>
        <div className="text-right">
          <p className="font-bold uppercase text-[11px] leading-none">{bill.order_type}</p>
          <p className="text-[9px] mt-0.5">{dateStr} {timeStr}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="mt-3">
        <div className="flex justify-between font-bold border-b border-black border-solid pb-1 mb-1 text-[10px]">
          <span className="w-[50%] text-left">ITEM</span>
          <span className="w-[20%] text-center">QTY</span>
          <span className="w-[30%] text-right">TOTAL</span>
        </div>

        <div className="space-y-1.5 py-1">
          {bill.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start font-bold">
              <div className="w-[50%] pr-1 uppercase text-[10px] leading-tight">{item.name}</div>
              <div className="w-[20%] text-center text-[10px]">{item.quantity}</div>
              <div className="w-[30%] text-right text-[10px] tabular-nums">{formatNum(item.totalPrice)}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-black border-dashed my-1"></div>
      </div>

      {/* TOTALS SECTION */}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span>SUBTOTAL:</span>
          <span className="font-bold tabular-nums">{formatNum(bill.subtotal)}</span>
        </div>
        {Number(bill.discount) > 0 && (
          <div className="flex justify-between text-[11px]">
            <span>DISCOUNT:</span>
            <span className="font-bold tabular-nums">-{formatNum(bill.discount)}</span>
          </div>
        )}
        {Number(bill.tax) > 0 && (
          <div className="flex justify-between text-[11px]">
            <span>TAX/GST ({settings.tax_percentage}%):</span>
            <span className="font-bold tabular-nums">{formatNum(bill.tax)}</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-black text-white px-2 py-1.5 mt-2 font-bold text-[14px]">
          <span>NET TOTAL:</span>
          <span>Rs. {formatNum(bill.total)}</span>
        </div>
      </div>

      {/* PAYMENT INFO */}
      <div className="mt-2 flex justify-between text-[10px] font-bold italic">
        <span>MODE: {bill.payment_method?.toUpperCase()}</span>
        <span>PAID: {formatNum(bill.amount_paid)}</span>
      </div>
      {Number(bill.change_returned) > 0 && (
        <div className="flex justify-between font-bold border-t border-black border-dotted pt-1 mt-1 text-[11px]">
          <span>CHANGE:</span>
          <span>Rs. {formatNum(bill.change_returned)}</span>
        </div>
      )}

      {/* FOOTER SECTION */}
      <div className="text-center mt-6 pt-2 border-t border-black space-y-1">
        <p className="font-bold text-[11px] whitespace-pre-line leading-tight">
          {formatFooter(settings.receipt_footer)}
        </p>
        <div className="mt-2 text-[8px] tracking-widest font-bold">
          <p>POWERED BY AKF POS SYSTEM</p>
        </div>
        <div className="mt-1 flex justify-center items-center gap-1">
          <div className="h-[1px] bg-black flex-1"></div>
          <span className="text-[7px] font-bold">*** END OF RECEIPT ***</span>
          <div className="h-[1px] bg-black flex-1"></div>
        </div>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;

