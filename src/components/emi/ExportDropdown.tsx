import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

import { useExport } from '@/hooks/useExport';
import { IEmi } from '@/types/emi.types';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportDropdownProps {
    emi: IEmi;
}

export function ExportDropdown({ emi }: ExportDropdownProps) {
    const { handlePdfExport, handleExcelExport, isExportingPdf, isExportingExcel } = useExport(emi);
    const isExporting = isExportingPdf || isExportingExcel;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePdfExport} disabled={isExportingPdf} className="gap-2">
                    {isExportingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4 text-red-500" />
                    )}
                    {isExportingPdf ? 'Generating PDF...' : 'Export as PDF'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExcelExport} disabled={isExportingExcel} className="gap-2">
                    {isExportingExcel ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    )}
                    {isExportingExcel ? 'Generating Excel...' : 'Export as Excel'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
