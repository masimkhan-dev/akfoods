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
      className="receipt-container"
      style={{
        width: '52mm',
        padding: '2mm',
        backgroundColor: '#fff',
        color: '#000',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '10px',
        fontWeight: 'bold',
        lineHeight: '1.2'
      }}
    >
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
          {settings.restaurant_name || 'AKF FOODS'}
        </div>
        <div style={{ fontSize: '9px', whiteSpace: 'pre-wrap' }}>
          {settings.address || 'Inqilab Road, Peshawar'}
        </div>
        <div style={{ margin: '4px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2px 0' }}>
          {settings.phone1 ? `Ph: ${settings.phone1}` : ''}
          {settings.phone2 ? ` | ${settings.phone2}` : ''}
        </div>
      </div>

      {/* BILL INFO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '4px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '11px' }}>ORDER: #{bill.bill_number?.split('-').pop() || '000'}</div>
          <div style={{ fontSize: '8px' }}>{bill.bill_number}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ textTransform: 'uppercase' }}>{bill.order_type}</div>
          <div style={{ fontSize: '8px' }}>{dateStr} {timeStr}</div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px', fontSize: '9px' }}>
          <span style={{ width: '50%', textAlign: 'left' }}>ITEM</span>
          <span style={{ width: '20%', textAlign: 'center' }}>QTY</span>
          <span style={{ width: '30%', textAlign: 'right' }}>PRICE</span>
        </div>

        <div style={{ marginBottom: '4px' }}>
          {bill.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <div style={{ width: '50%', textAlign: 'left', textTransform: 'uppercase', fontSize: '9px', lineHeight: '1.1' }}>
                {item.name}
              </div>
              <div style={{ width: '20%', textAlign: 'center' }}>{item.quantity}</div>
              <div style={{ width: '30%', textAlign: 'right' }}>{formatNum(item.totalPrice)}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px dashed #000' }}></div>
      </div>

      {/* TOTALS SECTION */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SUBTOTAL:</span>
          <span>{formatNum(bill.subtotal)}</span>
        </div>
        {Number(bill.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>DISCOUNT:</span>
            <span>-{formatNum(bill.discount)}</span>
          </div>
        )}
        {Number(bill.tax) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>TAX/GST:</span>
            <span>{formatNum(bill.tax)}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: '#000',
          color: '#fff',
          padding: '2px',
          marginTop: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          <span>NET TOTAL:</span>
          <span>Rs. {formatNum(bill.total)}</span>
        </div>
      </div>

      {/* PAYMENT INFO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontStyle: 'italic', marginBottom: '4px' }}>
        <span>MODE: {bill.payment_method?.toUpperCase()}</span>
        <span>PAID: {formatNum(bill.amount_paid)}</span>
      </div>
      {Number(bill.change_returned) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #000', paddingTop: '2px' }}>
          <span>CHANGE:</span>
          <span>Rs. {formatNum(bill.change_returned)}</span>
        </div>
      )}

      {/* FOOTER SECTION */}
      <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '4px', borderTop: '1px solid #000' }}>
        <div style={{ whiteSpace: 'pre-line', marginBottom: '4px' }}>
          {formatFooter(settings.receipt_footer)}
        </div>
        <div style={{ fontSize: '8px', letterSpacing: '1px' }}>
          POWERED BY AKF POS SYSTEM
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <div style={{ height: '1px', backgroundColor: '#000', flex: 1 }}></div>
          <span style={{ fontSize: '7px' }}>*** END ***</span>
          <div style={{ height: '1px', backgroundColor: '#000', flex: 1 }}></div>
        </div>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;

