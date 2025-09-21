import { useState } from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';

import { IEmi } from '@/types/emi.types';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import EMIForm from './EMIForm';
import { Button } from '@/components/ui/button';

const FormModal = ({ data }: { data?: IEmi }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isEdit = !!data;
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    {isEdit ? (
                        <>
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit EMI</span>
                        </>
                    ) : (
                        <>
                            <PlusIcon className="h-4 w-4" />
                            <span>Add EMI</span>
                        </>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent onInteractOutside={(ev) => ev.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit EMI' : 'Add EMI'}</DialogTitle>
                    <DialogDescription>Enter the details of your new EMI here.</DialogDescription>
                </DialogHeader>
                <EMIForm setIsOpen={setIsOpen} data={data} />
            </DialogContent>
        </Dialog>
    );
};

export default FormModal;
