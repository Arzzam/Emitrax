export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '12.2.3 (519615d)';
    };
    public: {
        Tables: {
            amortizationSchedules: {
                Row: {
                    balance: number;
                    billDate: string;
                    createdAt: string | null;
                    emi: number;
                    emiId: string;
                    gst: number | null;
                    id: string;
                    interest: number;
                    isPaid: boolean | null;
                    month: number;
                    principalPaid: number;
                };
                Insert: {
                    balance: number;
                    billDate: string;
                    createdAt?: string | null;
                    emi: number;
                    emiId: string;
                    gst?: number | null;
                    id?: string;
                    interest: number;
                    isPaid?: boolean | null;
                    month: number;
                    principalPaid: number;
                };
                Update: {
                    balance?: number;
                    billDate?: string;
                    createdAt?: string | null;
                    emi?: number;
                    emiId?: string;
                    gst?: number | null;
                    id?: string;
                    interest?: number;
                    isPaid?: boolean | null;
                    month?: number;
                    principalPaid?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'amortizationschedules_emiid_fkey';
                        columns: ['emiId'];
                        isOneToOne: false;
                        referencedRelation: 'emis';
                        referencedColumns: ['id'];
                    },
                ];
            };
            cc_bill_entries: {
                Row: {
                    cardId: string;
                    createdAt: string | null;
                    dueDate: string | null;
                    id: string;
                    minimumDue: number | null;
                    note: string | null;
                    statementDate: string | null;
                    statementMonth: string;
                    status: string;
                    totalDue: number | null;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    cardId: string;
                    createdAt?: string | null;
                    dueDate?: string | null;
                    id?: string;
                    minimumDue?: number | null;
                    note?: string | null;
                    statementDate?: string | null;
                    statementMonth: string;
                    status?: string;
                    totalDue?: number | null;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    cardId?: string;
                    createdAt?: string | null;
                    dueDate?: string | null;
                    id?: string;
                    minimumDue?: number | null;
                    note?: string | null;
                    statementDate?: string | null;
                    statementMonth?: string;
                    status?: string;
                    totalDue?: number | null;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'cc_bill_entries_cardid_fkey';
                        columns: ['cardId'];
                        isOneToOne: false;
                        referencedRelation: 'cc_cards';
                        referencedColumns: ['id'];
                    },
                ];
            };
            cc_cards: {
                Row: {
                    createdAt: string | null;
                    creditLimit: number | null;
                    dueDay: number | null;
                    id: string;
                    isActive: boolean;
                    issuerId: string;
                    last4: string | null;
                    name: string;
                    sortOrder: number;
                    statementDay: number | null;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    createdAt?: string | null;
                    creditLimit?: number | null;
                    dueDay?: number | null;
                    id?: string;
                    isActive?: boolean;
                    issuerId: string;
                    last4?: string | null;
                    name: string;
                    sortOrder?: number;
                    statementDay?: number | null;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    createdAt?: string | null;
                    creditLimit?: number | null;
                    dueDay?: number | null;
                    id?: string;
                    isActive?: boolean;
                    issuerId?: string;
                    last4?: string | null;
                    name?: string;
                    sortOrder?: number;
                    statementDay?: number | null;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'cc_cards_issuerid_fkey';
                        columns: ['issuerId'];
                        isOneToOne: false;
                        referencedRelation: 'cc_issuers';
                        referencedColumns: ['id'];
                    },
                ];
            };
            cc_issuers: {
                Row: {
                    color: string | null;
                    createdAt: string | null;
                    id: string;
                    name: string;
                    sortOrder: number;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    color?: string | null;
                    createdAt?: string | null;
                    id?: string;
                    name: string;
                    sortOrder?: number;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    color?: string | null;
                    createdAt?: string | null;
                    id?: string;
                    name?: string;
                    sortOrder?: number;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [];
            };
            cc_payment_entries: {
                Row: {
                    amount: number;
                    cardId: string;
                    cashAmount: number;
                    createdAt: string | null;
                    id: string;
                    note: string | null;
                    periodMonth: string;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    amount?: number;
                    cardId: string;
                    cashAmount?: number;
                    createdAt?: string | null;
                    id?: string;
                    note?: string | null;
                    periodMonth: string;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    amount?: number;
                    cardId?: string;
                    cashAmount?: number;
                    createdAt?: string | null;
                    id?: string;
                    note?: string | null;
                    periodMonth?: string;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'cc_payment_entries_cardid_fkey';
                        columns: ['cardId'];
                        isOneToOne: false;
                        referencedRelation: 'cc_cards';
                        referencedColumns: ['id'];
                    },
                ];
            };
            cc_tracker_years: {
                Row: {
                    cashThresholdAmount: number;
                    createdAt: string | null;
                    financialYear: string;
                    id: string;
                    notes: string | null;
                    thresholdAmount: number;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    cashThresholdAmount?: number;
                    createdAt?: string | null;
                    financialYear: string;
                    id?: string;
                    notes?: string | null;
                    thresholdAmount?: number;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    cashThresholdAmount?: number;
                    createdAt?: string | null;
                    financialYear?: string;
                    id?: string;
                    notes?: string | null;
                    thresholdAmount?: number;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [];
            };
            emiPartPayments: {
                Row: {
                    amount: number;
                    createdAt: string | null;
                    createdBy: string;
                    emiId: string;
                    id: string;
                    mode: string | null;
                    originalTenure: number | null;
                    paymentDate: string;
                    type: string;
                    undoneAt: string | null;
                };
                Insert: {
                    amount: number;
                    createdAt?: string | null;
                    createdBy: string;
                    emiId: string;
                    id?: string;
                    mode?: string | null;
                    originalTenure?: number | null;
                    paymentDate: string;
                    type: string;
                    undoneAt?: string | null;
                };
                Update: {
                    amount?: number;
                    createdAt?: string | null;
                    createdBy?: string;
                    emiId?: string;
                    id?: string;
                    mode?: string | null;
                    originalTenure?: number | null;
                    paymentDate?: string;
                    type?: string;
                    undoneAt?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'emipartpayments_emiid_fkey';
                        columns: ['emiId'];
                        isOneToOne: false;
                        referencedRelation: 'emis';
                        referencedColumns: ['id'];
                    },
                ];
            };
            emis: {
                Row: {
                    billDate: string;
                    createdAt: string | null;
                    emi: number;
                    endDate: string;
                    gst: number | null;
                    id: string;
                    interestDiscount: number | null;
                    interestDiscountType: string | null;
                    interestRate: number;
                    isArchived: boolean | null;
                    isCompleted: boolean | null;
                    itemName: string;
                    notes: string | null;
                    principal: number;
                    processingFee: number | null;
                    processingFeeGst: number | null;
                    remainingBalance: number;
                    remainingTenure: number;
                    tag: string | null;
                    tenure: number;
                    totalGST: number | null;
                    totalInterest: number;
                    totalLoan: number;
                    totalPaidEMIs: number | null;
                    updatedAt: string | null;
                    userId: string | null;
                };
                Insert: {
                    billDate: string;
                    createdAt?: string | null;
                    emi: number;
                    endDate: string;
                    gst?: number | null;
                    id?: string;
                    interestDiscount?: number | null;
                    interestDiscountType?: string | null;
                    interestRate: number;
                    isArchived?: boolean | null;
                    isCompleted?: boolean | null;
                    itemName: string;
                    notes?: string | null;
                    principal: number;
                    processingFee?: number | null;
                    processingFeeGst?: number | null;
                    remainingBalance: number;
                    remainingTenure: number;
                    tag?: string | null;
                    tenure: number;
                    totalGST?: number | null;
                    totalInterest: number;
                    totalLoan: number;
                    totalPaidEMIs?: number | null;
                    updatedAt?: string | null;
                    userId?: string | null;
                };
                Update: {
                    billDate?: string;
                    createdAt?: string | null;
                    emi?: number;
                    endDate?: string;
                    gst?: number | null;
                    id?: string;
                    interestDiscount?: number | null;
                    interestDiscountType?: string | null;
                    interestRate?: number;
                    isArchived?: boolean | null;
                    isCompleted?: boolean | null;
                    itemName?: string;
                    notes?: string | null;
                    principal?: number;
                    processingFee?: number | null;
                    processingFeeGst?: number | null;
                    remainingBalance?: number;
                    remainingTenure?: number;
                    tag?: string | null;
                    tenure?: number;
                    totalGST?: number | null;
                    totalInterest?: number;
                    totalLoan?: number;
                    totalPaidEMIs?: number | null;
                    updatedAt?: string | null;
                    userId?: string | null;
                };
                Relationships: [];
            };
            emiShares: {
                Row: {
                    createdAt: string | null;
                    createdBy: string;
                    emiId: string;
                    id: string;
                    permission: Database['public']['Enums']['emi_share_permission'];
                    sharedWithUserId: string;
                };
                Insert: {
                    createdAt?: string | null;
                    createdBy: string;
                    emiId: string;
                    id?: string;
                    permission: Database['public']['Enums']['emi_share_permission'];
                    sharedWithUserId: string;
                };
                Update: {
                    createdAt?: string | null;
                    createdBy?: string;
                    emiId?: string;
                    id?: string;
                    permission?: Database['public']['Enums']['emi_share_permission'];
                    sharedWithUserId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'emishares_emiid_fkey';
                        columns: ['emiId'];
                        isOneToOne: false;
                        referencedRelation: 'emis';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'emiShares_sharedWithUserId_fkey';
                        columns: ['sharedWithUserId'];
                        isOneToOne: false;
                        referencedRelation: 'user_profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            emiSplits: {
                Row: {
                    createdAt: string | null;
                    createdBy: string;
                    emiId: string;
                    id: string;
                    isExternal: boolean;
                    participantEmail: string | null;
                    participantName: string | null;
                    splitAmount: number | null;
                    splitPercentage: number;
                    updatedAt: string | null;
                    userId: string | null;
                };
                Insert: {
                    createdAt?: string | null;
                    createdBy: string;
                    emiId: string;
                    id?: string;
                    isExternal?: boolean;
                    participantEmail?: string | null;
                    participantName?: string | null;
                    splitAmount?: number | null;
                    splitPercentage: number;
                    updatedAt?: string | null;
                    userId?: string | null;
                };
                Update: {
                    createdAt?: string | null;
                    createdBy?: string;
                    emiId?: string;
                    id?: string;
                    isExternal?: boolean;
                    participantEmail?: string | null;
                    participantName?: string | null;
                    splitAmount?: number | null;
                    splitPercentage?: number;
                    updatedAt?: string | null;
                    userId?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'emisplits_emiid_fkey';
                        columns: ['emiId'];
                        isOneToOne: false;
                        referencedRelation: 'emis';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'emiSplits_userId_fkey1';
                        columns: ['userId'];
                        isOneToOne: false;
                        referencedRelation: 'user_profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            keep_alive: {
                Row: {
                    id: number;
                    last_ping: string;
                };
                Insert: {
                    id?: number;
                    last_ping?: string;
                };
                Update: {
                    id?: number;
                    last_ping?: string;
                };
                Relationships: [];
            };
            loan_scenario_breakdowns: {
                Row: {
                    amount: number;
                    component: string;
                    createdAt: string | null;
                    id: string;
                    label: string;
                    scenarioId: string;
                    sortOrder: number;
                };
                Insert: {
                    amount?: number;
                    component: string;
                    createdAt?: string | null;
                    id?: string;
                    label: string;
                    scenarioId: string;
                    sortOrder?: number;
                };
                Update: {
                    amount?: number;
                    component?: string;
                    createdAt?: string | null;
                    id?: string;
                    label?: string;
                    scenarioId?: string;
                    sortOrder?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'loan_scenario_breakdowns_scenarioid_fkey';
                        columns: ['scenarioId'];
                        isOneToOne: false;
                        referencedRelation: 'loan_scenarios';
                        referencedColumns: ['id'];
                    },
                ];
            };
            loan_scenarios: {
                Row: {
                    accruedGst: number;
                    accruedInterest: number;
                    baselineRemainingOutflow: number;
                    baselineTotalOutflow: number;
                    confidence: string;
                    createdAt: string | null;
                    emiId: string;
                    foreclosureChargeAmount: number;
                    foreclosureChargeGst: number;
                    foreclosureChargeGstRate: number;
                    foreclosureChargeRate: number;
                    foreclosureCharges: number;
                    foreclosureTotalOutflow: number;
                    gstSaved: number;
                    id: string;
                    includeNextInstallmentInterest: boolean;
                    interestSaved: number;
                    monthsSaved: number;
                    name: string;
                    netSavings: number;
                    notes: string | null;
                    outstandingPrincipal: number;
                    paidToDate: number;
                    scenarioType: string;
                    simulationDate: string;
                    totalPayoff: number;
                    updatedAt: string | null;
                    userId: string;
                };
                Insert: {
                    accruedGst?: number;
                    accruedInterest?: number;
                    baselineRemainingOutflow?: number;
                    baselineTotalOutflow?: number;
                    confidence?: string;
                    createdAt?: string | null;
                    emiId: string;
                    foreclosureChargeAmount?: number;
                    foreclosureChargeGst?: number;
                    foreclosureChargeGstRate?: number;
                    foreclosureChargeRate?: number;
                    foreclosureCharges?: number;
                    foreclosureTotalOutflow?: number;
                    gstSaved?: number;
                    id?: string;
                    includeNextInstallmentInterest?: boolean;
                    interestSaved?: number;
                    monthsSaved?: number;
                    name: string;
                    netSavings?: number;
                    notes?: string | null;
                    outstandingPrincipal?: number;
                    paidToDate?: number;
                    scenarioType?: string;
                    simulationDate: string;
                    totalPayoff?: number;
                    updatedAt?: string | null;
                    userId: string;
                };
                Update: {
                    accruedGst?: number;
                    accruedInterest?: number;
                    baselineRemainingOutflow?: number;
                    baselineTotalOutflow?: number;
                    confidence?: string;
                    createdAt?: string | null;
                    emiId?: string;
                    foreclosureChargeAmount?: number;
                    foreclosureChargeGst?: number;
                    foreclosureChargeGstRate?: number;
                    foreclosureChargeRate?: number;
                    foreclosureCharges?: number;
                    foreclosureTotalOutflow?: number;
                    gstSaved?: number;
                    id?: string;
                    includeNextInstallmentInterest?: boolean;
                    interestSaved?: number;
                    monthsSaved?: number;
                    name?: string;
                    netSavings?: number;
                    notes?: string | null;
                    outstandingPrincipal?: number;
                    paidToDate?: number;
                    scenarioType?: string;
                    simulationDate?: string;
                    totalPayoff?: number;
                    updatedAt?: string | null;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'loan_scenarios_emiid_fkey';
                        columns: ['emiId'];
                        isOneToOne: false;
                        referencedRelation: 'emis';
                        referencedColumns: ['id'];
                    },
                ];
            };
            user_account_preferences: {
                Row: {
                    avatar_url: string | null;
                    created_at: string;
                    currency: string;
                    export_config: string | null;
                    filter_config: Json | null;
                    locale: string;
                    number_format: string;
                    phone: string | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    avatar_url?: string | null;
                    created_at?: string;
                    currency?: string;
                    export_config?: string | null;
                    filter_config?: Json | null;
                    locale?: string;
                    number_format?: string;
                    phone?: string | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    avatar_url?: string | null;
                    created_at?: string;
                    currency?: string;
                    export_config?: string | null;
                    filter_config?: Json | null;
                    locale?: string;
                    number_format?: string;
                    phone?: string | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            user_profiles: {
                Row: {
                    appdata: Json | null;
                    display_name: string | null;
                    email: string | null;
                    id: string;
                    userdata: Json | null;
                };
                Insert: {
                    appdata?: Json | null;
                    display_name?: string | null;
                    email?: string | null;
                    id: string;
                    userdata?: Json | null;
                };
                Update: {
                    appdata?: Json | null;
                    display_name?: string | null;
                    email?: string | null;
                    id?: string;
                    userdata?: Json | null;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            check_emi_ownership: {
                Args: { emi_id: string; user_id: string };
                Returns: boolean;
            };
            get_user_id_by_email: { Args: { user_email: string }; Returns: string };
            validate_splits_total: { Args: { emi_id: string }; Returns: boolean };
        };
        Enums: {
            emi_share_permission: 'read' | 'write';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            emi_share_permission: ['read', 'write'],
        },
    },
} as const;
