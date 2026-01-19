import store from '@/store/store';
import { supabase } from '@/supabase/supabase';
import { IEmiSplit, IEmiSplitInput } from '@/types/emi.types';

export class EmiSplitService {
    /**
     * Validate that splits sum to 100% (with small tolerance for rounding)
     */
    static validateSplits(splits: IEmiSplitInput[]): { valid: boolean; error?: string } {
        if (!splits || splits.length === 0) {
            return { valid: false, error: 'At least one split is required' };
        }

        const total = splits.reduce((sum, split) => sum + split.splitPercentage, 0);

        // Allow small tolerance for rounding (99.99% - 100.01%)
        if (total < 99.99 || total > 100.01) {
            return {
                valid: false,
                error: `Splits must sum to 100%. Current total: ${total.toFixed(2)}%`,
            };
        }

        // Validate each split
        for (const split of splits) {
            if (split.splitPercentage <= 0 || split.splitPercentage > 100) {
                return {
                    valid: false,
                    error: `Split percentage must be between 0 and 100. Found: ${split.splitPercentage}%`,
                };
            }

            // For external participants, email is required
            if (!split.userId) {
                if (!split.participantEmail || !split.participantEmail.trim()) {
                    return {
                        valid: false,
                        error: 'External participants must have an email address',
                    };
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(split.participantEmail.trim())) {
                    return {
                        valid: false,
                        error: 'Invalid email format for external participant',
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Set splits for an EMI (replaces all existing splits)
     */
    static async setEmiSplits(emiId: string, splits: IEmiSplitInput[]): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Validate splits
        const validation = this.validateSplits(splits);
        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid splits');
        }

        // Verify user owns the EMI
        const { data: emi } = await supabase.from('emis').select('userId, emi').eq('id', emiId).single();

        if (!emi || emi.userId !== userId) {
            throw new Error('Only the EMI owner can manage splits');
        }

        // Delete existing splits
        await supabase.from('emiSplits').delete().eq('emiId', emiId);

        // Insert new splits
        const splitInserts = splits.map((split) => {
            return {
                emiId,
                userId: split.userId || null,
                participantName: split.participantName?.trim() || null,
                participantEmail: split.participantEmail?.trim().toLowerCase() || null,
                splitPercentage: split.splitPercentage,
                isExternal: !split.userId,
                createdBy: userId,
            };
        });

        const { error } = await supabase.from('emiSplits').insert(splitInserts);

        if (error) {
            throw error;
        }
    }

    /**
     * Get all splits for an EMI
     */
    static async getEmiSplits(emiId: string): Promise<IEmiSplit[]> {
        const { data, error } = await supabase
            .from('emiSplits')
            .select(
                `
        *,
        user_profiles:userId (
          email
        )
      `
            )
            .eq('emiId', emiId)
            .order('createdAt', { ascending: true });

        if (error) {
            throw error;
        }

        return (data || []).map((split: IEmiSplit) => {
            const userProfile = split.user_profiles;

            return {
                ...split,
                displayName:
                    split.participantName || split.participantEmail || userProfile?.email || split.participantEmail,
                displayEmail: split.participantEmail || userProfile?.email || split.participantEmail,
            } as IEmiSplit;
        });
    }

    /**
     * Remove a split (by userId or email)
     */
    static async removeSplit(emiId: string, userId?: string, email?: string): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let currentUser = currentUserId;

        if (!currentUser) {
            const { data: user } = await supabase.auth.getUser();
            currentUser = user.user?.id || '';
        }

        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Verify user owns the EMI
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', emiId).single();

        if (!emi || emi.userId !== currentUser) {
            throw new Error('Only the EMI owner can remove splits');
        }

        let query = supabase.from('emiSplits').delete().eq('emiId', emiId);

        if (userId) {
            query = query.eq('userId', userId);
        } else if (email) {
            query = query.eq('participantEmail', email.toLowerCase().trim()).eq('isExternal', true);
        } else {
            throw new Error('Either userId or email must be provided');
        }

        const { error } = await query;

        if (error) {
            throw error;
        }
    }

    /**
     * Remove all splits for an EMI
     */
    static async removeAllSplits(emiId: string): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Verify user owns the EMI
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', emiId).single();

        if (!emi || emi.userId !== userId) {
            throw new Error('Only the EMI owner can remove splits');
        }

        const { error } = await supabase.from('emiSplits').delete().eq('emiId', emiId);

        if (error) {
            throw error;
        }
    }
}
