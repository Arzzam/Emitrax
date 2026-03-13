import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trash2, AlertCircle, CheckCircle2, Users, Edit2, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';

import { IEmi, IEmiSplit, IEmiSplitInput } from '@/types/emi.types';
import { useEmis, useSetEmiSplits, useEmiSplits, useRemoveSplit } from '@/hooks/useEmi';
import {
    EditableSplit,
    PERCENTAGE_TOLERANCE,
    createEditableSplit,
    mapExistingToEditableSplits,
    normalizeEmail,
    useRegisteredUserLookup,
    useRegisteredUsers,
} from '@/hooks/useSplitEmi';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { errorToast, successToast } from '@/utils/toast.utils';
import { IRootState } from '@/store/types/store.types';

import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import NotFound from '@/components/common/NotFound';
import LoadingDetails from '@/components/common/LoadingDetails';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SplitEmiEditRow from '@/components/emi/SplitEmiEditRow';
import { useAccountDetails } from '@/hooks/useAccount';

const SplitEMI = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrencyAmount } = useCurrencyPreferences();
    const { data, isFetching } = useEmis();
    const currentData = useMemo(() => data?.find((emi: IEmi) => emi.id === id) || null, [data, id]);
    const [notFound, setNotFound] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedSplits, setEditedSplits] = useState<EditableSplit[]>([]);
    const allRegisteredUsers = useRegisteredUsers();
    const { id: userId } = useSelector((state: IRootState) => state.userModel);
    const { data: profile } = useAccountDetails({ enabled: !!userId });
    const { data: existingSplits } = useEmiSplits(id || '');
    const { mutate: setSplits } = useSetEmiSplits();
    const { mutate: removeSplit } = useRemoveSplit();
    const breadcrumbItems = useMemo(
        () => [
            { label: 'Dashboard', link: '/' },
            { label: `EMI Details (${currentData?.itemName})`, link: `/emi/${id}` },
            { label: 'Split EMI' },
        ],
        [currentData?.itemName, id]
    );

    useEffect(() => {
        if (!isFetching && data && !currentData) {
            setNotFound(true);
            const redirectTimer = setTimeout(() => {
                navigate('/');
            }, 3000);

            return () => clearTimeout(redirectTimer);
        }
    }, [isFetching, data, currentData, navigate]);

    // Get owner ID
    const ownerId = currentData?.userId || userId;
    const emiAmount = currentData
        ? currentData.emi +
          (currentData.amortizationSchedules[currentData.tenure - currentData.remainingTenure]?.gst || 0)
        : 0;

    useEffect(() => {
        if (isEditMode && existingSplits) {
            setEditedSplits(mapExistingToEditableSplits(existingSplits));
        } else if (!isEditMode) {
            setEditedSplits([]);
        }
    }, [isEditMode, existingSplits]);

    const totalPercentage = useMemo(
        () => editedSplits.reduce((sum, split) => sum + split.percentage, 0),
        [editedSplits]
    );

    const isTotalValid = Math.abs(totalPercentage - 100) <= PERCENTAGE_TOLERANCE;
    const splitCount = existingSplits?.length || 0;
    const { findUserByEmail } = useRegisteredUserLookup(allRegisteredUsers);
    const currentUserSplitIndex = useMemo(
        () => editedSplits.findIndex((split) => split.userId === userId),
        [editedSplits, userId]
    );
    const hasCurrentUserSplit = currentUserSplitIndex >= 0;
    const remainingForCurrentUser = useMemo(() => {
        const totalWithoutCurrentUser = editedSplits.reduce((sum, split, index) => {
            if (index === currentUserSplitIndex) return sum;
            return sum + split.percentage;
        }, 0);

        const currentUserPercentage = editedSplits.find((split) => split.userId === userId)?.percentage || 0;
        const remaining = 100 - totalWithoutCurrentUser;
        const isSameAsCurrentUserPercentage = currentUserPercentage === remaining;

        return isSameAsCurrentUserPercentage ? 0 : Number(Math.max(0, remaining).toFixed(2));
    }, [currentUserSplitIndex, editedSplits]);

    const handleUpdateSplit = useCallback(
        (index: number, field: 'name' | 'email' | 'percentage', value: string | number) => {
            setEditedSplits((previousSplits) => {
                const nextSplits = [...previousSplits];
                const currentSplit = nextSplits[index];
                if (!currentSplit) return previousSplits;

                const updatedSplit: EditableSplit = { ...currentSplit, [field]: value };

                if (field === 'email') {
                    const user = findUserByEmail(String(value));
                    if (user) {
                        updatedSplit.userId = user.id;
                        updatedSplit.isExternal = false;
                        updatedSplit.name = user.email;
                    } else {
                        updatedSplit.userId = undefined;
                        updatedSplit.isExternal = true;
                    }
                }

                nextSplits[index] = updatedSplit;
                return nextSplits;
            });
        },
        [findUserByEmail]
    );

    const handleAddSplit = useCallback(() => {
        setEditedSplits((previousSplits) => [...previousSplits, createEditableSplit()]);
    }, []);

    const handleAddCurrentUserWithRemaining = useCallback(() => {
        if (!userId) {
            errorToast('Unable to identify current user');
            return;
        }

        if (remainingForCurrentUser <= 0) {
            errorToast('No remaining percentage available');
            return;
        }

        const normalizedCurrentEmail = normalizeEmail(profile?.email || '');
        const currentUserDisplay = profile?.displayName || 'You';

        setEditedSplits((previousSplits) => {
            const currentIndex = previousSplits.findIndex((split) => split.userId === userId);

            if (currentIndex >= 0) {
                const updated = [...previousSplits];
                updated[currentIndex] = {
                    ...updated[currentIndex],
                    userId: userId,
                    isExternal: false,
                    name: currentUserDisplay,
                    email: normalizedCurrentEmail,
                    percentage: remainingForCurrentUser,
                };
                return updated;
            }

            return [
                ...previousSplits,
                {
                    tempId: `temp-self-${Date.now()}-${Math.random()}`,
                    userId: userId,
                    isExternal: false,
                    name: currentUserDisplay,
                    email: normalizedCurrentEmail,
                    percentage: remainingForCurrentUser,
                },
            ];
        });
    }, [profile?.email, profile?.displayName, userId, remainingForCurrentUser]);

    const handleRemoveSplitRow = useCallback((index: number) => {
        setEditedSplits((previousSplits) => previousSplits.filter((_, currentIndex) => currentIndex !== index));
    }, []);

    const handleSaveSplits = useCallback(() => {
        if (!id || !ownerId) {
            errorToast('Unable to determine EMI owner');
            return;
        }

        if (!isTotalValid) {
            errorToast(`Splits must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`);
            return;
        }

        for (const split of editedSplits) {
            const hasName = !!split.name.trim();
            const hasEmail = !!split.email.trim();
            if (!split.userId && !hasName && !hasEmail) {
                errorToast('Each external split needs at least a name or an email');
                return;
            }
            if (split.percentage <= 0 || split.percentage > 100) {
                errorToast('All split percentages must be between 0 and 100');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const splitInputs: IEmiSplitInput[] = editedSplits.map((split) => {
                const participantName = split.name.trim() || undefined;
                const participantEmail = split.email.trim() ? normalizeEmail(split.email) : undefined;

                if (split.userId) {
                    return {
                        userId: split.userId,
                        splitPercentage: split.percentage,
                        participantName,
                    };
                }

                return {
                    participantEmail,
                    participantName,
                    splitPercentage: split.percentage,
                };
            });

            setSplits(
                { emiId: id, splits: splitInputs },
                {
                    onSuccess: () => {
                        successToast('Splits saved successfully');
                        setIsEditMode(false);
                        setIsSubmitting(false);
                    },
                    onError: (error: Error) => {
                        errorToast(error.message || 'Failed to save splits');
                        setIsSubmitting(false);
                    },
                }
            );
        } catch (error) {
            errorToast((error as Error).message || 'Failed to save splits');
            setIsSubmitting(false);
        }
    }, [editedSplits, id, isTotalValid, ownerId, setSplits, totalPercentage]);

    const handleRemoveSplit = useCallback(
        (split: IEmiSplit) => {
            if (!id) return;

            removeSplit(
                {
                    emiId: id,
                    splitId: split.id,
                    userId: split.userId,
                    email: split.participantEmail,
                },
                {
                    onSuccess: () => {
                        successToast('Split removed successfully');
                    },
                    onError: (error: Error) => {
                        errorToast(error.message || 'Failed to remove split');
                    },
                }
            );
        },
        [id, removeSplit]
    );

    const getSplitAmount = useCallback((percentage: number) => (emiAmount * percentage) / 100, [emiAmount]);

    if (isFetching) {
        return (
            <LoadingDetails
                title="Split EMI"
                description="Loading split information..."
                description2="Please wait while we fetch your EMI split details."
            />
        );
    }

    if (notFound || !currentData) {
        return (
            <NotFound
                title="Split EMI"
                description="We couldn't find the EMI you're looking for. It may have been deleted or doesn't exist."
            />
        );
    }

    const isOwner = currentData.isOwner;
    if (!isOwner) {
        return (
            <>
                <Header title="Split EMI" />
                <BreadcrumbContainer className="py-4 px-8" items={breadcrumbItems} />
                <MainContainer>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Only the EMI owner can manage splits. You can view the split breakdown on the EMI details
                            page.
                        </AlertDescription>
                    </Alert>
                </MainContainer>
            </>
        );
    }

    return (
        <>
            <Header title="Split EMI" />
            <BreadcrumbContainer className="pt-4 pb-0 px-8" items={breadcrumbItems} />
            <MainContainer>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Split EMI</h2>
                            <p className="text-muted-foreground mt-1">
                                Divide this EMI's financial responsibility between multiple people. Splits must total
                                100%.
                            </p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Item Name</p>
                                    <p className="font-semibold">{currentData.itemName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly EMI</p>
                                    <p className="font-semibold">{formatCurrencyAmount(emiAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">No. of Persons Split</p>
                                    <p className="font-semibold">
                                        {splitCount} {splitCount === 1 ? 'person' : 'persons'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Current Splits
                                </CardTitle>
                                {!isEditMode && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Mode
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!isEditMode ? (
                                <div className="space-y-3">
                                    {existingSplits && existingSplits.length > 0 ? (
                                        existingSplits.map((split) => (
                                            <div
                                                key={split.id}
                                                className="flex items-center justify-between p-4 rounded-lg border bg-card"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">
                                                            {split.displayName || split.participantEmail || 'Unknown'}
                                                        </span>
                                                        {split.isExternal && (
                                                            <Badge variant="outline" className="text-xs">
                                                                External
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {split.displayEmail}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {split.splitPercentage.toFixed(3)}% •{' '}
                                                        {formatCurrencyAmount(getSplitAmount(split.splitPercentage))}
                                                        /month
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveSplit(split)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No splits configured. Click "Edit Mode" to add splits.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {editedSplits.map((split, index) => {
                                            const user = findUserByEmail(split.email);
                                            const isRegistered = !!user;

                                            return (
                                                <SplitEmiEditRow
                                                    key={split.id || split.tempId}
                                                    split={split}
                                                    index={index}
                                                    isRegistered={isRegistered}
                                                    onUpdateSplit={handleUpdateSplit}
                                                    onRemoveSplitRow={handleRemoveSplitRow}
                                                    getSplitAmount={getSplitAmount}
                                                />
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Total:</span>
                                            <Badge variant={isTotalValid ? 'default' : 'secondary'}>
                                                {totalPercentage.toFixed(2)}%
                                            </Badge>
                                        </div>
                                        {!isTotalValid && (
                                            <Alert className="flex-1 max-w-md">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-xs">
                                                    {totalPercentage < 100 - PERCENTAGE_TOLERANCE
                                                        ? `${(100 - totalPercentage).toFixed(2)}% remaining`
                                                        : `${(totalPercentage - 100).toFixed(2)}% over-allocated`}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        {isTotalValid && (
                                            <Alert className="flex-1 max-w-md">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                                                    Ready to save!
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditMode(false)}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleAddSplit}
                                            disabled={isSubmitting}
                                            className="flex-1"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Split
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleAddCurrentUserWithRemaining}
                                            disabled={isSubmitting || !userId || remainingForCurrentUser <= 0}
                                            className="flex-1"
                                        >
                                            {hasCurrentUserSplit ? 'Set My Share' : 'Add Me'} (
                                            {remainingForCurrentUser.toFixed(2)}%)
                                        </Button>
                                        <Button
                                            onClick={handleSaveSplits}
                                            disabled={!isTotalValid || isSubmitting}
                                            className="flex-1"
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save Splits'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainContainer>
        </>
    );
};

export default SplitEMI;
