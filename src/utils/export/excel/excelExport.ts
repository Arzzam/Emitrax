import ExcelJS from 'exceljs';

import { IEmi } from '@/types/emi.types';
import { ExportConfig } from '@/types/export.types';
import { CurrencyFormatPreferences } from '@/utils/numberFormat';

import { excelTemplateRegistry } from './excelTemplateRegistry';

export interface ExcelExportPayload {
    emi: IEmi;
    currencyPrefs: CurrencyFormatPreferences;
    exportConfig: ExportConfig;
}

export async function exportEmiToExcel({ emi, currencyPrefs, exportConfig }: ExcelExportPayload): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const builder = excelTemplateRegistry[exportConfig.excelTemplate];
    builder(workbook, emi, currencyPrefs);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${emi.itemName.replace(/\s+/g, '_')}_EMI_Report.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
