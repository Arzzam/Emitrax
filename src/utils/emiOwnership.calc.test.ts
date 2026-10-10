import { describe, expect, it } from 'vitest';

import { IEmi, IEmiSplit } from '@/types/emi.types';
import { getParticipantEmail, getParticipantName, resolveEmiOwnership } from '@/utils/emiOwnership.calc';

const ME = 'user-me';
const FRIEND = 'user-friend';

const makeSplit = (overrides: Partial<IEmiSplit>): IEmiSplit => ({
    id: 'split-1',
    emiId: 'emi-1',
    splitPercentage: 0,
    splitAmount: 0,
    isExternal: false,
    createdBy: ME,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

const makeEmi = (overrides: Partial<IEmi>): Pick<IEmi, 'splits' | 'mySplit' | 'isOwner' | 'userId'> => ({
    userId: ME,
    isOwner: true,
    splits: [],
    mySplit: undefined,
    ...overrides,
});

describe('resolveEmiOwnership', () => {
    it('treats an unsplit owned loan as wholly the user’s', () => {
        const ownership = resolveEmiOwnership(makeEmi({}), ME);

        expect(ownership.mode).toBe('sole');
        expect(ownership.myPercentage).toBe(100);
        expect(ownership.othersPercentage).toBe(0);
        expect(ownership.isSplit).toBe(false);
    });

    it('treats a loan split 100% to someone else as on_behalf', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [makeSplit({ id: 's-friend', userId: FRIEND, splitPercentage: 100 })],
            }),
            ME
        );

        expect(ownership.mode).toBe('on_behalf');
        expect(ownership.myPercentage).toBe(0);
        expect(ownership.othersPercentage).toBe(100);
        expect(ownership.unallocatedPercentage).toBe(0);
    });

    it('splits proportionally when the user holds a share', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [
                    makeSplit({ id: 's-me', userId: ME, splitPercentage: 60 }),
                    makeSplit({ id: 's-friend', userId: FRIEND, splitPercentage: 40 }),
                ],
            }),
            ME
        );

        expect(ownership.mode).toBe('shared');
        expect(ownership.myPercentage).toBe(60);
        expect(ownership.othersPercentage).toBe(40);
        expect(ownership.coveredPercentage).toBe(100);
    });

    it('gives the owner every percentage no split row claims', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [makeSplit({ id: 's-friend', userId: FRIEND, splitPercentage: 40 })],
            }),
            ME
        );

        expect(ownership.mode).toBe('shared');
        expect(ownership.unallocatedPercentage).toBe(60);
        expect(ownership.myPercentage).toBe(60);
        expect(ownership.isPartialView).toBe(false);
    });

    it('never hands the unallocated remainder to a non-owner participant', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                userId: FRIEND,
                isOwner: false,
                splits: [makeSplit({ id: 's-me', userId: ME, splitPercentage: 30 })],
            }),
            ME
        );

        expect(ownership.myPercentage).toBe(30);
        expect(ownership.unallocatedPercentage).toBe(0);
        expect(ownership.isPartialView).toBe(true);
    });

    it('classifies a loan shared read-only as observer, not on_behalf', () => {
        const ownership = resolveEmiOwnership(makeEmi({ userId: FRIEND, isOwner: false }), ME);

        expect(ownership.mode).toBe('observer');
        expect(ownership.myPercentage).toBe(0);
        expect(ownership.isPartialView).toBe(false);
    });

    it('absorbs float slop at the 100% boundary', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [
                    makeSplit({ id: 's-me', userId: ME, splitPercentage: 33.33 }),
                    makeSplit({ id: 's-a', userId: FRIEND, splitPercentage: 33.33 }),
                    makeSplit({ id: 's-b', participantName: 'Ravi', isExternal: true, splitPercentage: 33.34 }),
                ],
            }),
            ME
        );

        expect(ownership.coveredPercentage).toBe(100);
        expect(ownership.myPercentage).toBe(33.33);
        expect(ownership.mode).toBe('shared');
    });

    it('reads a 99.995% share as sole rather than shared', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [makeSplit({ id: 's-me', userId: ME, splitPercentage: 99.995 })],
            }),
            ME
        );

        expect(ownership.mode).toBe('sole');
    });

    it('ignores an external row that happens to carry the user’s id', () => {
        const ownership = resolveEmiOwnership(
            makeEmi({
                splits: [makeSplit({ id: 's-ext', userId: ME, isExternal: true, splitPercentage: 100 })],
            }),
            ME
        );

        expect(ownership.myPercentage).toBe(0);
        expect(ownership.mode).toBe('on_behalf');
    });

    it('falls back to userId comparison when isOwner is absent', () => {
        const ownership = resolveEmiOwnership({ userId: ME, isOwner: undefined, splits: [] }, ME);

        expect(ownership.isOwner).toBe(true);
        expect(ownership.mode).toBe('sole');
    });
});

describe('getParticipantName', () => {
    it('prefers the entered name for an external participant', () => {
        expect(getParticipantName(makeSplit({ participantName: 'Ravi', isExternal: true }))).toBe('Ravi');
    });

    it('falls back to the joined profile email for a registered participant', () => {
        expect(getParticipantName(makeSplit({ user_profiles: { email: 'a@b.com' } }))).toBe('a@b.com');
    });

    it('reports Unknown when nothing identifies the participant', () => {
        expect(getParticipantName(makeSplit({}))).toBe('Unknown');
    });
});

describe('getParticipantEmail', () => {
    it('returns null when the participant is name-only', () => {
        expect(getParticipantEmail(makeSplit({ participantName: 'Ravi', isExternal: true }))).toBeNull();
    });

    it('returns the profile email for a registered participant', () => {
        expect(getParticipantEmail(makeSplit({ user_profiles: { email: 'a@b.com' } }))).toBe('a@b.com');
    });
});
