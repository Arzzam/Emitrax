export interface IEmiShare {
    id: string;
    emiId: string;
    sharedWithUserId: string;
    sharedWithUserEmail?: string;
    permission: 'read' | 'write';
    createdBy: string;
    createdAt: string;
    user_profiles?: {
        email: string;
    };
}

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
    userId?: string;
    // Shared EMI fields
    isOwner?: boolean;
    permission?: 'read' | 'write';
    sharedWith?: IEmiShare[];
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
