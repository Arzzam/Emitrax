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
            processingFee: number | null;
            processingFeeGst: number | null;
            remainingBalance: number;
            remainingTenure: number;
            endDate: string;
            isCompleted: boolean;
            notes: string | null;
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
    emiShares: {
        Row: {
            id: string;
            emiId: string;
            sharedWithUserId: string;
            permission: 'read' | 'write';
            createdBy: string;
            createdAt: string;
        };
        Insert: Omit<Tables['emiShares']['Row'], 'id' | 'createdAt'>;
        Update: Partial<Omit<Tables['emiShares']['Row'], 'id' | 'createdAt'>>;
    };
    emiSplits: {
        Row: {
            id: string;
            emiId: string;
            userId: string | null;
            participantName: string | null;
            participantEmail: string | null;
            splitPercentage: number;
            splitAmount: number | null;
            isExternal: boolean;
            createdBy: string;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['emiSplits']['Row'], 'id' | 'createdAt' | 'updatedAt' | 'splitAmount'>;
        Update: Partial<Omit<Tables['emiSplits']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    user_profiles: {
        Row: {
            id: string;
            email: string | null;
            userdata: Record<string, unknown> | null;
            appdata: Record<string, unknown> | null;
            display_name: string | null;
        };
        Insert: Omit<Tables['user_profiles']['Row'], 'id'> & { id: string };
        Update: Partial<Omit<Tables['user_profiles']['Row'], 'id'>> & { id?: string };
    };
    user_account_preferences: {
        Row: {
            user_id: string;
            phone: string | null;
            avatar_url: string | null;
            locale: string;
            currency: string;
            number_format: string;
            filter_config: string | null;
            export_config: string | null;
            created_at: string;
            updated_at: string;
        };
        Insert: Omit<Tables['user_account_preferences']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Tables['user_account_preferences']['Row'], 'user_id' | 'created_at' | 'updated_at'>> & {
            user_id?: string;
        };
    };
    loan_scenarios: {
        Row: {
            id: string;
            emiId: string;
            userId: string;
            name: string;
            scenarioType: 'foreclosure';
            simulationDate: string;
            foreclosureChargeRate: number;
            foreclosureChargeAmount: number;
            foreclosureChargeGstRate: number;
            includeNextInstallmentInterest: boolean;
            outstandingPrincipal: number;
            accruedInterest: number;
            accruedGst: number;
            foreclosureCharges: number;
            foreclosureChargeGst: number;
            totalPayoff: number;
            paidToDate: number;
            baselineRemainingOutflow: number;
            baselineTotalOutflow: number;
            foreclosureTotalOutflow: number;
            interestSaved: number;
            gstSaved: number;
            netSavings: number;
            monthsSaved: number;
            confidence: 'exact' | 'estimated';
            notes: string | null;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['loan_scenarios']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
        };
        Update: Partial<Omit<Tables['loan_scenarios']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    loan_scenario_breakdowns: {
        Row: {
            id: string;
            scenarioId: string;
            component: string;
            label: string;
            amount: number;
            sortOrder: number;
            createdAt: string;
        };
        Insert: Omit<Tables['loan_scenario_breakdowns']['Row'], 'id' | 'createdAt'> & {
            id?: string;
            createdAt?: string;
        };
        Update: Partial<Omit<Tables['loan_scenario_breakdowns']['Row'], 'id' | 'createdAt'>>;
    };
    cc_issuers: {
        Row: {
            id: string;
            userId: string;
            name: string;
            color: string | null;
            sortOrder: number;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['cc_issuers']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
        };
        Update: Partial<Omit<Tables['cc_issuers']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    cc_cards: {
        Row: {
            id: string;
            userId: string;
            issuerId: string;
            name: string;
            last4: string | null;
            isActive: boolean;
            sortOrder: number;
            /** Day of month the statement is generated (1-31). */
            statementDay: number | null;
            /** Day of month the payment is due (1-31). */
            dueDay: number | null;
            creditLimit: number | null;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['cc_cards']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
            statementDay?: number | null;
            dueDay?: number | null;
            creditLimit?: number | null;
        };
        Update: Partial<Omit<Tables['cc_cards']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    cc_payment_entries: {
        Row: {
            id: string;
            userId: string;
            cardId: string;
            /** First day of the month, 'yyyy-MM-dd'. */
            periodMonth: string;
            amount: number;
            cashAmount: number;
            note: string | null;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['cc_payment_entries']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
        };
        Update: Partial<Omit<Tables['cc_payment_entries']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    cc_bill_entries: {
        Row: {
            id: string;
            userId: string;
            cardId: string;
            /**
             * First day of the month the STATEMENT WAS GENERATED, 'yyyy-MM-dd'.
             * Offset by one month from cc_payment_entries.periodMonth in the
             * general case - never join the two on their month columns.
             */
            statementMonth: string;
            status: 'issued' | 'no_statement';
            /** NULL only when status is 'no_statement'. May be negative (credit balance). */
            totalDue: number | null;
            minimumDue: number | null;
            statementDate: string | null;
            dueDate: string | null;
            note: string | null;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['cc_bill_entries']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
            status?: 'issued' | 'no_statement';
        };
        Update: Partial<Omit<Tables['cc_bill_entries']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
    cc_tracker_years: {
        Row: {
            id: string;
            userId: string;
            /** Financial year key, e.g. '2026-27'. */
            financialYear: string;
            notes: string | null;
            thresholdAmount: number;
            cashThresholdAmount: number;
            createdAt: string;
            updatedAt: string;
        };
        Insert: Omit<Tables['cc_tracker_years']['Row'], 'id' | 'createdAt' | 'updatedAt'> & {
            id?: string;
            createdAt?: string;
            updatedAt?: string;
            thresholdAmount?: number;
            cashThresholdAmount?: number;
        };
        Update: Partial<Omit<Tables['cc_tracker_years']['Row'], 'id' | 'createdAt' | 'updatedAt'>>;
    };
};

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;

export type Database = {
    public: {
        Tables: Tables;
    };
};
