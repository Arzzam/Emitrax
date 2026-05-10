import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/supabase/supabase';
import { IEmiSplit } from '@/types/emi.types';

export const PERCENTAGE_TOLERANCE = 0.01;
const USER_FETCH_LIMIT = 1000;

type RegisteredUser = {
    id: string;
    email: string;
};

export type EditableSplit = {
    id?: string;
    tempId?: string;
    name: string;
    email: string;
    percentage: number;
    userId?: string;
    isExternal?: boolean;
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const createEditableSplit = (): EditableSplit => ({
    tempId: `temp-${Date.now()}-${Math.random()}`,
    name: '',
    email: '',
    percentage: 0,
    isExternal: true,
});

export const mapExistingToEditableSplits = (splits: IEmiSplit[]): EditableSplit[] =>
    splits.map((split) => ({
        id: split.id,
        name: split.participantName || split.participantEmail || '',
        email: split.participantEmail || '',
        percentage: split.splitPercentage,
        userId: split.userId,
        isExternal: split.isExternal,
    }));

export const useRegisteredUsers = () => {
    const [users, setUsers] = useState<RegisteredUser[]>([]);

    useEffect(() => {
        let isMounted = true;

        const fetchRegisteredUsers = async () => {
            try {
                const { data: registeredUsers, error } = await supabase
                    .from('user_profiles')
                    .select('id, email')
                    .limit(USER_FETCH_LIMIT);

                if (error || !isMounted) return;
                setUsers(registeredUsers || []);
            } catch {
                if (!isMounted) return;
                setUsers([]);
            }
        };

        fetchRegisteredUsers();

        return () => {
            isMounted = false;
        };
    }, []);

    return users;
};

export const useRegisteredUserLookup = (users: RegisteredUser[]) => {
    const usersByEmail = useMemo(
        () =>
            users.reduce<Map<string, RegisteredUser>>((map, user) => {
                map.set(normalizeEmail(user.email), user);
                return map;
            }, new Map()),
        [users]
    );

    const findUserByEmail = useCallback((email: string) => usersByEmail.get(normalizeEmail(email)), [usersByEmail]);

    return { findUserByEmail };
};
