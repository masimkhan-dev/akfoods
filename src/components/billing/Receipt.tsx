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

  const stars = "********************************";

  return (
    <div
      ref={ref}
      className="receipt-container"
      style={{
        width: '54mm',
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
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '1px' }}>{stars}</div>
        <div style={{ fontSize: '14px', fontWeight: '900', margin: '2px 0' }}>RECEIPT</div>
        <div style={{ fontSize: '8px', letterSpacing: '1px' }}>{stars}</div>

        <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', marginTop: '6px' }}>
          {settings.restaurant_name || 'AKF FOODS'}
        </div>
      </div>

      {/* INFO SECTION */}
      <div style={{ fontSize: '9px', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '60px' }}>Address:</span>
          <span style={{ flex: 1 }}>{settings.address || 'Inqilab Road, Peshawar'}</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '60px' }}>Date:</span>
          <span style={{ flex: 1 }}>{dateStr} {timeStr}</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '60px' }}>Bill #:</span>
          <span style={{ flex: 1 }}>{bill.bill_number?.split('-').pop()}</span>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '2px', fontWeight: '900' }}>
          <span style={{ width: '70%' }}>Description</span>
          <span style={{ width: '30%', textAlign: 'right' }}>Price</span>
        </div>

        <div style={{ marginTop: '4px' }}>
          {bill.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'flex-start' }}>
              <div style={{ width: '70%', textTransform: 'uppercase', lineHeight: '1.1' }}>
                {item.quantity} x {item.name}
              </div>
              <div style={{ width: '30%', textAlign: 'right' }}>{formatNum(item.totalPrice)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TOTALS SECTION */}
      <div style={{ borderTop: '1px solid #000', paddingTop: '4px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Tax</span>
          <span>{formatNum(bill.tax)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', marginTop: '2px' }}>
          <span>TOTAL</span>
          <span>Rs. {formatNum(bill.total)}</span>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '900', marginBottom: '6px' }}>THANK YOU</div>
        <div style={{ fontSize: '8px', letterSpacing: '1px', marginBottom: '4px' }}>{stars}</div>

        {/* Placeholder for barcode style lines */}
        <div style={{ letterSpacing: '2px', fontSize: '8px', overflow: 'hidden', height: '10px' }}>
          ||||||||||||||||||||||||||||||||||||
        </div>
        <div style={{ fontSize: '8px' }}>{bill.bill_number}</div>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
export default Receipt;

