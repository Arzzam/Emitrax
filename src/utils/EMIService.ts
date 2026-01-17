import store from '@/store/store';
import { IEmi, IEmiShare, ScheduleData } from '@/types/emi.types';
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
                isArchived: emi.isArchived,
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

        if (!userId) {
            return [];
        }

        // Get owned EMIs
        const { data: ownedEmis, error: ownedError } = await supabase
            .from('emis')
            .select(
                `
        *,
        amortizationSchedules (*)
      `
            )
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (ownedError) throw ownedError;

        // Get shares for owned EMIs
        const ownedEmiIds = (ownedEmis || []).map((emi: IEmi) => emi.id);
        let ownedEmiShares: IEmiShare[] = [];
        if (ownedEmiIds.length > 0) {
            const { data: shares } = await supabase.from('emiShares').select('*').in('emiId', ownedEmiIds);
            ownedEmiShares = (shares as IEmiShare[]) || [];
        }

        // Get shared EMIs (where user is a recipient)
        const { data: sharedShares, error: sharedError } = await supabase
            .from('emiShares')
            .select('emiId, permission')
            .eq('sharedWithUserId', userId);

        if (sharedError) throw sharedError;

        // Fetch the actual EMI data for shared EMIs
        const sharedEmiIds: string[] = (sharedShares || []).map((share) => share.emiId);
        let sharedEmisData: IEmi[] = [];
        if (sharedEmiIds.length > 0) {
            const { data: sharedEmis } = await supabase
                .from('emis')
                .select(
                    `
          *,
          amortizationSchedules (*)
        `
                )
                .in('id', sharedEmiIds);

            sharedEmisData = sharedEmis || [];
        }

        // Create a map of emiId -> shares for owned EMIs
        const sharesByEmiId = ownedEmiShares.reduce((acc: Record<string, IEmiShare[]>, share: IEmiShare) => {
            if (!acc[share.emiId]) {
                acc[share.emiId] = [];
            }
            acc[share.emiId].push(share);
            return acc;
        }, {});

        // Create a map of emiId -> permission for shared EMIs
        const permissionByEmiId = (sharedShares || []).reduce(
            (acc: Record<string, string>, share: { emiId: string; permission: 'read' | 'write' }) => {
                acc[share.emiId] = share.permission;
                return acc;
            },
            {} as Record<string, 'read' | 'write'>
        );

        // Process owned EMIs
        const ownedEmisProcessed = (ownedEmis || []).map((emi: IEmi) => {
            const shares = sharesByEmiId[emi.id] || [];
            return {
                ...emi,
                userId: emi.userId,
                billDate: new Date(emi.billDate),
                endDate: new Date(emi.endDate),
                isOwner: true,
                permission: 'write' as const,
                sharedWith: shares,
                amortizationSchedules: (emi.amortizationSchedules || []).map((schedule: ScheduleData) => ({
                    month: schedule.month,
                    billDate: schedule.billDate,
                    emi: schedule.emi,
                    interest: schedule.interest,
                    principalPaid: schedule.principalPaid,
                    balance: schedule.balance,
                    gst: schedule.gst,
                })),
            };
        });

        // Process shared EMIs
        const sharedEmisProcessed = sharedEmisData.reduce((acc: IEmi[], emi: IEmi): IEmi[] => {
            const permission = permissionByEmiId[emi.id];
            if (!permission) return acc;

            acc.push({
                ...emi,
                userId: emi.userId,
                billDate: new Date(emi.billDate),
                endDate: new Date(emi.endDate),
                isOwner: false,
                permission: permission as 'read' | 'write',
                sharedWith: [],
                amortizationSchedules: (emi.amortizationSchedules || []).map((schedule: ScheduleData) => ({
                    month: schedule.month,
                    billDate: schedule.billDate,
                    emi: schedule.emi,
                    interest: schedule.interest,
                    principalPaid: schedule.principalPaid,
                    balance: schedule.balance,
                    gst: schedule.gst,
                })),
            });
            return acc;
        }, [] as IEmi[]);

        // Combine and deduplicate (in case user owns and is shared with same EMI - shouldn't happen but safety)
        const allEmis = [...ownedEmisProcessed, ...sharedEmisProcessed];
        const uniqueEmis = Array.from(new Map(allEmis.map((emi: IEmi) => [emi.id, emi])).values()) as IEmi[];

        return uniqueEmis;
    }

    static async updateEmi(emi: IEmi) {
        if (!emi.id) throw new Error('Missing EMI ID for update');

        // Check permissions
        const { id } = store.getState().userModel;
        let userId = id;

        if (!id) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Verify user has write permission
        const { data: emiData } = await supabase.from('emis').select('userId').eq('id', emi.id).single();

        if (!emiData) {
            throw new Error('EMI not found');
        }

        const isOwner = emiData.userId === userId;
        if (!isOwner) {
            // Check if user has write permission via share
            const { data: share } = await supabase
                .from('emiShares')
                .select('permission')
                .eq('emiId', emi.id)
                .eq('sharedWithUserId', userId)
                .eq('permission', 'write')
                .single();

            if (!share) {
                throw new Error('You do not have permission to edit this EMI');
            }
        }

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
                isArchived: emi.isArchived,
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
                isArchived: emi.isArchived,
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
        // Only owner can delete
        const { id: userId } = store.getState().userModel;
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: user } = await supabase.auth.getUser();
            currentUserId = user.user?.id || '';
        }

        if (!currentUserId) {
            throw new Error('User not authenticated');
        }

        // Verify user is the owner
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', id).single();

        if (!emi) {
            throw new Error('EMI not found');
        }

        if (emi.userId !== currentUserId) {
            throw new Error('Only the EMI owner can delete it');
        }

        // Delete shares first
        await supabase.from('emiShares').delete().eq('emiId', id);

        const { error } = await supabase.from('emis').delete().eq('id', id);

        if (error) throw error;
    }

    static async archiveEmi(id: string) {
        // Check permissions (only owner can archive)
        const { id: userId } = store.getState().userModel;
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: user } = await supabase.auth.getUser();
            currentUserId = user.user?.id || '';
        }

        if (!currentUserId) {
            throw new Error('User not authenticated');
        }

        const { data: emi } = await supabase.from('emis').select('userId').eq('id', id).single();

        if (!emi || emi.userId !== currentUserId) {
            throw new Error('Only the EMI owner can archive it');
        }

        const { data, error } = await supabase
            .from('emis')
            .update({
                isArchived: true,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data;
    }

    static async unarchiveEmi(id: string) {
        // Check permissions (only owner can unarchive)
        const { id: userId } = store.getState().userModel;
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: user } = await supabase.auth.getUser();
            currentUserId = user.user?.id || '';
        }

        if (!currentUserId) {
            throw new Error('User not authenticated');
        }

        const { data: emi } = await supabase.from('emis').select('userId').eq('id', id).single();

        if (!emi || emi.userId !== currentUserId) {
            throw new Error('Only the EMI owner can unarchive it');
        }

        const { data, error } = await supabase
            .from('emis')
            .update({
                isArchived: false,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data;
    }

    static async bulkArchiveEmis(ids: string[]) {
        const { data, error } = await supabase
            .from('emis')
            .update({
                isArchived: true,
                updatedAt: new Date().toISOString(),
            })
            .in('id', ids)
            .select();

        if (error) throw error;
        return data;
    }
}
