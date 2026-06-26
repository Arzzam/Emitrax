export type PdfTemplate = 'modern' | 'classic' | 'minimal';
export type ExcelTemplate = 'detailed' | 'compact';

export interface ExportConfig {
    pdfTemplate: PdfTemplate;
    excelTemplate: ExcelTemplate;
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
    pdfTemplate: 'modern',
    excelTemplate: 'detailed',
};
