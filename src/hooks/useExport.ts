import { useCallback, useMemo, useState } from 'react';

import { IEmi } from '@/types/emi.types';
import { DEFAULT_EXPORT_CONFIG } from '@/types/export.types';
import { exportEmiToExcel } from '@/utils/export/excel/excelExport';
import { exportEmiToPdf } from '@/utils/export/pdf/pdfExport';
import { errorToast, successToast } from '@/utils/toast.utils';

import { useAccountDetails } from './useAccount';
import { useCurrencyPreferences } from './useCurrencyPreferences';
import { useUser } from './useUser';

export function useExport(emi: IEmi | null) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const { data: userData } = useUser();
    const { data: account } = useAccountDetails({ enabled: !!userData?.user });
    const { locale, currency, numberFormat } = useCurrencyPreferences();

    const exportConfig = account?.preferences?.exportConfig ?? DEFAULT_EXPORT_CONFIG;
    const currencyPrefs = useMemo(() => ({ locale, currency, numberFormat }), [locale, currency, numberFormat]);

    const handlePdfExport = useCallback(async () => {
        if (!emi) return;
        setIsExportingPdf(true);
        try {
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
            await exportEmiToExcel({ emi, currencyPrefs, exportConfig });
            successToast('Excel file exported successfully.');
        } catch (e) {
            console.error(e);
            errorToast('Failed to export Excel. Please try again.');
        } finally {
            setIsExportingExcel(false);
        }
    }, [emi, currencyPrefs, exportConfig]);

    return { handlePdfExport, handleExcelExport, isExportingPdf, isExportingExcel };
}
