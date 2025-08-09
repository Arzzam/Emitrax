import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, isBefore } from 'date-fns';

import { IEmi, ScheduleData } from '@/types/emi.types';
import { TFormValues } from '@/components/emi/EMIForm';

export const calculateEMI = (
    {
        principal,
        interestRate,
        tenure,
        billDate,
        itemName,
        interestDiscount,
        interestDiscountType,
        gst,
        tag,
    }: TFormValues,
    id?: string
): IEmi => {
    const P = principal;
    const r = interestRate / 100 / 12;
    const n = tenure;

    let emiValue = 0;
    if (r === 0) {
        emiValue = P / n;
    } else {
        emiValue = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
        emiValue = Number(emiValue.toFixed(2));
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
        id: id ? id : uuidv4(),
        itemName,
        principal,
        interestRate,
        tenure,
        billDate,
        interestDiscount: interestDiscount || 0,
        interestDiscountType: interestDiscountType || 'percent',
        emi: emiValue,
        totalLoan: Number((P + totalInterest + totalGST).toFixed(2)),
        totalPaidEMIs: completedMonths,
        totalInterest,
        remainingBalance: Number((P + totalGST - totalPrincipalPaid).toFixed(2)),
        remainingTenure: remainingMonths,
        endDate: addMonths(billDate, n - 1),
        amortizationSchedules: scheduleData,
        isCompleted: remainingMonths === 0,
        gst: gst || 0,
        totalGST: Number(totalGST.toFixed(2)),
        tag: tag || 'Personal',
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
        const gstAmount = Number(((interest * gst) / 100).toFixed(2));
        totalGST += gstAmount;

        scheduleData.push({
            month: i,
            billDate: format(lastPaymentDate, 'yyyy-MM-dd'),
            emi: emiValue.toFixed(2),
            interest: interest.toFixed(2),
            principalPaid: principalPaid.toFixed(2),
            balance: remaining.toFixed(2),
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
    return Number(value.toFixed(2));
}
