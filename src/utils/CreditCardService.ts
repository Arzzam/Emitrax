import store from '@/store/store';
import { supabase } from '@/supabase/supabase';
import {
    CreateCardInput,
    CreateIssuerInput,
    ICreditCard,
    ICreditCardIssuer,
    ICreditCardPaymentEntry,
    ICreditCardTrackerYear,
    IssuerColorToken,
    SavePaymentEntryInput,
    UpdateCardInput,
    UpdateIssuerInput,
} from '@/types/creditCard.types';
import { getFinancialYearForDate, getFinancialYearRange } from '@/utils/financialYear';

const mapCardRow = (row: Record<string, unknown>): ICreditCard => ({
    id: String(row.id),
    userId: String(row.userId),
    issuerId: String(row.issuerId),
    name: String(row.name),
    last4: row.last4 == null ? null : String(row.last4),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
});

const mapIssuerRow = (row: Record<string, unknown>): ICreditCardIssuer => {
    const cards = Array.isArray(row.cc_cards) ? (row.cc_cards as Record<string, unknown>[]).map(mapCardRow) : [];

    return {
        id: String(row.id),
        userId: String(row.userId),
        name: String(row.name),
        color: row.color == null ? null : (String(row.color) as IssuerColorToken),
        sortOrder: Number(row.sortOrder),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        cards: cards.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    };
};

const mapEntryRow = (row: Record<string, unknown>): ICreditCardPaymentEntry => ({
    id: String(row.id),
    userId: String(row.userId),
    cardId: String(row.cardId),
    periodMonth: String(row.periodMonth),
    amount: Number(row.amount),
    cashAmount: Number(row.cashAmount),
    note: row.note == null ? null : String(row.note),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
});

const mapTrackerYearRow = (row: Record<string, unknown>): ICreditCardTrackerYear => ({
    id: String(row.id),
    userId: String(row.userId),
    financialYear: String(row.financialYear),
    notes: row.notes == null ? null : String(row.notes),
    thresholdAmount: Number(row.thresholdAmount),
    cashThresholdAmount: Number(row.cashThresholdAmount),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
});

const resolveUserId = async (): Promise<string> => {
    const { id } = store.getState().userModel;
    if (id) {
        return id;
    }

    const { data: user } = await supabase.auth.getUser();
    return user.user?.id || '';
};

const requireUserId = async (): Promise<string> => {
    const userId = await resolveUserId();
    if (!userId) {
        throw new Error('You must be signed in to manage the credit card tracker.');
    }
    return userId;
};

export class CreditCardService {
    // --- Issuers & cards ----------------------------------------------------

    static async getIssuersWithCards(): Promise<ICreditCardIssuer[]> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_issuers')
            .select('*, cc_cards(*)')
            .eq('userId', userId)
            .order('sortOrder', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            throw error;
        }

        return (data || []).map((row) => mapIssuerRow(row as Record<string, unknown>));
    }

    static async createIssuer(input: CreateIssuerInput): Promise<ICreditCardIssuer> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_issuers')
            .insert({
                userId,
                name: input.name.trim(),
                color: input.color ?? null,
                sortOrder: input.sortOrder ?? 0,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return mapIssuerRow(data as Record<string, unknown>);
    }

    static async updateIssuer({ id, ...changes }: UpdateIssuerInput): Promise<ICreditCardIssuer> {
        const payload: Record<string, unknown> = {};
        if (changes.name !== undefined) payload.name = changes.name.trim();
        if (changes.color !== undefined) payload.color = changes.color;
        if (changes.sortOrder !== undefined) payload.sortOrder = changes.sortOrder;

        const { data, error } = await supabase.from('cc_issuers').update(payload).eq('id', id).select().single();

        if (error) {
            throw error;
        }

        return mapIssuerRow(data as Record<string, unknown>);
    }

    /** Cascades to the issuer's cards and all of their payment entries. */
    static async deleteIssuer(id: string): Promise<void> {
        const { error } = await supabase.from('cc_issuers').delete().eq('id', id);
        if (error) {
            throw error;
        }
    }

    static async createCard(input: CreateCardInput): Promise<ICreditCard> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_cards')
            .insert({
                userId,
                issuerId: input.issuerId,
                name: input.name.trim(),
                last4: input.last4?.trim() || null,
                isActive: true,
                sortOrder: input.sortOrder ?? 0,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return mapCardRow(data as Record<string, unknown>);
    }

    /**
     * Moving a card to a different issuer moves its entire payment history into
     * the new issuer's aggregate. That is intentional: banks file SFT under
     * whoever owns the account, so the whole history follows the card.
     */
    static async updateCard({ id, ...changes }: UpdateCardInput): Promise<ICreditCard> {
        const payload: Record<string, unknown> = {};
        if (changes.issuerId !== undefined) payload.issuerId = changes.issuerId;
        if (changes.name !== undefined) payload.name = changes.name.trim();
        if (changes.last4 !== undefined) payload.last4 = changes.last4?.trim() || null;
        if (changes.isActive !== undefined) payload.isActive = changes.isActive;
        if (changes.sortOrder !== undefined) payload.sortOrder = changes.sortOrder;

        const { data, error } = await supabase.from('cc_cards').update(payload).eq('id', id).select().single();

        if (error) {
            throw error;
        }

        return mapCardRow(data as Record<string, unknown>);
    }

    static async setCardActive(id: string, isActive: boolean): Promise<ICreditCard> {
        return CreditCardService.updateCard({ id, isActive });
    }

    /** Cascades to the card's payment entries - prefer deactivating instead. */
    static async deleteCard(id: string): Promise<void> {
        const { error } = await supabase.from('cc_cards').delete().eq('id', id);
        if (error) {
            throw error;
        }
    }

    static async countEntriesForCard(cardId: string): Promise<number> {
        const { count, error } = await supabase
            .from('cc_payment_entries')
            .select('id', { count: 'exact', head: true })
            .eq('cardId', cardId);

        if (error) {
            throw error;
        }

        return count ?? 0;
    }

    // --- Payment entries ----------------------------------------------------

    static async getEntriesForFinancialYear(financialYear: string): Promise<ICreditCardPaymentEntry[]> {
        const userId = await requireUserId();
        const { startDate, endDateExclusive } = getFinancialYearRange(financialYear);

        const { data, error } = await supabase
            .from('cc_payment_entries')
            .select('*')
            .eq('userId', userId)
            .gte('periodMonth', startDate)
            .lt('periodMonth', endDateExclusive)
            .order('periodMonth', { ascending: true });

        if (error) {
            throw error;
        }

        return (data || []).map((row) => mapEntryRow(row as Record<string, unknown>));
    }

    /**
     * Upserts a cell. An entry that carries no information (no amount, no cash,
     * no note) is deleted instead, so the table stays sparse and clearing a
     * cell truly clears it.
     */
    static async savePaymentEntry(input: SavePaymentEntryInput): Promise<ICreditCardPaymentEntry | null> {
        const userId = await requireUserId();
        const note = input.note?.trim() || null;

        if (input.amount === 0 && input.cashAmount === 0 && !note) {
            await CreditCardService.deletePaymentEntry(input.cardId, input.periodMonth);
            return null;
        }

        const { data, error } = await supabase
            .from('cc_payment_entries')
            .upsert(
                {
                    userId,
                    cardId: input.cardId,
                    periodMonth: input.periodMonth,
                    amount: input.amount,
                    cashAmount: input.cashAmount,
                    note,
                },
                { onConflict: 'cardId,periodMonth' }
            )
            .select()
            .single();

        if (error) {
            throw error;
        }

        return mapEntryRow(data as Record<string, unknown>);
    }

    static async deletePaymentEntry(cardId: string, periodMonth: string): Promise<void> {
        const { error } = await supabase
            .from('cc_payment_entries')
            .delete()
            .eq('cardId', cardId)
            .eq('periodMonth', periodMonth);

        if (error) {
            throw error;
        }
    }

    // --- Tracker years ------------------------------------------------------

    static async getTrackerYear(financialYear: string): Promise<ICreditCardTrackerYear | null> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_tracker_years')
            .select('*')
            .eq('userId', userId)
            .eq('financialYear', financialYear)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data ? mapTrackerYearRow(data as Record<string, unknown>) : null;
    }

    /**
     * Creates the year row if it does not exist yet. Done here rather than in a
     * DB trigger because notes can be written before any entry exists, so the
     * app needs this call regardless.
     */
    static async ensureTrackerYear(financialYear: string): Promise<ICreditCardTrackerYear> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_tracker_years')
            .upsert(
                { userId, financialYear, notes: null },
                { onConflict: 'userId,financialYear', ignoreDuplicates: true }
            )
            .select()
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {
            return mapTrackerYearRow(data as Record<string, unknown>);
        }

        // ignoreDuplicates returns no row when one already existed.
        const existing = await CreditCardService.getTrackerYear(financialYear);
        if (!existing) {
            throw new Error(`Unable to resolve tracker year ${financialYear}`);
        }
        return existing;
    }

    static async updateTrackerYearNotes(financialYear: string, notes: string): Promise<ICreditCardTrackerYear> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('cc_tracker_years')
            .upsert({ userId, financialYear, notes: notes.trim() || null }, { onConflict: 'userId,financialYear' })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return mapTrackerYearRow(data as Record<string, unknown>);
    }

    /** Financial years that already hold data, so the selector can offer them. */
    static async getFinancialYearsWithData(): Promise<string[]> {
        const userId = await requireUserId();

        const [entriesResult, yearsResult] = await Promise.all([
            supabase.from('cc_payment_entries').select('periodMonth').eq('userId', userId),
            supabase.from('cc_tracker_years').select('financialYear').eq('userId', userId),
        ]);

        if (entriesResult.error) {
            throw entriesResult.error;
        }
        if (yearsResult.error) {
            throw yearsResult.error;
        }

        const keys = new Set<string>();
        (entriesResult.data || []).forEach((row) => {
            const [year, month, day] = String(row.periodMonth).split('-').map(Number);
            keys.add(getFinancialYearForDate(new Date(year, month - 1, day)).key);
        });
        (yearsResult.data || []).forEach((row) => keys.add(String(row.financialYear)));

        return Array.from(keys).sort((a, b) => b.localeCompare(a));
    }
}
