import React from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

import { IEmi } from '@/types/emi.types';
import { ExportConfig } from '@/types/export.types';
import { CurrencyFormatPreferences } from '@/utils/numberFormat';

import { registerPdfFonts } from './pdfFonts';
import { pdfTemplateRegistry } from './pdfTemplateRegistry';

export interface PdfExportPayload {
    emi: IEmi;
    currencyPrefs: CurrencyFormatPreferences;
    exportConfig: ExportConfig;
}

export async function exportEmiToPdf({ emi, currencyPrefs, exportConfig }: PdfExportPayload): Promise<void> {
    registerPdfFonts();

    const TemplateComponent = pdfTemplateRegistry[exportConfig.pdfTemplate];
    const doc = React.createElement(TemplateComponent, { emi, currencyPrefs }) as React.ReactElement<DocumentProps>;
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${emi.itemName.replace(/\s+/g, '_')}_EMI_Report.pdf`;
    link.click();
    URL.revokeObjectURL(url);
}
