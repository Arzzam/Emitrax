import { useState } from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';

import { IEmi } from '@/types/emi.types';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import EMIForm from './EMIForm';

const FormModal = ({ data }: { data?: IEmi }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isEdit = !!data;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
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
            </SheetTrigger>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
                onInteractOutside={(ev) => ev.preventDefault()}
            >
                <SheetHeader className="shrink-0 border-b px-6 py-5">
                    <SheetTitle>{isEdit ? 'Edit EMI' : 'Add EMI'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update your EMI details. Changes will recalculate the schedule.'
                            : 'Enter the details of your new EMI to start tracking payments.'}
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                    <EMIForm setIsOpen={setIsOpen} data={data} />
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default FormModal;
