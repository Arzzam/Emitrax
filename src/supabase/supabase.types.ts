export type Tables = {
    emis: {
        Row: {
            id: string;
            userId: string;
            itemName: string;
            principal: number;
            interestRate: number;
            billDate: string;
            tenure: number;
            interestDiscount: number;
            interestDiscountType: 'percent' | 'amount';
            emi: number;
            totalLoan: number;
            totalPaidEMIs: number;
            totalInterest: number;
            gst: number;
            remainingBalance: number;
            remainingTenure: number;
            endDate: string;
            isCompleted: boolean;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['emis']['Row'], 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Tables['emis']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    amortizationSchedules: {
        Row: {
            id: string;
            emiId: string;
            month: number;
            billDate: string;
            emi: number;
            interest: number;
            principalPaid: number;
            balance: number;
            gst: number;
            isPaid: boolean;
            createdAt: string;
        };
        Insert: Omit<Tables['amortizationSchedules']['Row'], 'id' | 'createdAt'>;
        Update: Partial<Omit<Tables['amortizationSchedules']['Row'], 'id' | 'createdAt'>>;
    };
};

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;

export type Database = {
    public: {
        Tables: Tables;
    };
};
