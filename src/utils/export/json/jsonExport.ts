import { format } from 'date-fns';

import type { DataExportDocument } from '@/types/dataExport.types';

import { buildDataExportDocument, type BuildDataExportInput } from './buildExportDocument';

/** Trims a name down to something safe to hand a filesystem. */
const toFileSlug = (value: string): string =>
    value
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || 'export';

function downloadJson(document_: DataExportDocument, fileName: string): void {
    // Indented rather than minified: these files are read by people and by
    // language models, and the whole dataset is small enough that the extra
    // whitespace costs nothing.
    const blob = new Blob([JSON.stringify(document_, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

export function exportDataToJson(input: BuildDataExportInput): void {
    const generatedAt = input.generatedAt ?? new Date();
    const document_ = buildDataExportDocument({ ...input, generatedAt });
    const stamp = format(generatedAt, 'yyyy-MM-dd');

    const fileName =
        input.scope === 'emi' && input.emis.length === 1
            ? `Emitrax_${toFileSlug(input.emis[0].itemName)}_${stamp}.json`
            : `Emitrax_full_export_${stamp}.json`;

    downloadJson(document_, fileName);
}
