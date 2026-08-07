import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TrackerView = 'payments' | 'bills' | 'both';

const VIEWS: { value: TrackerView; label: string }[] = [
    { value: 'payments', label: 'Payments' },
    { value: 'bills', label: 'Bills' },
    { value: 'both', label: 'Both' },
];

/** Falls back to payments on anything unrecognised - this comes off the URL. */
export function parseTrackerView(raw: string | null): TrackerView {
    return raw === 'bills' || raw === 'both' ? raw : 'payments';
}

const TrackerViewSelector = ({ value, onChange }: { value: TrackerView; onChange: (next: TrackerView) => void }) => (
    <Tabs value={value} onValueChange={(next) => onChange(next as TrackerView)}>
        <TabsList aria-label="Tracker view">
            {VIEWS.map((view) => (
                <TabsTrigger key={view.value} value={view.value}>
                    {view.label}
                </TabsTrigger>
            ))}
        </TabsList>
    </Tabs>
);

export default TrackerViewSelector;
