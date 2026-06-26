import { format } from 'date-fns';

import { IEmi, IEmiSplit } from '@/types/emi.types';
import { calculateTotalLoanOutflow } from '@/utils/calculation';
import { CurrencyFormatPreferences, formatCurrencyAmount } from '@/utils/numberFormat';

export interface PdfTemplateProps {
    emi: IEmi;
    currencyPrefs: CurrencyFormatPreferences;
}

export function fmt(value: number, prefs: CurrencyFormatPreferences): string {
    return formatCurrencyAmount(value, prefs);
}

export function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    try {
        return format(new Date(date), 'dd MMM yyyy');
    } catch {
        return '—';
    }
}

export function fmtPct(value: number): string {
    return `${value}%`;
}

export interface SplitParticipantRow {
    id: string;
    name: string;
    email: string;
    share: string;
    monthly: string;
    loanShare: string;
    outstanding: string | null;
    tags: string;
}

export interface MySplitSummary {
    monthly: string;
    loanShare: string;
    outstanding: string | null;
    share: string;
}

export function getSplitParticipantName(split: IEmiSplit): string {
    return split.participantName || split.participantEmail || split.user_profiles?.email || 'Unknown';
}

export function getSplitParticipantEmail(split: IEmiSplit): string {
    return split.participantEmail ?? split.user_profiles?.email ?? '—';
}

export function buildSplitParticipantRows(emi: IEmi, prefs: CurrencyFormatPreferences): SplitParticipantRow[] {
    if (!emi.splits?.length) return [];

    const effectiveTotalLoan = calculateTotalLoanOutflow({
        principal: emi.principal,
        totalInterest: emi.totalInterest,
        totalGST: emi.totalGST ?? 0,
        processingFee: emi.processingFee,
        processingFeeGst: emi.processingFeeGst,
    });

    return emi.splits.map((split) => {
        const pct = split.splitPercentage / 100;
        const monthlyAmount = split.splitAmount ?? emi.emi * pct;
        const loanShare = effectiveTotalLoan * pct;
        const outstanding = emi.isCompleted ? null : emi.remainingBalance * pct;

        const tags: string[] = [];
        if (emi.mySplit?.id === split.id) tags.push('You');
        if (split.isExternal) tags.push('External');

        return {
            id: split.id,
            name: getSplitParticipantName(split),
            email: getSplitParticipantEmail(split),
            share: `${split.splitPercentage.toFixed(1)}%`,
            monthly: fmt(monthlyAmount, prefs),
            loanShare: fmt(loanShare, prefs),
            outstanding: outstanding != null ? fmt(outstanding, prefs) : null,
            tags: tags.join(' · '),
        };
    });
}

export function buildMySplitSummary(emi: IEmi, prefs: CurrencyFormatPreferences): MySplitSummary | null {
    if (!emi.mySplit || emi.mySplitAmount == null) return null;

    const effectiveTotalLoan = calculateTotalLoanOutflow({
        principal: emi.principal,
        totalInterest: emi.totalInterest,
        totalGST: emi.totalGST ?? 0,
        processingFee: emi.processingFee,
        processingFeeGst: emi.processingFeeGst,
    });

    const pct = emi.mySplit.splitPercentage / 100;
    const outstanding = emi.isCompleted ? null : emi.remainingBalance * pct;

    return {
        share: `${emi.mySplit.splitPercentage.toFixed(1)}%`,
        monthly: fmt(emi.mySplitAmount, prefs),
        loanShare: fmt(effectiveTotalLoan * pct, prefs),
        outstanding: outstanding != null ? fmt(outstanding, prefs) : null,
    };
}

export interface AmortizationRow {
    month: number;
    billDate: string;
    emi: string;
    interest: string;
    principalPaid: string;
    balance: string;
    gst: number;
}

export function buildAmortizationRows(emi: IEmi, prefs: CurrencyFormatPreferences) {
    return (emi.amortizationSchedules ?? []).map((s) => ({
        month: s.month,
        billDate: fmtDate(s.billDate),
        emi: fmt(Number(s.emi), prefs),
        interest: fmt(Number(s.interest), prefs),
        principalPaid: fmt(Number(s.principalPaid), prefs),
        balance: fmt(Number(s.balance), prefs),
        gst: s.gst ?? 0,
        total: fmt(Number(s.emi) + Number(s.gst ?? 0), prefs),
    }));
}
