import { useCallback, useMemo, useState } from 'react';

import { IEmi } from '@/types/emi.types';
import { DEFAULT_EXPORT_CONFIG } from '@/types/export.types';
import { exportDataToJson } from '@/utils/export/json/jsonExport';
import { ScenarioService } from '@/utils/ScenarioService';
import { errorToast, successToast } from '@/utils/toast.utils';

import { useAccountDetails } from './useAccount';
import { useCurrencyPreferences } from './useCurrencyPreferences';
import { useUser } from './useUser';

export function useExport(emi: IEmi | null) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingJson, setIsExportingJson] = useState(false);

    const { data: userData } = useUser();
    const { data: account } = useAccountDetails({ enabled: !!userData?.user });
    // A single-EMI export is in that loan's currency, not the account's.
    const { locale, currency, numberFormat } = useCurrencyPreferences(emi?.currency);

    const exportConfig = account?.preferences?.exportConfig ?? DEFAULT_EXPORT_CONFIG;
    const currencyPrefs = useMemo(() => ({ locale, currency, numberFormat }), [locale, currency, numberFormat]);

    const handlePdfExport = useCallback(async () => {
        if (!emi) return;
        setIsExportingPdf(true);
        try {
            // Dynamically imported so `@react-pdf/renderer` (large) only loads
            // when the user actually requests a PDF, keeping it out of the
            // EMI details page's initial chunk.
            const { exportEmiToPdf } = await import('@/utils/export/pdf/pdfExport');
            await exportEmiToPdf({ emi, currencyPrefs, exportConfig });
            successToast('PDF exported successfully.');
        } catch (e) {
            console.error(e);
            errorToast('Failed to export PDF. Please try again.');
        } finally {
            setIsExportingPdf(false);
        }
    }, [emi, currencyPrefs, exportConfig]);

    const handleExcelExport = useCallback(async () => {
        if (!emi) return;
        setIsExportingExcel(true);
        try {
            // Dynamically imported so `exceljs` (large) only loads when the
            // user actually requests an Excel file.
            const { exportEmiToExcel } = await import('@/utils/export/excel/excelExport');
            await exportEmiToExcel({ emi, currencyPrefs, exportConfig });
            successToast('Excel file exported successfully.');
        } catch (e) {
            console.error(e);
            errorToast('Failed to export Excel. Please try again.');
        } finally {
            setIsExportingExcel(false);
        }
    }, [emi, currencyPrefs, exportConfig]);

    // Not dynamically imported like the PDF and Excel paths: the JSON builder is
    // plain mapping code with no heavy dependency to keep out of the chunk.
    const handleJsonExport = useCallback(async () => {
        if (!emi || !account) return;
        setIsExportingJson(true);
        try {
            const scenarios = await ScenarioService.getScenariosByEmiId(emi.id);
            exportDataToJson({
                scope: 'emi',
                account,
                emis: [emi],
                scenariosByEmiId: { [emi.id]: scenarios },
            });
            successToast('JSON exported successfully.');
        } catch (e) {
            console.error(e);
            errorToast('Failed to export JSON. Please try again.');
        } finally {
            setIsExportingJson(false);
        }
    }, [emi, account]);

    return {
        handlePdfExport,
        handleExcelExport,
        handleJsonExport,
        isExportingPdf,
        isExportingExcel,
        isExportingJson,
    };
}
