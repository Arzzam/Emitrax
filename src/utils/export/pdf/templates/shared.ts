import { format } from 'date-fns';

import { IEmi, IEmiSplit } from '@/types/emi.types';
import { calculateTotalLoanOutflow } from '@/utils/calculation';
import { CurrencyFormatPreferences, formatCurrencyAmount, formatPercent } from '@/utils/numberFormat';

export interface PdfTemplateProps {
    emi: IEmi;
    currencyPrefs: CurrencyFormatPreferences;
}

/**
 * Characters the PDF font (NotoSans) has no glyph for, found by checking every
 * registry currency x number style against the font's cmap: the Thai baht
 * sign, plus the scripts excluded from the registry as a backstop.
 */
const PDF_UNRENDERABLE = /[\u0e00-\u0e7f\u0600-\u06ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;

/**
 * Amounts for PDF output. Same as the app formatter, except: U+2212 (the
 * minus sv-SE / nb-NO use) becomes a hyphen, and a symbol the font cannot draw
 * falls back to the ISO code (`THB 1.234,00` rather than a blank box).
 */
export function fmt(value: number, prefs: CurrencyFormatPreferences): string {
    const text = formatCurrencyAmount(value, prefs);
    const printable = PDF_UNRENDERABLE.test(text)
        ? formatCurrencyAmount(value, { ...prefs, currencyDisplay: 'code' })
        : text;
    return printable.replace(/\u2212/g, '-');
}

export function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    try {
        return format(new Date(date), 'dd MMM yyyy');
    } catch {
        return '—';
    }
}

export function fmtPct(value: number, prefs: CurrencyFormatPreferences, decimals?: number): string {
    return formatPercent(value, prefs.locale, decimals).replace(/\u2212/g, '-');
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
            share: fmtPct(split.splitPercentage, prefs, 1),
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
        share: fmtPct(emi.mySplit.splitPercentage, prefs, 1),
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
