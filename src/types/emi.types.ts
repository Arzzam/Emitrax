export interface IEmi {
    id: string;
    itemName: string;
    principal: number;
    interestRate: number;
    billDate: Date;
    tenure: number;
    interestDiscount: number;
    interestDiscountType: 'percent' | 'amount';
    emi: number;
    gst: number;
    totalGST: number;
    totalLoan: number;
    totalPaidEMIs: number;
    totalInterest: number;
    remainingBalance: number;
    remainingTenure: number;
    endDate: Date;
    isCompleted: boolean;
    isArchived?: boolean;
    amortizationSchedules: ScheduleData[];
    tag?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScheduleData {
    month: number;
    billDate: string;
    emi: string;
    interest: string;
    principalPaid: string;
    balance: string;
    gst: number;
}
