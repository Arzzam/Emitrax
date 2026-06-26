import ExcelJS from 'exceljs';

import { IEmi } from '@/types/emi.types';
import { CurrencyFormatPreferences } from '@/utils/numberFormat';

import { applyHeaderStyle, fmtDate, fmtPct, getCurrencyNumFmt } from './shared';

const DARK = '1E3A5F';
const LIGHT_BLUE = 'EFF6FF';
const RULE_COLOR = 'BFDBFE';

export function buildCompactTemplate(wb: ExcelJS.Workbook, emi: IEmi, currencyPrefs: CurrencyFormatPreferences) {
    const ws = wb.addWorksheet('EMI Summary');
    const currencyFmt = getCurrencyNumFmt(currencyPrefs.currency);
    const hasGst = emi.gst > 0;

    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 22;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 22;

    // Title
    ws.mergeCells('A1:D1');
    const titleCell = ws.getCell('A1');
    titleCell.value = emi.itemName;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:D2');
    const sub = ws.getCell('A2');
    sub.value = `${emi.isCompleted ? 'Completed' : 'Active'} · Generated ${fmtDate(new Date())}${emi.tag ? ` · ${emi.tag}` : ''}`;
    sub.font = { size: 8, italic: true, color: { argb: '6B7280' } };
    sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    sub.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 16;

    ws.addRow([]);

    type SummaryRow = [string, string | number, string, string | number];

    // Summary in 2-column pairs (label, value, label, value)
    const summaryData: SummaryRow[] = [
        ['Monthly EMI', emi.emi, 'Principal', emi.principal],
        ['Interest Rate', fmtPct(emi.interestRate), 'Tenure', `${emi.tenure} months`],
        ['Total Loan', emi.totalLoan, 'Total Interest', emi.totalInterest],
        ...(hasGst ? [['Total GST', emi.totalGST ?? 0, 'GST Rate', fmtPct(emi.gst)] as SummaryRow] : []),
        ['EMIs Paid', `${emi.totalPaidEMIs} / ${emi.tenure}`, 'Remaining Tenure', `${emi.remainingTenure} months`],
        ['Remaining Balance', emi.remainingBalance, 'Start Date', fmtDate(emi.billDate)],
        [
            'End Date',
            fmtDate(emi.endDate),
            emi.isSplit && emi.mySplitAmount ? 'Your Split Amount' : '',
            emi.isSplit && emi.mySplitAmount ? emi.mySplitAmount : '',
        ],
    ];

    ws.mergeCells('A4:D4');
    const sumHdr = ws.getCell('A4');
    sumHdr.value = 'KEY SUMMARY';
    applyHeaderStyle(sumHdr, DARK);
    ws.getRow(4).height = 18;

    summaryData.forEach(([l1, v1, l2, v2], i) => {
        const r = 5 + i;
        const c1 = ws.getCell(r, 1);
        const c2 = ws.getCell(r, 2);
        const c3 = ws.getCell(r, 3);
        const c4 = ws.getCell(r, 4);

        c1.value = l1;
        c1.font = { bold: true, size: 9, color: { argb: '374151' } };
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };

        c2.value = v1;
        c2.font = { size: 9 };
        if (typeof v1 === 'number') {
            c2.numFmt = currencyFmt;
            c2.alignment = { horizontal: 'right' };
        }

        if (l2) {
            c3.value = l2;
            c3.font = { bold: true, size: 9, color: { argb: '374151' } };
            c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };

            if (v2 !== undefined) {
                c4.value = v2;
                c4.font = { size: 9 };
                if (typeof v2 === 'number') {
                    c4.numFmt = currencyFmt;
                    c4.alignment = { horizontal: 'right' };
                }
            }
        }

        [c1, c2, c3, c4].forEach((c) => {
            c.border = { bottom: { style: 'hair', color: { argb: RULE_COLOR } } };
        });
    });

    const scheduleStartRow = 5 + summaryData.length + 2;

    // Condensed schedule header
    ws.mergeCells(`A${scheduleStartRow - 1}:D${scheduleStartRow - 1}`);
    const schHdr = ws.getCell(`A${scheduleStartRow - 1}`);
    schHdr.value = 'CONDENSED AMORTIZATION SCHEDULE';
    applyHeaderStyle(schHdr, DARK);
    ws.getRow(scheduleStartRow - 1).height = 18;

    const colHeaders = ['#', 'Bill Date', hasGst ? 'EMI + GST' : 'EMI', 'Balance'];
    colHeaders.forEach((h, ci) => {
        const cell = ws.getCell(scheduleStartRow, ci + 1);
        cell.value = h;
        applyHeaderStyle(cell, '3B82F6');
    });
    ws.getRow(scheduleStartRow).height = 20;

    (emi.amortizationSchedules ?? []).forEach((s, i) => {
        const r = scheduleStartRow + 1 + i;
        const emiVal = Number(s.emi);
        const gstAmt = emiVal * ((s.gst ?? 0) / 100);
        const displayEmi = hasGst ? emiVal + gstAmt : emiVal;
        const balanceVal = Number(s.balance);
        const isEven = i % 2 === 0;

        const vals = [s.month, fmtDate(s.billDate), displayEmi, balanceVal];
        vals.forEach((v, ci) => {
            const cell = ws.getCell(r, ci + 1);
            cell.value = v;
            cell.font = { size: 9 };
            if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F9FF' } };
            cell.border = { bottom: { style: 'hair', color: { argb: 'E5E7EB' } } };
            if (ci >= 2) {
                cell.numFmt = currencyFmt;
                cell.alignment = { horizontal: 'right' };
            }
            if (ci === 0) cell.alignment = { horizontal: 'center' };
        });
    });

    // Totals
    const lastRow = scheduleStartRow + 1 + (emi.amortizationSchedules?.length ?? 0);
    const totalEmi = (emi.amortizationSchedules ?? []).reduce((a, s) => {
        const e = Number(s.emi);
        const g = e * ((s.gst ?? 0) / 100);
        return a + (hasGst ? e + g : e);
    }, 0);
    const totals = ['', 'Totals', totalEmi, 0];
    totals.forEach((v, ci) => {
        const cell = ws.getCell(lastRow, ci + 1);
        cell.value = ci === 3 ? '' : v;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 9 };
        if (ci === 2) {
            cell.numFmt = currencyFmt;
            cell.alignment = { horizontal: 'right' };
        }
    });
    ws.getRow(lastRow).height = 20;

    // Footer
    const footerRow = lastRow + 2;
    ws.mergeCells(`A${footerRow}:D${footerRow}`);
    const fc = ws.getCell(`A${footerRow}`);
    fc.value = 'Generated by Emitrax';
    fc.font = { size: 7, italic: true, color: { argb: '9CA3AF' } };
}
