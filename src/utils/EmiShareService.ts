import store from '@/store/store';
import { supabase } from '@/supabase/supabase';
import { IEmiShare } from '@/types/emi.types';
import { errorToast } from './toast.utils';

export class EmiShareService {
    /**
     * Share an EMI with another user by email
     * Note: This requires a profiles table or RPC function to look up users by email.
     * For now, use shareEmiByUserId if you have the user ID.
     * @param emiId - The EMI ID to share
     * @param email - Email of the user to share with
     * @param permission - 'read' or 'write' permission
     */
    static async shareEmi(emiId: string, email: string, permission: 'read' | 'write'): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();

            userId = user.user?.id || '';
        }

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Try to find user in profiles table (if it exists)
        // If profiles table doesn't exist, you'll need to create it or use RPC
        let sharedWithUserId: string | null = null;

        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (profile) {
                sharedWithUserId = profile.id;
            }
        } catch (error) {
            // Profiles table might not exist - that's okay, we'll use RPC or require user ID
            console.error(error);
            errorToast(
                'User not found. Please ensure the user has an account and you have a profiles table or RPC function set up. Alternatively, use shareEmiByUserId if you have the user ID.'
            );
        }

        // If profiles table lookup failed, try RPC function (if available)
        if (!sharedWithUserId) {
            try {
                const { data, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
                    user_email: email.toLowerCase().trim(),
                });

                if (!rpcError && data) {
                    sharedWithUserId = data;
                }
            } catch (error) {
                // RPC might not exist
                console.error(error);
                errorToast(
                    'User not found. Please ensure the user has an account and you have a profiles table or RPC function set up. Alternatively, use shareEmiByUserId if you have the user ID.'
                );
            }
        }

        if (!sharedWithUserId) {
            errorToast(
                'User not found. Please ensure the user has an account and you have a profiles table or RPC function set up. Alternatively, use shareEmiByUserId if you have the user ID.'
            );
        }

        if (sharedWithUserId === userId) {
            errorToast('Cannot share EMI with yourself');
        }

        // Check if share already exists
        const { data: existingShare } = await supabase
            .from('emiShares')
            .select('id')
            .eq('emiId', emiId)
            .eq('sharedWithUserId', sharedWithUserId)
            .single();

        if (existingShare) {
            errorToast('EMI is already shared with this user');
        }

        // Create the share
        const { error } = await supabase.from('emiShares').insert({
            emiId,
            sharedWithUserId,
            permission,
            createdBy: userId,
        });

        if (error) {
            errorToast('Failed to share EMI');
        }
    }

    /**
     * Share an EMI with another user by user ID (alternative method)
     */
    static async shareEmiByUserId(
        emiId: string,
        sharedWithUserId: string,
        permission: 'read' | 'write'
    ): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            errorToast('User not authenticated');
        }

        if (sharedWithUserId === userId) {
            errorToast('Cannot share EMI with yourself');
        }

        // Check if share already exists
        const { data: existingShare } = await supabase
            .from('emiShares')
            .select('id')
            .eq('emiId', emiId)
            .eq('sharedWithUserId', sharedWithUserId)
            .single();

        if (existingShare) {
            errorToast('EMI is already shared with this user');
        }

        // Create the share
        const { error } = await supabase.from('emiShares').insert({
            emiId,
            sharedWithUserId,
            permission,
            createdBy: userId,
        });

        if (error) {
            errorToast('Failed to share EMI');
        }
    }

    /**
     * Remove a share (unshare EMI with a user)
     */
    static async unshareEmi(emiId: string, sharedWithUserId: string): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            errorToast('User not authenticated');
        }

        // Verify user is the owner of the EMI
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', emiId).single();

        if (!emi || emi.userId !== userId) {
            errorToast('Only the EMI owner can remove shares');
        }

        const { error } = await supabase
            .from('emiShares')
            .delete()
            .eq('emiId', emiId)
            .eq('sharedWithUserId', sharedWithUserId);

        if (error) {
            errorToast('Failed to remove share');
        }
    }

    /**
     * Update permission for a shared EMI
     */
    static async updateSharePermission(
        emiId: string,
        sharedWithUserId: string,
        permission: 'read' | 'write'
    ): Promise<void> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            errorToast('User not authenticated');
        }

        // Verify user is the owner of the EMI
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', emiId).single();

        if (!emi || emi.userId !== userId) {
            errorToast('Only the EMI owner can update share permissions');
        }

        const { error } = await supabase
            .from('emiShares')
            .update({ permission })
            .eq('emiId', emiId)
            .eq('sharedWithUserId', sharedWithUserId);

        if (error) {
            errorToast('Failed to update share permission');
        }
    }

    /**
     * Get all shares for an EMI
     */
    static async getEmiShares(emiId: string): Promise<IEmiShare[]> {
        // get the user profiles for the sharedWithUserId
        const { data: userProfiles, error: userProfilesError } = await supabase
            .from('emiShares')
            .select(`*, user_profiles:sharedWithUserId (email)`)
            .eq('emiId', emiId)
            .order('createdAt', { ascending: false });

        if (userProfilesError) errorToast('Failed to get EMI shares');

        return userProfiles || [];
    }

    /**
     * Get all EMIs shared with the current user
     */
    static async getSharedEmisWithMe(): Promise<IEmiShare[]> {
        const { id: currentUserId } = store.getState().userModel;
        let userId = currentUserId;

        if (!userId) {
            const { data: user } = await supabase.auth.getUser();
            userId = user.user?.id || '';
        }

        if (!userId) {
            return [];
        }

        const { data, error } = await supabase
            .from('emiShares')
            .select('*')
            .eq('sharedWithUserId', userId)
            .order('createdAt', { ascending: false });

        if (error) {
            errorToast('Failed to get shared EMIs');
        }

        return data || [];
    }

    /**
     * Check if user has permission to edit an EMI
     */
    static async canEditEmi(emiId: string, userId: string): Promise<boolean> {
        // Check if user is the owner
        const { data: emi } = await supabase.from('emis').select('userId').eq('id', emiId).single();

        if (emi && emi.userId === userId) {
            return true;
        }

        // Check if user has write permission via share
        const { data: share } = await supabase
            .from('emiShares')
            .select('permission')
            .eq('emiId', emiId)
            .eq('sharedWithUserId', userId)
            .eq('permission', 'write')
            .single();

        return !!share;
    }
}
