import { format } from 'date-fns';

import store from '@/store/store';
import { supabase } from '@/supabase/supabase';
import {
    CreateLoanScenarioInput,
    ForeclosureBreakdownComponent,
    ForeclosureScenarioResult,
    ILoanScenario,
    ScenarioBreakdownItem,
    UpdateLoanScenarioInput,
} from '@/types/scenario.types';

const buildScenarioPayload = (name: string, notes: string | undefined, result: ForeclosureScenarioResult) => ({
    name: name.trim(),
    simulationDate: format(result.simulationDate, 'yyyy-MM-dd'),
    foreclosureChargeRate: result.assumptions.foreclosureChargeRate,
    foreclosureChargeAmount: result.assumptions.foreclosureChargeAmount,
    foreclosureChargeGstRate: result.assumptions.foreclosureChargeGstRate,
    includeNextInstallmentInterest: result.assumptions.includeNextInstallmentInterest,
    outstandingPrincipal: result.outstandingPrincipal,
    accruedInterest: result.accruedInterest,
    accruedGst: result.accruedGst,
    foreclosureCharges: result.foreclosureCharges,
    foreclosureChargeGst: result.foreclosureChargeGst,
    totalPayoff: result.totalPayoff,
    paidToDate: result.paidToDate,
    baselineRemainingOutflow: result.baseline.remainingOutflow,
    baselineTotalOutflow: result.baseline.totalOutflow,
    foreclosureTotalOutflow: result.foreclosureTotalOutflow,
    interestSaved: result.interestSaved,
    gstSaved: result.gstSaved,
    netSavings: result.netSavings,
    monthsSaved: result.monthsSaved,
    confidence: result.confidence,
    notes: notes?.trim() || null,
});

const replaceBreakdowns = async (scenarioId: string, breakdown: ScenarioBreakdownItem[]): Promise<void> => {
    const { error: deleteError } = await supabase
        .from('loan_scenario_breakdowns')
        .delete()
        .eq('scenarioId', scenarioId);

    if (deleteError) {
        throw deleteError;
    }

    const breakdownInserts = breakdown.map((item) => ({
        scenarioId,
        component: item.component,
        label: item.label,
        amount: item.amount,
        sortOrder: item.sortOrder,
    }));

    const { error: insertError } = await supabase.from('loan_scenario_breakdowns').insert(breakdownInserts);

    if (insertError) {
        throw insertError;
    }
};

const mapBreakdownRow = (row: {
    component: string;
    label: string;
    amount: number;
    sortOrder: number;
}): ScenarioBreakdownItem => ({
    component: row.component as ForeclosureBreakdownComponent,
    label: row.label,
    amount: Number(row.amount),
    sortOrder: row.sortOrder,
});

const mapScenarioRow = (row: Record<string, unknown>, breakdowns?: ScenarioBreakdownItem[]): ILoanScenario => ({
    id: String(row.id),
    emiId: String(row.emiId),
    userId: String(row.userId),
    name: String(row.name),
    scenarioType: 'foreclosure',
    simulationDate: String(row.simulationDate),
    foreclosureChargeRate: Number(row.foreclosureChargeRate),
    foreclosureChargeAmount: Number(row.foreclosureChargeAmount),
    foreclosureChargeGstRate: Number(row.foreclosureChargeGstRate),
    includeNextInstallmentInterest: Boolean(row.includeNextInstallmentInterest),
    outstandingPrincipal: Number(row.outstandingPrincipal),
    accruedInterest: Number(row.accruedInterest),
    accruedGst: Number(row.accruedGst),
    foreclosureCharges: Number(row.foreclosureCharges),
    foreclosureChargeGst: Number(row.foreclosureChargeGst),
    totalPayoff: Number(row.totalPayoff),
    paidToDate: Number(row.paidToDate),
    baselineRemainingOutflow: Number(row.baselineRemainingOutflow),
    baselineTotalOutflow: Number(row.baselineTotalOutflow),
    foreclosureTotalOutflow: Number(row.foreclosureTotalOutflow),
    interestSaved: Number(row.interestSaved),
    gstSaved: Number(row.gstSaved),
    netSavings: Number(row.netSavings),
    monthsSaved: Number(row.monthsSaved),
    confidence: row.confidence === 'exact' ? 'exact' : 'estimated',
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    breakdowns,
});

const resolveUserId = async (): Promise<string> => {
    const { id } = store.getState().userModel;
    if (id) {
        return id;
    }

    const { data: user } = await supabase.auth.getUser();
    return user.user?.id || '';
};

export class ScenarioService {
    static async getScenariosByEmiId(emiId: string): Promise<ILoanScenario[]> {
        const { data, error } = await supabase
            .from('loan_scenarios')
            .select(
                `
                *,
                loan_scenario_breakdowns (
                    component,
                    label,
                    amount,
                    sortOrder
                )
            `
            )
            .eq('emiId', emiId)
            .order('createdAt', { ascending: false });

        if (error) {
            throw error;
        }

        return (data || []).map((row) => {
            const nested = (
                row as {
                    loan_scenario_breakdowns?: Array<{
                        component: string;
                        label: string;
                        amount: number;
                        sortOrder: number;
                    }>;
                }
            ).loan_scenario_breakdowns;

            const breakdowns = (nested || []).map(mapBreakdownRow).sort((a, b) => a.sortOrder - b.sortOrder);

            return mapScenarioRow(row as Record<string, unknown>, breakdowns);
        });
    }

    static async createScenario(input: CreateLoanScenarioInput): Promise<ILoanScenario> {
        const userId = await resolveUserId();
        if (!userId) {
            throw new Error('You must be signed in to save a scenario.');
        }

        const { result, emiId, name, notes } = input;
        const { data, error } = await supabase
            .from('loan_scenarios')
            .insert({
                emiId,
                userId,
                scenarioType: 'foreclosure',
                ...buildScenarioPayload(name, notes, result),
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        const scenarioId = data.id as string;

        try {
            await replaceBreakdowns(scenarioId, result.breakdown);
        } catch (breakdownError) {
            await supabase.from('loan_scenarios').delete().eq('id', scenarioId);
            throw breakdownError;
        }

        return mapScenarioRow(data as Record<string, unknown>, result.breakdown);
    }

    static async updateScenario(input: UpdateLoanScenarioInput): Promise<ILoanScenario> {
        const { scenarioId, name, notes, result } = input;

        const { data, error } = await supabase
            .from('loan_scenarios')
            .update(buildScenarioPayload(name, notes, result))
            .eq('id', scenarioId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        await replaceBreakdowns(scenarioId, result.breakdown);

        return mapScenarioRow(data as Record<string, unknown>, result.breakdown);
    }

    static async deleteScenario(scenarioId: string): Promise<void> {
        const { error } = await supabase.from('loan_scenarios').delete().eq('id', scenarioId);

        if (error) {
            throw error;
        }
    }
}
