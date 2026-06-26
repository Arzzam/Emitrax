import { StyleSheet, Text, View } from '@react-pdf/renderer';

import { IEmi } from '@/types/emi.types';
import { CurrencyFormatPreferences } from '@/utils/numberFormat';

import { buildMySplitSummary, buildSplitParticipantRows } from './shared';

type SplitVariant = 'modern' | 'classic' | 'minimal';

interface SplitBreakdownSectionProps {
    emi: IEmi;
    currencyPrefs: CurrencyFormatPreferences;
    variant: SplitVariant;
    sectionTitle?: string;
}

const MODERN = {
    headerBg: '#1e40af',
    headerText: '#ffffff',
    rowEven: '#dbeafe',
    border: '#3b82f6',
    accent: '#1e40af',
    muted: '#6b7280',
    summaryBg: '#dbeafe',
    summaryBorder: '#3b82f6',
};

const CLASSIC = {
    headerBg: '#1e3a5f',
    headerText: '#ffffff',
    rowEven: '#f3f4f6',
    border: '#374151',
    accent: '#1e3a5f',
    muted: '#6b7280',
    summaryBg: '#f3f4f6',
    summaryBorder: '#374151',
};

const MINIMAL = {
    headerBg: '#ffffff',
    headerText: '#374151',
    rowEven: '#ffffff',
    border: '#e5e7eb',
    accent: '#111827',
    muted: '#6b7280',
    summaryBg: '#f9fafb',
    summaryBorder: '#e5e7eb',
};

const PALETTES = { modern: MODERN, classic: CLASSIC, minimal: MINIMAL } as const;

function createStyles(palette: (typeof PALETTES)[SplitVariant], variant: SplitVariant) {
    const isMinimal = variant === 'minimal';

    return StyleSheet.create({
        section: { marginBottom: isMinimal ? 20 : 16 },
        sectionTitle: {
            fontSize: isMinimal ? 9.5 : 10,
            fontWeight: 'bold',
            color: palette.accent,
            marginBottom: 8,
            ...(variant === 'modern'
                ? { borderLeft: `3 solid ${palette.border}`, paddingLeft: 8 }
                : variant === 'classic'
                  ? { textDecoration: 'underline' }
                  : { letterSpacing: 0.5 }),
        },
        participantCount: {
            fontSize: 7.5,
            color: palette.muted,
            marginBottom: 8,
        },
        table: {
            width: '100%',
            ...(isMinimal ? {} : { border: `1 solid ${palette.border}` }),
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: isMinimal ? 'transparent' : palette.headerBg,
            paddingVertical: 5,
            paddingHorizontal: 4,
            ...(isMinimal ? { borderBottom: `1 solid ${palette.border}`, paddingBottom: 5 } : {}),
        },
        tableHeaderCell: {
            fontSize: 7,
            fontWeight: 'bold',
            flex: 1,
            color: isMinimal ? palette.headerText : palette.headerText,
        },
        tableHeaderCellWide: { flex: 1.6 },
        tableHeaderCellNumeric: { textAlign: 'right' },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: 5,
            paddingHorizontal: 4,
            borderBottom: `0.5 solid ${palette.border}`,
        },
        tableCell: { fontSize: 7.5, flex: 1, color: '#374151' },
        tableCellWide: { flex: 1.6 },
        tableCellNumeric: { textAlign: 'right' },
        participantName: { fontSize: 7.5, fontWeight: 'bold', color: '#111827' },
        participantEmail: { fontSize: 6.5, color: palette.muted, marginTop: 1 },
        participantTags: { fontSize: 6.5, color: palette.accent, marginTop: 1 },
        summary: {
            marginTop: 8,
            padding: '8 10',
            backgroundColor: palette.summaryBg,
            border: `1 solid ${palette.summaryBorder}`,
            borderRadius: variant === 'modern' ? 5 : 0,
        },
        summaryLabel: {
            fontSize: 7,
            color: palette.muted,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        summaryMonthly: { fontSize: 11, fontWeight: 'bold', color: palette.accent, marginBottom: 4 },
        summaryMeta: { fontSize: 7.5, color: palette.muted },
    });
}

export function SplitBreakdownSection({
    emi,
    currencyPrefs,
    variant,
    sectionTitle = 'Split Breakdown',
}: SplitBreakdownSectionProps) {
    const participants = buildSplitParticipantRows(emi, currencyPrefs);
    const mySummary = buildMySplitSummary(emi, currencyPrefs);

    if (!emi.isSplit || participants.length === 0) return null;

    const palette = PALETTES[variant];
    const s = createStyles(palette, variant);
    const showOutstanding = !emi.isCompleted;

    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{sectionTitle}</Text>
            <Text style={s.participantCount}>
                {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </Text>

            <View style={s.table}>
                <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, s.tableHeaderCellWide]}>Participant</Text>
                    <Text style={[s.tableHeaderCell, s.tableHeaderCellNumeric]}>Share</Text>
                    <Text style={[s.tableHeaderCell, s.tableHeaderCellNumeric]}>Monthly</Text>
                    <Text style={[s.tableHeaderCell, s.tableHeaderCellNumeric]}>Loan Share</Text>
                    {showOutstanding && <Text style={[s.tableHeaderCell, s.tableHeaderCellNumeric]}>Outstanding</Text>}
                </View>

                {participants.map((participant, index) => (
                    <View
                        key={participant.id}
                        style={[
                            s.tableRow,
                            index % 2 === 1 && variant !== 'minimal' ? { backgroundColor: palette.rowEven } : {},
                        ]}
                    >
                        <View style={[s.tableCell, s.tableCellWide]}>
                            <Text style={s.participantName}>{participant.name}</Text>
                            <Text style={s.participantEmail}>{participant.email}</Text>
                            {participant.tags ? <Text style={s.participantTags}>{participant.tags}</Text> : null}
                        </View>
                        <Text style={[s.tableCell, s.tableCellNumeric]}>{participant.share}</Text>
                        <Text style={[s.tableCell, s.tableCellNumeric]}>{participant.monthly}</Text>
                        <Text style={[s.tableCell, s.tableCellNumeric]}>{participant.loanShare}</Text>
                        {showOutstanding && (
                            <Text style={[s.tableCell, s.tableCellNumeric]}>{participant.outstanding ?? '—'}</Text>
                        )}
                    </View>
                ))}
            </View>

            {mySummary && (
                <View style={s.summary}>
                    <Text style={s.summaryLabel}>Your total responsibility</Text>
                    <Text style={s.summaryMonthly}>
                        {mySummary.monthly}
                        <Text style={{ fontSize: 8, fontWeight: 'normal', color: palette.muted }}> /month</Text>
                    </Text>
                    <Text style={s.summaryMeta}>
                        Share: {mySummary.share} · Loan: {mySummary.loanShare}
                        {mySummary.outstanding ? ` · Outstanding: ${mySummary.outstanding}` : ''}
                    </Text>
                </View>
            )}
        </View>
    );
}
