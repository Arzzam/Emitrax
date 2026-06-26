import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { PDF_FONT_FAMILY } from '../pdfFonts';

import { buildAmortizationRows, fmt, fmtDate, fmtPct, PdfTemplateProps } from './shared';
import { SplitBreakdownSection } from './SplitBreakdownSection';

const GRAY = '#6b7280';
const DARK = '#111827';
const RULE = '#e5e7eb';
const MID = '#374151';

const s = StyleSheet.create({
    page: { fontFamily: PDF_FONT_FAMILY, fontSize: 9, color: DARK, padding: '40 48 52 48' },
    title: { fontSize: 22, fontWeight: 'bold', color: DARK, marginBottom: 4 },
    tagLine: { fontSize: 9, color: GRAY, marginBottom: 2 },
    rule: { borderBottom: `1.5 solid ${RULE}`, marginTop: 10, marginBottom: 20 },
    thinRule: { borderBottom: `0.5 solid ${RULE}`, marginVertical: 10 },
    metaLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    metaLabel: { color: GRAY, fontSize: 8 },
    metaValue: { fontSize: 8, fontWeight: 'bold' },
    sectionTitle: { fontSize: 9.5, fontWeight: 'bold', color: MID, marginBottom: 10, letterSpacing: 0.5 },
    section: { marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: '50%', marginBottom: 10 },
    gridLabel: { color: GRAY, fontSize: 7.5, marginBottom: 2 },
    gridValue: { fontSize: 10, fontWeight: 'bold' },
    noteText: { fontSize: 8.5, lineHeight: 1.6, color: MID },
    table: { width: '100%' },
    tableHeader: { flexDirection: 'row', paddingBottom: 5, borderBottom: `1 solid ${MID}` },
    tableHeaderCell: { fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right', color: MID },
    tableHeaderCellFirst: { fontSize: 7.5, fontWeight: 'bold', width: 28, color: MID },
    tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: `0.5 solid ${RULE}` },
    tableCell: { fontSize: 7.5, flex: 1, textAlign: 'right', color: MID },
    tableCellFirst: { fontSize: 7.5, width: 28, color: GRAY },
    tableTotals: { flexDirection: 'row', paddingTop: 6, borderTop: `1 solid ${MID}` },
    tableTotalsCell: { fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right' },
    tableTotalsCellFirst: { fontSize: 7.5, width: 28 },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 48,
        right: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: { color: GRAY, fontSize: 7 },
});

export function MinimalTemplate({ emi, currencyPrefs }: PdfTemplateProps) {
    const rows = buildAmortizationRows(emi, currencyPrefs);
    const hasGst = emi.gst > 0;

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
                <Text style={s.title}>{emi.itemName}</Text>
                {emi.tag && <Text style={s.tagLine}>{emi.tag}</Text>}
                <View style={s.rule} />

                <View style={s.metaLine}>
                    <View>
                        <Text style={s.metaLabel}>Status</Text>
                        <Text style={s.metaValue}>{emi.isCompleted ? 'Completed' : 'Active'}</Text>
                    </View>
                    <View>
                        <Text style={s.metaLabel}>Generated</Text>
                        <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
                    </View>
                </View>

                <View style={s.section}>
                    <Text style={s.sectionTitle}>FINANCIAL SUMMARY</Text>
                    <View style={s.grid}>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Monthly EMI</Text>
                            <Text style={s.gridValue}>{fmt(emi.emi, currencyPrefs)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Principal</Text>
                            <Text style={s.gridValue}>{fmt(emi.principal, currencyPrefs)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Total Loan</Text>
                            <Text style={s.gridValue}>{fmt(emi.totalLoan, currencyPrefs)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Total Interest</Text>
                            <Text style={s.gridValue}>{fmt(emi.totalInterest, currencyPrefs)}</Text>
                        </View>
                        {hasGst && (
                            <View style={s.gridItem}>
                                <Text style={s.gridLabel}>Total GST</Text>
                                <Text style={s.gridValue}>{fmt(emi.totalGST ?? 0, currencyPrefs)}</Text>
                            </View>
                        )}
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Interest Rate</Text>
                            <Text style={s.gridValue}>{fmtPct(emi.interestRate)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Tenure</Text>
                            <Text style={s.gridValue}>{emi.tenure} months</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Remaining Balance</Text>
                            <Text style={s.gridValue}>{fmt(emi.remainingBalance, currencyPrefs)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>EMIs Paid</Text>
                            <Text style={s.gridValue}>
                                {emi.totalPaidEMIs} / {emi.tenure}
                            </Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Remaining Tenure</Text>
                            <Text style={s.gridValue}>{emi.remainingTenure} months</Text>
                        </View>
                        {emi.interestDiscount && emi.interestDiscount > 0 ? (
                            <View style={s.gridItem}>
                                <Text style={s.gridLabel}>Interest Discount</Text>
                                <Text style={s.gridValue}>
                                    {emi.interestDiscountType === 'percent'
                                        ? fmtPct(emi.interestDiscount)
                                        : fmt(emi.interestDiscount, currencyPrefs)}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={s.thinRule} />

                <View style={s.section}>
                    <Text style={s.sectionTitle}>KEY DATES</Text>
                    <View style={s.grid}>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>Start Date</Text>
                            <Text style={s.gridValue}>{fmtDate(emi.billDate)}</Text>
                        </View>
                        <View style={s.gridItem}>
                            <Text style={s.gridLabel}>End Date</Text>
                            <Text style={s.gridValue}>{fmtDate(emi.endDate)}</Text>
                        </View>
                    </View>
                </View>

                <SplitBreakdownSection
                    emi={emi}
                    currencyPrefs={currencyPrefs}
                    variant="minimal"
                    sectionTitle="SPLIT BREAKDOWN"
                />

                {emi.notes && (
                    <>
                        <View style={s.thinRule} />
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>NOTES</Text>
                            <Text style={s.noteText}>{emi.notes}</Text>
                        </View>
                    </>
                )}

                <View style={s.thinRule} />

                <View style={s.section}>
                    <Text style={s.sectionTitle}>AMORTIZATION SCHEDULE</Text>
                    <View style={s.table}>
                        <View style={s.tableHeader}>
                            <Text style={s.tableHeaderCellFirst}>#</Text>
                            <Text style={s.tableHeaderCell}>Date</Text>
                            <Text style={s.tableHeaderCell}>EMI</Text>
                            <Text style={s.tableHeaderCell}>Interest</Text>
                            <Text style={s.tableHeaderCell}>Principal</Text>
                            <Text style={s.tableHeaderCell}>Balance</Text>
                            {hasGst && <Text style={s.tableHeaderCell}>Total w/ GST</Text>}
                        </View>
                        {rows.map((row, i) => (
                            <View key={i} style={s.tableRow}>
                                <Text style={s.tableCellFirst}>{row.month}</Text>
                                <Text style={s.tableCell}>{row.billDate}</Text>
                                <Text style={s.tableCell}>{row.emi}</Text>
                                <Text style={s.tableCell}>{row.interest}</Text>
                                <Text style={s.tableCell}>{row.principalPaid}</Text>
                                <Text style={s.tableCell}>{row.balance}</Text>
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
                        </View>
                    </View>
                </View>

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
