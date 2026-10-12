import { Braces, Loader2 } from 'lucide-react';

import { useDataExport } from '@/hooks/useDataExport';

import { Button } from '@/components/ui/button';

const INCLUDED_ITEMS = [
    'Every EMI — terms, tags, notes and the full amortization schedule',
    'Who actually carries each loan: splits, participants, and the share that is yours',
    'Saved foreclosure scenarios',
    'Credit card issuers, cards, monthly payments and bills',
];

export function DataExportSection() {
    const { exportAll, isExporting } = useDataExport();

    return (
        <section className="rounded-xl border bg-card p-5 space-y-4">
            <div>
                <h2 className="font-semibold">Download Your Data</h2>
                <p className="text-sm text-muted-foreground">
                    One JSON file with everything in your account, ready to hand to a spreadsheet or an AI assistant for
                    analysis.
                </p>
            </div>

            <ul className="space-y-1.5 text-sm text-muted-foreground">
                {INCLUDED_ITEMS.map((item) => (
                    <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="text-muted-foreground/60">
                            •
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>

            <p className="text-xs leading-relaxed text-muted-foreground">
                The file is plain text and holds your loan amounts, notes and the names of everyone you have split an
                EMI with. Share it only where you would share those.
            </p>

            <Button type="button" variant="outline" onClick={exportAll} disabled={isExporting} className="gap-2">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Braces className="h-4 w-4" />}
                {isExporting ? 'Preparing export...' : 'Export all data as JSON'}
            </Button>
        </section>
    );
}
