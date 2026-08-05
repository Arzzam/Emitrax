import { useEffect, useRef, useState } from 'react';

import { useUpdateTrackerYearNotes } from '@/hooks/useCreditCards';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Free-text notes for a financial year. Unlike the grid cells this is
 * last-write-wins prose, so a debounce is the right save trigger here.
 */
const TrackerYearNotes = ({ financialYear, notes }: { financialYear: string; notes: string | null }) => {
    const [draft, setDraft] = useState(notes ?? '');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { mutate: saveNotes } = useUpdateTrackerYearNotes(financialYear);

    // Reset when switching years, or when the server value changes underneath.
    useEffect(() => {
        setDraft(notes ?? '');
        setStatus('idle');
    }, [financialYear, notes]);

    useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

    const handleChange = (value: string) => {
        setDraft(value);
        setStatus('saving');

        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            saveNotes(value, {
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            });
        }, SAVE_DEBOUNCE_MS);
    };

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader className="pt-4 pb-1.5">
                <CardTitle className="text-sm font-semibold tracking-tight">Notes for this year</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <Textarea
                    value={draft}
                    rows={3}
                    placeholder="Anything worth remembering about this financial year — a large one-off payment, a card you closed, a bill you split."
                    onChange={(event) => handleChange(event.target.value)}
                />
                <p className="mt-1.5 h-4 text-xs text-muted-foreground">
                    {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
                </p>
            </CardContent>
        </Card>
    );
};

export default TrackerYearNotes;
