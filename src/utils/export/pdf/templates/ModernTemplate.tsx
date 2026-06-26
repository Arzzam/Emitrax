import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { PDF_FONT_FAMILY } from '../pdfFonts';

import { buildAmortizationRows, fmt, fmtDate, fmtPct, PdfTemplateProps } from './shared';
import { SplitBreakdownSection } from './SplitBreakdownSection';

const BLUE = '#1e40af';
const BLUE_LIGHT = '#dbeafe';
const BLUE_MID = '#3b82f6';
const GRAY = '#6b7280';
const GRAY_LIGHT = '#f9fafb';
const WHITE = '#ffffff';
const GREEN = '#16a34a';
const RED = '#dc2626';

const s = StyleSheet.create({
    page: { fontFamily: PDF_FONT_FAMILY, fontSize: 9, color: '#111827', paddingBottom: 40 },
    header: {
        backgroundColor: BLUE,
        padding: '20 30 16 30',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { color: WHITE, fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: BLUE_LIGHT, fontSize: 9, marginTop: 3 },
    headerRight: { alignItems: 'flex-end' },
    headerMeta: { color: BLUE_LIGHT, fontSize: 8 },
    statusBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    statusText: { fontSize: 8, fontWeight: 'bold', color: WHITE },
    body: { padding: '16 30' },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: BLUE,
        marginBottom: 8,
        borderLeft: `3 solid ${BLUE_MID}`,
        paddingLeft: 8,
    },
    section: { marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    card: { width: '23%', border: `1 solid ${BLUE_LIGHT}`, borderRadius: 5, padding: '8 10', backgroundColor: WHITE },
    cardLabel: { color: GRAY, fontSize: 7, marginBottom: 3 },
    cardValue: { color: BLUE, fontSize: 10, fontWeight: 'bold' },
    datesRow: { flexDirection: 'row', gap: 10 },
    dateCard: {
        flex: 1,
        border: `1 solid ${BLUE_LIGHT}`,
        borderRadius: 5,
        padding: '8 10',
        backgroundColor: GRAY_LIGHT,
    },
    dateLabel: { color: GRAY, fontSize: 7, marginBottom: 2 },
    dateValue: { fontSize: 9, fontWeight: 'bold' },
    noteBox: { border: `1 solid ${BLUE_LIGHT}`, borderRadius: 5, padding: '8 10', backgroundColor: GRAY_LIGHT },
    noteText: { fontSize: 8.5, lineHeight: 1.5 },
    table: { width: '100%' },
    tableHeader: { flexDirection: 'row', backgroundColor: BLUE, paddingVertical: 5, paddingHorizontal: 4 },
    tableHeaderCell: { color: WHITE, fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right' },
    tableHeaderCellFirst: { color: WHITE, fontSize: 7.5, fontWeight: 'bold', width: 28, textAlign: 'center' },
    tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4 },
    tableRowEven: { backgroundColor: BLUE_LIGHT },
    tableCell: { fontSize: 7.5, flex: 1, textAlign: 'right', color: '#374151' },
    tableCellFirst: { fontSize: 7.5, width: 28, textAlign: 'center', color: '#374151' },
    tableTotals: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 4,
        backgroundColor: BLUE,
        borderTop: `1 solid ${BLUE_MID}`,
    },
    tableTotalsCell: { color: WHITE, fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right' },
    tableTotalsCellFirst: { color: WHITE, fontSize: 7.5, width: 28 },
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: `1 solid ${BLUE_LIGHT}`,
        paddingTop: 6,
    },
    footerText: { color: GRAY, fontSize: 7 },
});

export function ModernTemplate({ emi, currencyPrefs }: PdfTemplateProps) {
    const rows = buildAmortizationRows(emi, currencyPrefs);
    const hasGst = emi.gst > 0;
    const isCompleted = emi.isCompleted;
    const statusColor = isCompleted ? GREEN : BLUE_MID;

    const totals = {
        emi: rows.reduce((a, r) => a + Number(emi.amortizationSchedules?.[rows.indexOf(r)]?.emi ?? 0), 0),
        interest: rows.reduce((a, r) => a + Number(emi.amortizationSchedules?.[rows.indexOf(r)]?.interest ?? 0), 0),
        principal: rows.reduce(
            (a, r) => a + Number(emi.amortizationSchedules?.[rows.indexOf(r)]?.principalPaid ?? 0),
            0
        ),
    };

    return (
        <Document>
            <Page size="A4" style={s.page}>
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.headerTitle}>{emi.itemName}</Text>
                        <Text style={s.headerSub}>{emi.tag ? `Category: ${emi.tag}` : 'EMI Report'}</Text>
                    </View>
                    <View style={s.headerRight}>
                        <Text style={s.headerMeta}>Generated {fmtDate(new Date())}</Text>
                        <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={s.statusText}>{isCompleted ? 'COMPLETED' : 'ACTIVE'}</Text>
                        </View>
                    </View>
                </View>

                <View style={s.body}>
                    {/* Financial Summary */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Financial Summary</Text>
                        <View style={s.grid}>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Monthly EMI</Text>
                                <Text style={s.cardValue}>{fmt(emi.emi, currencyPrefs)}</Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Principal</Text>
                                <Text style={s.cardValue}>{fmt(emi.principal, currencyPrefs)}</Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Total Loan</Text>
                                <Text style={s.cardValue}>{fmt(emi.totalLoan, currencyPrefs)}</Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Total Interest</Text>
                                <Text style={s.cardValue}>{fmt(emi.totalInterest, currencyPrefs)}</Text>
                            </View>
                            {hasGst && (
                                <View style={s.card}>
                                    <Text style={s.cardLabel}>Total GST</Text>
                                    <Text style={s.cardValue}>{fmt(emi.totalGST ?? 0, currencyPrefs)}</Text>
                                </View>
                            )}
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Interest Rate</Text>
                                <Text style={s.cardValue}>{fmtPct(emi.interestRate)}</Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Tenure</Text>
                                <Text style={s.cardValue}>{emi.tenure} mo</Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Remaining Balance</Text>
                                <Text style={[s.cardValue, { color: isCompleted ? GREEN : RED }]}>
                                    {fmt(emi.remainingBalance, currencyPrefs)}
                                </Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>EMIs Paid</Text>
                                <Text style={s.cardValue}>
                                    {emi.totalPaidEMIs} / {emi.tenure}
                                </Text>
                            </View>
                            <View style={s.card}>
                                <Text style={s.cardLabel}>Remaining Tenure</Text>
                                <Text style={s.cardValue}>{emi.remainingTenure} mo</Text>
                            </View>
                            {emi.interestDiscount && emi.interestDiscount > 0 ? (
                                <View style={s.card}>
                                    <Text style={s.cardLabel}>Interest Discount</Text>
                                    <Text style={s.cardValue}>
                                        {emi.interestDiscountType === 'percent'
                                            ? fmtPct(emi.interestDiscount)
                                            : fmt(emi.interestDiscount, currencyPrefs)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Key Dates */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Key Dates</Text>
                        <View style={s.datesRow}>
                            <View style={s.dateCard}>
                                <Text style={s.dateLabel}>Start Date</Text>
                                <Text style={s.dateValue}>{fmtDate(emi.billDate)}</Text>
                            </View>
                            <View style={s.dateCard}>
                                <Text style={s.dateLabel}>End Date</Text>
                                <Text style={s.dateValue}>{fmtDate(emi.endDate)}</Text>
                            </View>
                        </View>
                    </View>

                    <SplitBreakdownSection emi={emi} currencyPrefs={currencyPrefs} variant="modern" />

                    {/* Notes */}
                    {emi.notes && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>Notes</Text>
                            <View style={s.noteBox}>
                                <Text style={s.noteText}>{emi.notes}</Text>
                            </View>
                        </View>
                    )}

                    {/* Amortization Table */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Amortization Schedule</Text>
                        <View style={s.table}>
                            <View style={s.tableHeader}>
                                <Text style={s.tableHeaderCellFirst}>#</Text>
                                <Text style={s.tableHeaderCell}>Date</Text>
                                <Text style={s.tableHeaderCell}>EMI</Text>
                                <Text style={s.tableHeaderCell}>Interest</Text>
                                <Text style={s.tableHeaderCell}>Principal</Text>
                                <Text style={s.tableHeaderCell}>Balance</Text>
                                {hasGst && <Text style={s.tableHeaderCell}>GST</Text>}
                                {hasGst && <Text style={s.tableHeaderCell}>Total w/ GST</Text>}
                            </View>
                            {rows.map((row, i) => (
                                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowEven : {}]}>
                                    <Text style={s.tableCellFirst}>{row.month}</Text>
                                    <Text style={s.tableCell}>{row.billDate}</Text>
                                    <Text style={s.tableCell}>{row.emi}</Text>
                                    <Text style={s.tableCell}>{row.interest}</Text>
                                    <Text style={s.tableCell}>{row.principalPaid}</Text>
                                    <Text style={s.tableCell}>{row.balance}</Text>
                                    {hasGst && <Text style={s.tableCell}>{fmt(row.gst, currencyPrefs)}</Text>}
                                    {hasGst && <Text style={s.tableCell}>{row.total}</Text>}
                                </View>
                            ))}
                            <View style={s.tableTotals}>
                                <Text style={s.tableTotalsCellFirst}></Text>
                                <Text style={s.tableTotalsCell}>Totals</Text>
                                <Text style={s.tableTotalsCell}>{fmt(totals.emi, currencyPrefs)}</Text>
                                <Text style={s.tableTotalsCell}>{fmt(totals.interest, currencyPrefs)}</Text>
                                <Text style={s.tableTotalsCell}>{fmt(totals.principal, currencyPrefs)}</Text>
                                <Text style={s.tableTotalsCell}></Text>
                                {hasGst && <Text style={s.tableTotalsCell}></Text>}
                                {hasGst && <Text style={s.tableTotalsCell}></Text>}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={s.footer} fixed>
                    <Text style={s.footerText}>Generated by Emitrax</Text>
                    <Text
                        style={s.footerText}
                        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}
