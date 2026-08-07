import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Calculator, Check, ChevronsUpDown, FileText, LineChart, Receipt, Share2, Split } from 'lucide-react';

import { useEmis } from '@/hooks/useEmi';
import { IEmi } from '@/types/emi.types';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';

/** Sub-pages of a single EMI, relative to /emi/:id. */
const EMI_SUB_NAV = [
    { segment: '', label: 'Details', icon: FileText },
    { segment: '/amortization', label: 'Amortization', icon: Calculator },
    { segment: '/scenarios', label: 'Scenarios', icon: LineChart },
    { segment: '/share', label: 'Share', icon: Share2 },
    { segment: '/split', label: 'Split', icon: Split },
] as const;

/** The active EMI is read from the URL, so there is no extra state to desync. */
export function getActiveEmiId(pathname: string): string | undefined {
    return /^\/emi\/([^/]+)/.exec(pathname)?.[1];
}

const EmiPicker = ({
    emis,
    activeEmi,
    isLoading,
}: {
    emis: IEmi[];
    activeEmi: IEmi | undefined;
    isLoading: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { isMobile, setOpenMobile } = useSidebar();

    const choose = (emi: IEmi) => {
        setOpen(false);
        if (isMobile) setOpenMobile(false);
        navigate(`/emi/${emi.id}`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={isLoading || emis.length === 0}
                    className="h-8 w-full justify-between px-2 font-normal group-data-[collapsible=icon]:hidden"
                >
                    <span className="truncate text-sm">
                        {isLoading
                            ? 'Loading...'
                            : emis.length === 0
                              ? 'No EMIs yet'
                              : (activeEmi?.itemName ?? 'Select an EMI')}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start" side="right">
                <Command>
                    <CommandInput placeholder="Search EMIs..." />
                    <CommandList>
                        <CommandEmpty>No EMI found.</CommandEmpty>
                        <CommandGroup>
                            {emis.map((emi) => (
                                <CommandItem
                                    key={emi.id}
                                    value={`${emi.itemName} ${emi.id}`}
                                    onSelect={() => choose(emi)}
                                >
                                    <Receipt aria-hidden />
                                    <span className="flex-1 truncate">{emi.itemName}</span>
                                    {activeEmi?.id === emi.id && <Check className="size-4" aria-hidden />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

/**
 * EMI section of the sidebar: a picker plus the active EMI's sub-pages.
 * Sub-pages only render once an EMI is in scope, so the rail never shows
 * links that would 404.
 */
const EmiNav = () => {
    const { pathname } = useLocation();
    const { data: emis = [], isLoading } = useEmis();
    const { isMobile, setOpenMobile } = useSidebar();

    const activeEmiId = getActiveEmiId(pathname);
    const activeEmi = emis.find((emi) => emi.id === activeEmiId);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>EMI</SidebarGroupLabel>

            <div className="px-1 pb-1">
                <EmiPicker emis={emis} activeEmi={activeEmi} isLoading={isLoading} />
            </div>

            {activeEmiId && (
                <SidebarMenu>
                    <SidebarMenuItem>
                        {/* Collapsed rail has no room for the picker, so the icon
                            doubles as the link back to the active EMI. */}
                        <SidebarMenuButton
                            asChild
                            tooltip={activeEmi?.itemName ?? 'EMI'}
                            className="hidden group-data-[collapsible=icon]:flex"
                        >
                            <Link to={`/emi/${activeEmiId}`}>
                                <Receipt />
                                <span>{activeEmi?.itemName ?? 'EMI'}</span>
                            </Link>
                        </SidebarMenuButton>

                        <SidebarMenuSub>
                            {EMI_SUB_NAV.map((item) => {
                                const href = `/emi/${activeEmiId}${item.segment}`;
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuSubItem key={item.label}>
                                        <SidebarMenuSubButton asChild isActive={pathname === href}>
                                            <Link
                                                to={href}
                                                onClick={() => {
                                                    if (isMobile) setOpenMobile(false);
                                                }}
                                            >
                                                <Icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                );
                            })}
                        </SidebarMenuSub>
                    </SidebarMenuItem>
                </SidebarMenu>
            )}
        </SidebarGroup>
    );
};

export default EmiNav;
