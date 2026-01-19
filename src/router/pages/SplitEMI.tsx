import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trash2, AlertCircle, CheckCircle2, Users, Edit2, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';

import { IEmi, IEmiSplit, IEmiSplitInput } from '@/types/emi.types';
import { useEmis, useSetEmiSplits, useEmiSplits, useRemoveSplit } from '@/hooks/useEmi';
import { errorToast, successToast } from '@/utils/toast.utils';
import { IRootState } from '@/store/types/store.types';
import { formatAmount } from '@/utils/utils';
import { supabase } from '@/supabase/supabase';

import MainContainer from '@/components/common/Container';
import Header from '@/components/common/Header';
import BreadcrumbContainer from '@/components/common/BreadcrumbContainer';
import NotFound from '@/components/common/NotFound';
import LoadingDetails from '@/components/common/LoadingDetails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SplitEMI = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isFetching } = useEmis();
    const currentData = useMemo(() => data?.find((emi: IEmi) => emi.id === id) || null, [data, id]);
    const [notFound, setNotFound] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedSplits, setEditedSplits] = useState<
        Array<{
            id?: string;
            tempId?: string;
            name: string;
            email: string;
            percentage: number;
            userId?: string;
            isExternal?: boolean;
        }>
    >([]);
    const [allRegisteredUsers, setAllRegisteredUsers] = useState<Array<{ id: string; email: string }>>([]);
    const { id: currentUserId } = useSelector((state: IRootState) => state.userModel);
    const { data: existingSplits } = useEmiSplits(id || '');
    const { mutate: setSplits } = useSetEmiSplits();
    const { mutate: removeSplit } = useRemoveSplit();

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
    const ownerId = currentData?.userId || currentUserId;
    const emiAmount = currentData
        ? currentData.emi +
          (currentData.amortizationSchedules[currentData.tenure - currentData.remainingTenure]?.gst || 0)
        : 0;

    // Fetch all registered users for email matching
    useEffect(() => {
        const fetchRegisteredUsers = async () => {
            try {
                const { data, error } = await supabase.from('user_profiles').select('id, email').limit(1000);
                if (error) throw error;
                setAllRegisteredUsers(data || []);
            } catch (error) {
                console.error('Error fetching registered users:', error);
            }
        };
        fetchRegisteredUsers();
    }, []);

    // Initialize edited splits when entering edit mode
    useEffect(() => {
        if (isEditMode && existingSplits) {
            const initialSplits = existingSplits.map((split) => ({
                id: split.id,
                name: split.participantName || split.displayName || split.displayEmail || '',
                email: split.displayEmail || split.participantEmail || '',
                percentage: split.splitPercentage,
                userId: split.userId,
                isExternal: split.isExternal,
            }));
            setEditedSplits(initialSplits);
        } else if (!isEditMode) {
            setEditedSplits([]);
        }
    }, [isEditMode, existingSplits]);

    // Calculate total percentage
    const totalPercentage = useMemo(() => {
        return editedSplits.reduce((sum, split) => sum + split.percentage, 0);
    }, [editedSplits]);

    const isTotalValid = totalPercentage >= 99.99 && totalPercentage <= 100.01;
    const splitCount = existingSplits?.length || 0;

    // Check if email belongs to registered user
    const findUserByEmail = (email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        return allRegisteredUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
    };

    // Update edited split
    const handleUpdateSplit = (index: number, field: 'name' | 'email' | 'percentage', value: string | number) => {
        const updated = [...editedSplits];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-detect if user is registered based on email
        if (field === 'email') {
            const user = findUserByEmail(value as string);
            if (user) {
                updated[index].userId = user.id;
                updated[index].isExternal = false;
                updated[index].name = user.email; // Use email as name for registered users
            } else {
                updated[index].userId = undefined;
                updated[index].isExternal = true;
            }
        }

        setEditedSplits(updated);
    };

    // Add new split row
    const handleAddSplit = () => {
        setEditedSplits([
            ...editedSplits,
            {
                tempId: `temp-${Date.now()}-${Math.random()}`,
                name: '',
                email: '',
                percentage: 0,
                isExternal: true,
            },
        ]);
    };

    // Remove split row
    const handleRemoveSplitRow = (index: number) => {
        setEditedSplits(editedSplits.filter((_, i) => i !== index));
    };

    // Save all edited splits
    const handleSaveSplits = async () => {
        if (!id || !ownerId) {
            errorToast('Unable to determine EMI owner');
            return;
        }

        if (!isTotalValid) {
            errorToast(`Splits must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`);
            return;
        }

        // Validate all splits have required fields
        for (const split of editedSplits) {
            if (!split.email || !split.email.trim()) {
                errorToast('All splits must have an email address');
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
                if (split.userId) {
                    // Registered user
                    return {
                        userId: split.userId,
                        splitPercentage: split.percentage,
                        participantName: split.name.trim() || undefined,
                    };
                } else {
                    // External user
                    return {
                        participantEmail: split.email.trim().toLowerCase(),
                        participantName: split.name.trim() || undefined,
                        splitPercentage: split.percentage,
                    };
                }
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
    };

    const handleRemoveSplit = (split: IEmiSplit) => {
        if (!id) return;

        removeSplit(
            {
                emiId: id,
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
    };

    const getSplitAmount = (percentage: number) => {
        return (emiAmount * percentage) / 100;
    };

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
                <BreadcrumbContainer
                    className="py-4 px-8"
                    items={[
                        { label: 'Dashboard', link: '/' },
                        { label: `EMI Details (${currentData?.itemName})`, link: `/emi/${id}` },
                        { label: 'Split EMI' },
                    ]}
                />
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
            <BreadcrumbContainer
                className="pt-4 pb-0 px-8"
                items={[
                    { label: 'Dashboard', link: '/' },
                    { label: `EMI Details (${currentData?.itemName})`, link: `/emi/${id}` },
                    { label: 'Split EMI' },
                ]}
            />
            <MainContainer>
                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Split EMI</h2>
                            <p className="text-muted-foreground mt-1">
                                Divide this EMI's financial responsibility between multiple people. Splits must total
                                100%.
                            </p>
                        </div>
                        {/* <Button variant="outline" asChild>
                            <Link to={`/emi/${id}`}>
                                <Users className="h-4 w-4 mr-2" />
                                Back to EMI Details
                            </Link>
                        </Button> */}
                    </div>

                    {/* EMI Summary */}
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
                                    <p className="font-semibold">₹{formatAmount(emiAmount)}</p>
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

                    {/* Current Splits */}
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
                                // View Mode
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
                                                        {split.splitPercentage.toFixed(3)}% • ₹
                                                        {formatAmount(getSplitAmount(split.splitPercentage))}/month
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
                                // Edit Mode
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {editedSplits.map((split, index) => {
                                            const user = findUserByEmail(split.email);
                                            const isRegistered = !!user;

                                            return (
                                                <div
                                                    key={split.id || split.tempId}
                                                    className="grid grid-cols-12 gap-3 p-4 rounded-lg border bg-card items-center"
                                                >
                                                    <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                                        <Input
                                                            placeholder="Name"
                                                            value={split.name}
                                                            onChange={(e) =>
                                                                handleUpdateSplit(index, 'name', e.target.value)
                                                            }
                                                        />
                                                        <div className="h-6"></div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                                        <Input
                                                            type="email"
                                                            placeholder="Email"
                                                            value={split.email}
                                                            onChange={(e) =>
                                                                handleUpdateSplit(index, 'email', e.target.value)
                                                            }
                                                        />
                                                        {isRegistered && (
                                                            <Badge variant="default" className="text-xs h-6">
                                                                App User
                                                            </Badge>
                                                        )}
                                                        {!isRegistered && split.email && (
                                                            <Badge variant="outline" className="text-xs h-6">
                                                                External
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0.01"
                                                                max="100"
                                                                placeholder="Percentage"
                                                                value={split.percentage || ''}
                                                                onChange={(e) =>
                                                                    handleUpdateSplit(
                                                                        index,
                                                                        'percentage',
                                                                        parseFloat(e.target.value) || 0
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-sm text-muted-foreground">%</span>
                                                        </div>
                                                        {split.percentage > 0 && (
                                                            <div className="text-xs text-muted-foreground h-6 flex items-center">
                                                                ₹{formatAmount(getSplitAmount(split.percentage))}/month
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-12 md:col-span-2 flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveSplitRow(index)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Total and Validation */}
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
                                                    {totalPercentage < 99.99
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

                                    {/* Action Buttons */}
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
