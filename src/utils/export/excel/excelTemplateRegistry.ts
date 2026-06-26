import ExcelJS from 'exceljs';

import { IEmi } from '@/types/emi.types';
import { ExcelTemplate } from '@/types/export.types';
import { CurrencyFormatPreferences } from '@/utils/numberFormat';

import { buildCompactTemplate } from './templates/compactTemplate';
import { buildDetailedTemplate } from './templates/detailedTemplate';

type ExcelBuilder = (wb: ExcelJS.Workbook, emi: IEmi, prefs: CurrencyFormatPreferences) => void;

export const excelTemplateRegistry: Record<ExcelTemplate, ExcelBuilder> = {
    detailed: buildDetailedTemplate,
    compact: buildCompactTemplate,
};
