import store from '@/store/store';
import { IEmi } from '@/types/emi.types';
import { supabase } from '@/supabase/supabase';
import { format } from 'date-fns';

export class EmiService {
    static async createEmi(emi: Omit<IEmi, 'id'>) {
        const { id } = store.getState().userModel;
        let userId = id;

        if (!id) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        const { data, error } = await supabase
            .from('emis')
            .insert({
                itemName: emi.itemName,
                principal: emi.principal,
                interestRate: emi.interestRate,
                billDate: format(emi.billDate, 'yyyy-MM-dd'),
                tenure: emi.tenure,
                interestDiscount: emi.interestDiscount,
                interestDiscountType: emi.interestDiscountType,
                emi: emi.emi,
                totalLoan: emi.totalLoan,
                totalPaidEMIs: emi.totalPaidEMIs,
                totalInterest: emi.totalInterest,
                gst: emi.gst,
                totalGST: emi.totalGST,
                remainingBalance: emi.remainingBalance,
                remainingTenure: emi.remainingTenure,
                endDate: format(emi.endDate, 'yyyy-MM-dd'),
                isCompleted: emi.isCompleted,
                userId: userId,
                tag: emi.tag,
            })
            .select();

        if (error) throw error;

        // Insert amortization schedule
        if (data) {
            const scheduleInserts = emi.amortizationSchedules.map((schedule) => ({
                emiId: data[0].id,
                month: schedule.month,
                billDate: schedule.billDate,
                emi: schedule.emi,
                interest: schedule.interest,
                principalPaid: schedule.principalPaid,
                balance: schedule.balance,
                gst: schedule.gst,
            }));

            const { error: scheduleError } = await supabase.from('amortizationSchedules').insert(scheduleInserts);

            if (scheduleError) throw scheduleError;
        }

        return data;
    }

    static async getEmis() {
        const { id } = store.getState().userModel;
        let userId = id;

        if (!id) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        const { data, error } = await supabase
            .from('emis')
            .select(
                `
        *,
        amortizationSchedules (*)
      `
            )
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        return data.map((emi) => ({
            ...emi,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            amortizationSchedules: emi.amortizationSchedules.map((schedule: any) => ({
                month: schedule.month,
                billDate: schedule.billDate,
                emi: schedule.emi,
                interest: schedule.interest,
                principalPaid: schedule.principalPaid,
                balance: schedule.balance,
                gst: schedule.gst,
            })),
        }));
    }

    static async updateEmi(emi: IEmi) {
        if (!emi.id) throw new Error('Missing EMI ID for update');

        const { data, error } = await supabase
            .from('emis')
            .update({
                itemName: emi.itemName,
                principal: emi.principal,
                interestRate: emi.interestRate,
                billDate: format(emi.billDate, 'yyyy-MM-dd'),
                tenure: emi.tenure,
                interestDiscount: emi.interestDiscount,
                interestDiscountType: emi.interestDiscountType,
                emi: emi.emi,
                totalLoan: emi.totalLoan,
                totalPaidEMIs: emi.totalPaidEMIs,
                totalInterest: emi.totalInterest,
                gst: emi.gst,
                totalGST: emi.totalGST,
                remainingBalance: emi.remainingBalance,
                remainingTenure: emi.remainingTenure,
                endDate: format(emi.endDate, 'yyyy-MM-dd'),
                isCompleted: emi.isCompleted,
                tag: emi.tag,
                updatedAt: new Date().toISOString(), // <-- important
            })
            .eq('id', emi.id)
            .select();

        if (error) throw error;
        if (!data) throw new Error('Update failed: No matching EMI found.');

        // Delete existing schedule
        await supabase.from('amortizationSchedules').delete().eq('emiId', emi.id);

        // Insert updated schedule
        const scheduleInserts = emi.amortizationSchedules.map((schedule) => ({
            emiId: emi.id,
            month: schedule.month,
            billDate: schedule.billDate,
            emi: schedule.emi,
            interest: schedule.interest,
            principalPaid: schedule.principalPaid,
            balance: schedule.balance,
            gst: schedule.gst,
        }));

        const { error: scheduleError } = await supabase.from('amortizationSchedules').insert(scheduleInserts);

        if (scheduleError) throw scheduleError;

        return data;
    }

    static async updateEmiList(emiList: IEmi[]) {
        const { error } = await supabase.from('emis').upsert(
            emiList.map((emi) => ({
                id: emi.id,
                itemName: emi.itemName,
                principal: emi.principal,
                interestRate: emi.interestRate,
                billDate: format(emi.billDate, 'yyyy-MM-dd'),
                tenure: emi.tenure,
                interestDiscount: emi.interestDiscount,
                interestDiscountType: emi.interestDiscountType,
                emi: emi.emi,
                totalLoan: emi.totalLoan,
                totalPaidEMIs: emi.totalPaidEMIs,
                totalInterest: emi.totalInterest,
                gst: emi.gst,
                totalGST: emi.totalGST,
                remainingBalance: emi.remainingBalance,
                remainingTenure: emi.remainingTenure,
                endDate: format(emi.endDate, 'yyyy-MM-dd'),
                isCompleted: emi.isCompleted,
                tag: emi.tag,
                updatedAt: new Date().toISOString(),
            }))
        );

        if (error) throw error;

        const { error: deleteError } = await supabase
            .from('amortizationSchedules')
            .delete()
            .in(
                'emiId',
                emiList.map((emi) => emi.id)
            );

        if (deleteError) throw deleteError;

        const allScheduleInserts = emiList.flatMap((emi) =>
            emi.amortizationSchedules.map((schedule) => ({
                emiId: emi.id,
                month: schedule.month,
                billDate: schedule.billDate,
                emi: schedule.emi,
                interest: schedule.interest,
                principalPaid: schedule.principalPaid,
                balance: schedule.balance,
                gst: schedule.gst,
            }))
        );

        const { error: scheduleError } = await supabase.from('amortizationSchedules').insert(allScheduleInserts);

        if (scheduleError) throw scheduleError;
    }

    static async deleteEmi(id: string) {
        const { error } = await supabase.from('emis').delete().eq('id', id);

        if (error) throw error;
    }
}
