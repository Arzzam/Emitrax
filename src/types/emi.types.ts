import type { NumberFormatMode } from '@/types/account.types';

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

export interface IEmiSplit {
    id: string;
    emiId: string;
    userId?: string; // Nullable for external participants
    participantName?: string; // For external participants
    participantEmail?: string; // For external participants
    splitPercentage: number; // 0-100
    splitAmount: number; // Calculated: EMI * splitPercentage / 100
    isExternal: boolean; // True if not a registered user
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    // For registered users
    user_profiles?: {
        email: string;
    };
}

// Input type for creating splits
export interface IEmiSplitInput {
    userId?: string; // For registered users
    participantName?: string; // For external participants
    participantEmail?: string; // For external participants
    splitPercentage: number;
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
    processingFee?: number;
    processingFeeGst?: number;
    totalLoan: number;
    /** ISO 4217 code the loan is denominated in. Fixed per EMI; see per-emi-currency-plan.md. */
    currency: string;
    totalPaidEMIs: number;
    totalInterest: number;
    remainingBalance: number;
    remainingTenure: number;
    endDate: Date;
    isCompleted: boolean;
    isArchived?: boolean;
    amortizationSchedules: ScheduleData[];
    tag?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    userId?: string;
    // Shared EMI fields
    isOwner?: boolean;
    permission?: 'read' | 'write';
    sharedWith?: IEmiShare[];
    // Split EMI fields
    splits?: IEmiSplit[]; // Array of splits for this EMI
    mySplit?: IEmiSplit; // Current user's split (if any)
    mySplitAmount?: number; // Current user's portion of EMI
    totalSplitPercentage?: number; // Sum of all splits (should be 100)
    isSplit?: boolean; // Whether this EMI is split
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

/** A public read-only link to one EMI. See context/plan/emi-public-share-link-plan.md. */
export interface IEmiShareLink {
    id: string;
    emiId: string;
    token: string;
    createdAt: string;
}

/** The fields get_public_emi() exposes - an allow-list, never the whole row. */
export type PublicEmiData = Pick<
    IEmi,
    | 'id'
    | 'itemName'
    | 'currency'
    | 'principal'
    | 'interestRate'
    | 'interestDiscount'
    | 'interestDiscountType'
    | 'tenure'
    | 'billDate'
    | 'endDate'
    | 'emi'
    | 'totalLoan'
    | 'totalInterest'
    | 'gst'
    | 'totalGST'
    | 'processingFee'
    | 'processingFeeGst'
    | 'totalPaidEMIs'
    | 'remainingBalance'
    | 'remainingTenure'
    | 'isCompleted'
    | 'tag'
    | 'amortizationSchedules'
>;

export interface IPublicEmi {
    emi: PublicEmiData;
    /** The owner's number style, so the viewer sees the figures as the owner does. */
    format: {
        locale: string;
        numberFormat: NumberFormatMode;
    };
}
