import { format } from 'date-fns';
import ExcelJS from 'exceljs';

import { CurrencyFormatPreferences } from '@/utils/numberFormat';

export function getCurrencyNumFmt(currency: string): string {
    const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const sym = symbols[currency] ?? currency;
    return `"${sym}"#,##0.00`;
}

export function applyHeaderStyle(cell: ExcelJS.Cell, bgColor: string, fontColor = 'FFFFFF') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { bold: true, color: { argb: fontColor }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
}

export function applyLabelCell(cell: ExcelJS.Cell) {
    cell.font = { bold: true, color: { argb: '374151' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
    cell.border = { bottom: { style: 'hair', color: { argb: 'E5E7EB' } } };
}

export function applyValueCell(cell: ExcelJS.Cell) {
    cell.font = { size: 9, color: { argb: '111827' } };
    cell.border = { bottom: { style: 'hair', color: { argb: 'E5E7EB' } } };
}

export function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    try {
        return format(new Date(date), 'dd MMM yyyy');
    } catch {
        return '—';
    }
}

export function fmtPct(v: number) {
    return `${v}%`;
}

export interface ExcelTemplateOptions {
    workbook: ExcelJS.Workbook;
    emi: import('@/types/emi.types').IEmi;
    currencyPrefs: CurrencyFormatPreferences;
}
