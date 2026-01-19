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
    // Computed fields (set by service layer)
    displayName?: string; // Name to show in UI
    displayEmail?: string; // Email to show in UI
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
