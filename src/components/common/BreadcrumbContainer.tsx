import React from 'react';
import { Link } from 'react-router';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';

export interface IBreadCrumbItem {
    label: string;
    link?: string;
}

const BreadCrumbContainer = ({ items, className }: { items: IBreadCrumbItem[]; className?: string }) => {
    return (
        <Breadcrumb className={className}>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        <BreadcrumbItem>
                            {item.link ? (
                                <Link className="transition-colors hover:text-foreground" to={item.link}>
                                    {item.label}
                                </Link>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {index < items.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default BreadCrumbContainer;
