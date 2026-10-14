import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { ScheduleData } from '@/types/emi.types';
import { getFormattedDate } from '@/utils/utils';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Month-by-month schedule with a totals row. The current month is highlighted. */
const AmortizationTable = ({ schedules, currency }: { schedules: ScheduleData[]; currency: string }) => {
    const { formatCurrencyAmount, taxLabels } = useCurrencyPreferences(currency);

    const today = new Date();
    const isSameMonth = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();

    // Totals (computed defensively)
    const totals = schedules.reduce(
        (acc, r) => {
            acc.emi += Number(r.emi) || 0;
            acc.interest += Number(r.interest) || 0;
            acc.principal += Number(r.principalPaid) || 0;
            acc.gst += Number(r.gst) || 0;
            return acc;
        },
        { emi: 0, interest: 0, principal: 0, gst: 0 }
    );

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>EMI</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Principal Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>{taxLabels.label}</TableHead>
                    <TableHead>Total with {taxLabels.inline}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {schedules.map((item, idx) => {
                    const bill = new Date(item.billDate);
                    const isCurrent = isSameMonth(bill);
                    return (
                        <TableRow
                            key={item.month ?? idx}
                            className={`tabular-nums ${
                                isCurrent ? 'bg-primary/5 hover:bg-primary/10' : idx % 2 === 0 ? 'bg-muted/30' : ''
                            }`}
                        >
                            <TableCell>{item.month}</TableCell>
                            <TableCell className="whitespace-nowrap">{getFormattedDate(item.billDate)}</TableCell>
                            <TableCell>{formatCurrencyAmount(Number(item.emi))}</TableCell>
                            <TableCell>{formatCurrencyAmount(Number(item.interest))}</TableCell>
                            <TableCell>{formatCurrencyAmount(Number(item.principalPaid))}</TableCell>
                            <TableCell>{formatCurrencyAmount(Number(item.balance))}</TableCell>
                            <TableCell>{formatCurrencyAmount(item.gst)}</TableCell>
                            <TableCell>{formatCurrencyAmount(Number(item.emi) + Number(item.gst))}</TableCell>
                        </TableRow>
                    );
                })}

                {/* Totals row */}
                <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell>{formatCurrencyAmount(totals.emi)}</TableCell>
                    <TableCell>{formatCurrencyAmount(totals.interest)}</TableCell>
                    <TableCell>{formatCurrencyAmount(totals.principal)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{formatCurrencyAmount(totals.gst)}</TableCell>
                    <TableCell>{formatCurrencyAmount(totals.emi + totals.gst)}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default AmortizationTable;
