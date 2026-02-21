import { forwardRef } from 'react';

interface KOTProps {
    bill: any;
    settings: Record<string, string>;
}

const KOT = forwardRef<HTMLDivElement, KOTProps>(({ bill, settings }, ref) => {
    if (!bill) return <div ref={ref} />;

    const date = new Date(bill.created_at);
    const dateStr = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const totalQty = bill.items.reduce((sum: number, i: any) => sum + i.quantity, 0);

    return (
        <div
            ref={ref}
            className="print-receipt receipt-width px-3 py-4 font-mono text-black bg-white"
            style={{ fontFamily: 'monospace', fontWeight: 600 }}
        >
            {/* HEADER */}
            <div className="text-center py-2 border-b-2 border-black">
                <h1 className="text-[20px] font-bold uppercase tracking-tight">KITCHEN ORDER</h1>
                <p className="text-[16px] font-bold mt-1">
                    Bill No: {bill.bill_number?.split('-').pop() || '000'}
                </p>
            </div>

            {/* ORDER META */}
            <div className="flex justify-between py-2 border-b border-black font-bold uppercase">
                <span>{bill.order_type}</span>
                <span>{timeStr}</span>
            </div>

            {/* ITEMS LIST */}
            <div className="py-2">
                <table
                    style={{
                        width: '100%',
                        tableLayout: 'fixed',
                        borderCollapse: 'collapse',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                    }}
                >
                    <colgroup>
                        <col style={{ width: '3ch' }} />
                        <col style={{ width: '39ch' }} />
                    </colgroup>
                    <tbody>
                        {bill.items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-black border-dashed">
                                <td className="align-top py-2 font-bold text-[18px]">{item.quantity}</td>
                                <td className="align-top py-2 pl-2">
                                    <div className="font-bold uppercase text-[16px]">{item.name}</div>
                                    {item.note && (
                                        <div className="mt-1 py-1 px-2 border-l-4 border-black font-bold uppercase text-[15px]">
                                            MOD: {item.note}
                                        </div>
                                    )}  </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SUMMARY */}
            <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-[14px]">
                <span>TOTAL ITEMS: {bill.items.length}</span>
                <span>QTY: {totalQty}</span>
            </div>

            {/* FOOTER */}
            <div className="text-center mt-6 py-2 border-t border-black border-dashed">
                <p className="text-[12px] uppercase">End of Kitchen Ticket</p>
            </div>
        </div>
    );
});

KOT.displayName = 'KOT';
export default KOT;
