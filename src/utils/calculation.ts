import { addMonths, format, isBefore } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { IEmi, ScheduleData } from '@/types/emi.types';
import { roundMoney, toMoneyString } from '@/utils/money';

export function coerceOptionalNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') {
        return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export const calculateProcessingFeeCharges = (
    processingFee?: number | string | null,
    processingFeeGst?: number | string | null
) => {
    const fee = coerceOptionalNumber(processingFee);
    const gstRate = coerceOptionalNumber(processingFeeGst);

    if (fee <= 0 || gstRate <= 0) {
        return { processingFeeGstAmount: 0 };
    }

    return {
        processingFeeGstAmount: roundMoney((fee * gstRate) / 100),
    };
};

export const calculateTotalLoanOutflow = (params: {
    principal: number | string;
    totalInterest: number | string;
    totalGST: number | string;
    processingFee?: number | string | null;
    processingFeeGst?: number | string | null;
}): number => {
    const principal = coerceOptionalNumber(params.principal);
    const totalInterest = coerceOptionalNumber(params.totalInterest);
    const totalGST = coerceOptionalNumber(params.totalGST);
    const processingFee = coerceOptionalNumber(params.processingFee);
    const processingFeeGst = coerceOptionalNumber(params.processingFeeGst);
    const { processingFeeGstAmount } = calculateProcessingFeeCharges(processingFee, processingFeeGst);
    const oneTimeCharges = processingFee + processingFeeGstAmount;

    return roundMoney(principal + totalInterest + totalGST + oneTimeCharges);
};

/** Reconcile stored loan totals with processing-fee charges (handles stale DB rows and string numerics). */
export const normalizeEmiFinancials = (emi: IEmi): IEmi => {
    const processingFee = coerceOptionalNumber(emi.processingFee);
    const processingFeeGst = coerceOptionalNumber(emi.processingFeeGst);
    const totalLoan = calculateTotalLoanOutflow({
        principal: emi.principal,
        totalInterest: emi.totalInterest,
        totalGST: emi.totalGST,
        processingFee,
        processingFeeGst,
    });

    return {
        ...emi,
        totalLoan,
        processingFee: processingFee > 0 ? processingFee : undefined,
        processingFeeGst: processingFeeGst > 0 ? processingFeeGst : undefined,
    };
};

export const calculateEMI = (
    // {
    //     principal,
    //     interestRate,
    //     tenure,
    //     billDate,
    //     itemName,
    //     interestDiscount,
    //     interestDiscountType,
    //     gst,
    //     tag,
    // }: TFormValues,
    emiData: IEmi,
    id?: string
): IEmi => {
    const { principal, interestRate, tenure, billDate, itemName, interestDiscount, interestDiscountType, gst, tag } =
        emiData;
    const processingFee = coerceOptionalNumber(emiData.processingFee);
    const processingFeeGst = coerceOptionalNumber(emiData.processingFeeGst);
    const P = principal;
    const r = interestRate / 100 / 12;
    const n = tenure;

    let emiValue = 0;
    if (r === 0) {
        emiValue = P / n;
    } else {
        emiValue = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
        emiValue = roundMoney(emiValue);
    }

    const { scheduleData, totalInterest, totalGST } = calculateAmortizationSchedule({
        principal: P,
        n,
        r,
        billDate,
        emiValue,
        interestDiscount: interestDiscount || 0,
        interestDiscountType: interestDiscountType || 'percent',
        gst: gst || 0,
    });

    const { completedMonths, remainingMonths } = calculateRemainingTenure(billDate, n, new Date());

    const totalPrincipalPaid = scheduleData.reduce((acc, curr, idx) => {
        if (idx < completedMonths) {
            return acc + parseFloat(curr.principalPaid);
        }
        return acc;
    }, 0);

    const payload: IEmi = {
        ...(emiData || {}),
        id: id ? id : uuidv4(),
        itemName,
        principal,
        interestRate,
        tenure,
        billDate,
        interestDiscount: interestDiscount || 0,
        interestDiscountType: interestDiscountType || 'percent',
        emi: emiValue,
        totalLoan: calculateTotalLoanOutflow({
            principal: P,
            totalInterest,
            totalGST,
            processingFee,
            processingFeeGst,
        }),
        totalPaidEMIs: completedMonths,
        totalInterest,
        remainingBalance: roundMoney(P + totalGST - totalPrincipalPaid),
        remainingTenure: remainingMonths,
        endDate: addMonths(billDate, n - 1),
        amortizationSchedules: scheduleData,
        isCompleted: remainingMonths === 0,
        gst: gst || 0,
        totalGST: roundMoney(totalGST),
        processingFee: processingFee > 0 ? processingFee : undefined,
        processingFeeGst: processingFeeGst > 0 ? processingFeeGst : undefined,
        tag: tag || 'Personal',
        notes: emiData.notes ?? undefined,
    };

    return payload;
};

export const calculateAmortizationSchedule = ({
    principal,
    n,
    r,
    billDate,
    emiValue,
    interestDiscount,
    interestDiscountType,
    gst,
}: {
    principal: number;
    n: number;
    r: number;
    billDate: Date;
    emiValue: number;
    interestDiscount: number;
    interestDiscountType: 'percent' | 'amount';
    gst: number;
}) => {
    let remaining = principal;
    const scheduleData: ScheduleData[] = [];
    let totalInterest = 0;
    let lastPaymentDate = billDate;
    let totalGST = 0;

    for (let i = 1; i <= n; i++) {
        const interest = remaining * r;
        const principalPaid = emiValue - interest;
        remaining -= principalPaid;
        totalInterest += interest;
        const gstAmount = roundMoney((interest * gst) / 100);
        totalGST += gstAmount;

        scheduleData.push({
            month: i,
            billDate: format(lastPaymentDate, 'yyyy-MM-dd'),
            emi: toMoneyString(emiValue),
            interest: toMoneyString(interest),
            principalPaid: toMoneyString(principalPaid),
            balance: toMoneyString(remaining),
            gst: gstAmount,
        });

        lastPaymentDate = addMonths(lastPaymentDate, 1);
    }

    const totalInterestWithDiscount = applyDiscount(totalInterest, interestDiscount, interestDiscountType);

    return {
        scheduleData,
        totalInterest: totalInterestWithDiscount,
        totalGST,
    };
};

export const calculateRemainingTenure = (
    billStartDate: Date,
    totalTenure: number,
    currentDate: Date
): {
    completedMonths: number;
    remainingMonths: number;
} => {
    const today = currentDate;

    let completedMonths = 0;

    for (let i = 0; i < totalTenure; i++) {
        const cycleDate = addMonths(billStartDate, i);
        if (isBefore(cycleDate, today)) {
            completedMonths++;
        }
    }

    const remainingMonths = totalTenure - completedMonths;

    return { completedMonths, remainingMonths };
};

function applyDiscount(totalInterest: number, discountValue: number, discountType: 'percent' | 'amount'): number {
    let value = 0;
    if (discountType === 'percent') {
        value = Math.max(totalInterest - totalInterest * (discountValue / 100), 0);
    } else {
        value = Math.max(totalInterest - discountValue, 0);
    }
    return roundMoney(value);
}
