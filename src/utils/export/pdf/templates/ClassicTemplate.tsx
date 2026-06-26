import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { PDF_FONT_FAMILY } from '../pdfFonts';

import { buildAmortizationRows, fmt, fmtDate, fmtPct, PdfTemplateProps } from './shared';
import { SplitBreakdownSection } from './SplitBreakdownSection';

const DARK_BLUE = '#1e3a5f';
const GRAY = '#6b7280';
const BORDER = '#374151';
const LIGHT_GRAY = '#f3f4f6';

const s = StyleSheet.create({
    page: { fontFamily: PDF_FONT_FAMILY, fontSize: 9, color: '#111827', padding: '24 36 48 36' },
    topRule: { borderTop: `3 solid ${DARK_BLUE}`, marginBottom: 14 },
    docTitle: { fontSize: 16, fontWeight: 'bold', color: DARK_BLUE, marginBottom: 2 },
    docSubtitle: { fontSize: 9, color: GRAY, marginBottom: 2 },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
        borderBottom: `1 solid ${BORDER}`,
        paddingBottom: 10,
    },
    metaLeft: {},
    metaRight: { textAlign: 'right' },
    metaLabel: { color: GRAY, fontSize: 8 },
    metaValue: { fontWeight: 'bold', fontSize: 9 },
    sectionHeader: { fontSize: 10, fontWeight: 'bold', color: DARK_BLUE, marginBottom: 6, textDecoration: 'underline' },
    section: { marginBottom: 14 },
    row: { flexDirection: 'row', borderBottom: `1 solid #e5e7eb`, paddingVertical: 4 },
    rowLabel: { width: '40%', color: GRAY, fontSize: 8.5 },
    rowValue: { width: '60%', fontWeight: 'bold', fontSize: 8.5 },
    noteText: { fontSize: 8.5, lineHeight: 1.5, color: '#374151' },
    table: { width: '100%', border: `1 solid ${BORDER}` },
    tableHeader: { flexDirection: 'row', backgroundColor: DARK_BLUE, padding: '5 4' },
    tableHeaderCell: { color: '#fff', fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right', paddingRight: 4 },
    tableHeaderCellFirst: { color: '#fff', fontSize: 7.5, fontWeight: 'bold', width: 26, textAlign: 'center' },
    tableRow: { flexDirection: 'row', padding: '4 4', borderBottom: `1 solid #e5e7eb` },
    tableRowEven: { backgroundColor: LIGHT_GRAY },
    tableCell: { fontSize: 7.5, flex: 1, textAlign: 'right', paddingRight: 4 },
    tableCellFirst: { fontSize: 7.5, width: 26, textAlign: 'center' },
    tableTotals: { flexDirection: 'row', padding: '5 4', backgroundColor: DARK_BLUE },
    tableTotalsCell: { color: '#fff', fontSize: 7.5, fontWeight: 'bold', flex: 1, textAlign: 'right', paddingRight: 4 },
    tableTotalsCellFirst: { color: '#fff', fontSize: 7.5, width: 26 },
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 36,
        right: 36,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: `1 solid #d1d5db`,
        paddingTop: 5,
    },
    footerText: { color: GRAY, fontSize: 7 },
    twoCol: { flexDirection: 'row', gap: 20 },
    col: { flex: 1 },
});

export function ClassicTemplate({ emi, currencyPrefs }: PdfTemplateProps) {
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
                <View style={s.topRule} />
                <Text style={s.docTitle}>{emi.itemName}</Text>
                <Text style={s.docSubtitle}>{emi.tag ? `Category: ${emi.tag}` : 'EMI Report'}</Text>

                <View style={s.metaRow}>
                    <View style={s.metaLeft}>
                        <Text style={s.metaLabel}>Status</Text>
                        <Text style={s.metaValue}>{emi.isCompleted ? 'Completed' : 'Active'}</Text>
                    </View>
                    <View style={s.metaRight}>
                        <Text style={s.metaLabel}>Generated On</Text>
                        <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
                    </View>
                </View>

                <View style={s.twoCol}>
                    <View style={s.col}>
                        <View style={s.section}>
                            <Text style={s.sectionHeader}>Loan Details</Text>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Principal</Text>
                                <Text style={s.rowValue}>{fmt(emi.principal, currencyPrefs)}</Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Interest Rate</Text>
                                <Text style={s.rowValue}>{fmtPct(emi.interestRate)}</Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Tenure</Text>
                                <Text style={s.rowValue}>{emi.tenure} months</Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Monthly EMI</Text>
                                <Text style={s.rowValue}>{fmt(emi.emi, currencyPrefs)}</Text>
                            </View>
                            {hasGst && (
                                <View style={s.row}>
                                    <Text style={s.rowLabel}>GST Rate</Text>
                                    <Text style={s.rowValue}>{fmtPct(emi.gst)}</Text>
                                </View>
                            )}
                            {emi.interestDiscount && emi.interestDiscount > 0 ? (
                                <View style={s.row}>
                                    <Text style={s.rowLabel}>Interest Discount</Text>
                                    <Text style={s.rowValue}>
                                        {emi.interestDiscountType === 'percent'
                                            ? fmtPct(emi.interestDiscount)
                                            : fmt(emi.interestDiscount, currencyPrefs)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                    <View style={s.col}>
                        <View style={s.section}>
                            <Text style={s.sectionHeader}>Financial Totals</Text>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Total Loan Amount</Text>
                                <Text style={s.rowValue}>{fmt(emi.totalLoan, currencyPrefs)}</Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Total Interest</Text>
                                <Text style={s.rowValue}>{fmt(emi.totalInterest, currencyPrefs)}</Text>
                            </View>
                            {hasGst && (
                                <View style={s.row}>
                                    <Text style={s.rowLabel}>Total GST</Text>
                                    <Text style={s.rowValue}>{fmt(emi.totalGST ?? 0, currencyPrefs)}</Text>
                                </View>
                            )}
                            <View style={s.row}>
                                <Text style={s.rowLabel}>EMIs Paid</Text>
                                <Text style={s.rowValue}>
                                    {emi.totalPaidEMIs} of {emi.tenure}
                                </Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Remaining Tenure</Text>
                                <Text style={s.rowValue}>{emi.remainingTenure} months</Text>
                            </View>
                            <View style={s.row}>
                                <Text style={s.rowLabel}>Remaining Balance</Text>
                                <Text style={s.rowValue}>{fmt(emi.remainingBalance, currencyPrefs)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={s.section}>
                    <Text style={s.sectionHeader}>Key Dates</Text>
                    <View style={s.row}>
                        <Text style={s.rowLabel}>Start Date</Text>
                        <Text style={s.rowValue}>{fmtDate(emi.billDate)}</Text>
                    </View>
                    <View style={s.row}>
                        <Text style={s.rowLabel}>End Date</Text>
                        <Text style={s.rowValue}>{fmtDate(emi.endDate)}</Text>
                    </View>
                </View>

                <SplitBreakdownSection emi={emi} currencyPrefs={currencyPrefs} variant="classic" />

                {emi.notes && (
                    <View style={s.section}>
                        <Text style={s.sectionHeader}>Notes</Text>
                        <Text style={s.noteText}>{emi.notes}</Text>
                    </View>
                )}

                <View style={s.section}>
                    <Text style={s.sectionHeader}>Amortization Schedule</Text>
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
                            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowEven : {}]}>
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
