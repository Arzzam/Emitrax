import { Icons } from '@/assets/icons';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';

const ConfirmationModal = ({
    title,
    description,
    cancelText,
    confirmText,
    onConfirm,
    onCancel,
    open,
    setOpen,
    isLoading,
}: {
    title: string;
    description?: string;
    cancelText?: string;
    confirmText?: string;
    onConfirm: (setOpen: (open: boolean) => void) => void;
    onCancel: () => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    isLoading?: boolean;
}) => {
    const handleCancel = () => {
        setOpen(false);
        onCancel();
    };

    const handleConfirm = () => {
        onConfirm(setOpen);
    };
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} className="cursor-pointer">
                        {cancelText || 'Cancel'}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="cursor-pointer" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                            </>
                        ) : (
                            confirmText || 'Confirm'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationModal;
