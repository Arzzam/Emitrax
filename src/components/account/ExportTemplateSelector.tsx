import { cn } from '@/lib/utils';
import { ExcelTemplate, PdfTemplate } from '@/types/export.types';
import { EXCEL_TEMPLATE_OPTIONS, PDF_TEMPLATE_OPTIONS } from '@/validations/account.forms';

function ModernIcon() {
    return (
        <svg viewBox="0 0 64 44" className="w-full h-full" aria-hidden="true">
            <rect x="0" y="0" width="64" height="12" rx="2" fill="#1e40af" />
            <rect x="4" y="16" width="27" height="4" rx="1" fill="#dbeafe" />
            <rect x="4" y="22" width="27" height="4" rx="1" fill="#eff6ff" />
            <rect x="4" y="28" width="27" height="4" rx="1" fill="#dbeafe" />
            <rect x="35" y="16" width="25" height="4" rx="1" fill="#dbeafe" />
            <rect x="35" y="22" width="25" height="4" rx="1" fill="#eff6ff" />
            <rect x="35" y="28" width="25" height="4" rx="1" fill="#dbeafe" />
            <rect x="4" y="35" width="56" height="2" rx="0.5" fill="#3b82f6" />
            <rect x="4" y="38" width="56" height="2" rx="0.5" fill="#dbeafe" />
        </svg>
    );
}

function ClassicIcon() {
    return (
        <svg viewBox="0 0 64 44" className="w-full h-full" aria-hidden="true">
            <rect x="0" y="0" width="64" height="3" fill="#1e3a5f" />
            <rect x="4" y="7" width="30" height="3" rx="0.5" fill="#1e3a5f" />
            <rect x="4" y="12" width="20" height="1.5" rx="0.5" fill="#9ca3af" />
            <rect x="0" y="17" width="64" height="6" fill="#1e3a5f" />
            <rect x="4" y="25" width="56" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="0" y="27" width="1.5" height="8" fill="#e5e7eb" />
            <rect x="62.5" y="27" width="1.5" height="8" fill="#e5e7eb" />
            <rect x="4" y="28.5" width="56" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="31" width="56" height="1.5" rx="0.5" fill="#f3f4f6" />
            <rect x="4" y="33.5" width="56" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="0" y="35" width="64" height="1.5" fill="#e5e7eb" />
        </svg>
    );
}

function MinimalIcon() {
    return (
        <svg viewBox="0 0 64 44" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="4" width="36" height="6" rx="1" fill="#111827" />
            <rect x="4" y="14" width="56" height="1" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="19" width="56" height="1.5" rx="0.5" fill="#d1d5db" />
            <rect x="4" y="22" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="25" width="40" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="30" width="56" height="1" rx="0.5" fill="#374151" />
            <rect x="4" y="33" width="56" height="1" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="36" width="56" height="1" rx="0.5" fill="#e5e7eb" />
            <rect x="4" y="39" width="56" height="1" rx="0.5" fill="#374151" />
        </svg>
    );
}

function DetailedIcon() {
    return (
        <svg viewBox="0 0 64 44" className="w-full h-full" aria-hidden="true">
            <rect x="0" y="0" width="30" height="44" rx="2" fill="#eff6ff" />
            <rect x="32" y="0" width="32" height="44" rx="2" fill="#f0fdf4" />
            <rect x="2" y="2" width="26" height="6" rx="1" fill="#1e40af" />
            <rect x="2" y="10" width="26" height="1.5" rx="0.5" fill="#dbeafe" />
            <rect x="2" y="13" width="26" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="2" y="16" width="26" height="1.5" rx="0.5" fill="#dbeafe" />
            <rect x="2" y="19" width="26" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="34" y="2" width="28" height="4" rx="1" fill="#15803d" />
            <rect x="34" y="8" width="28" height="1.5" rx="0.5" fill="#dcfce7" />
            <rect x="34" y="11" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="34" y="14" width="28" height="1.5" rx="0.5" fill="#dcfce7" />
            <rect x="34" y="17" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
            <rect x="34" y="20" width="28" height="1.5" rx="0.5" fill="#dcfce7" />
        </svg>
    );
}

function CompactIcon() {
    return (
        <svg viewBox="0 0 64 44" className="w-full h-full" aria-hidden="true">
            <rect x="0" y="0" width="64" height="44" rx="2" fill="#f8fafc" />
            <rect x="2" y="2" width="60" height="8" rx="1" fill="#1e3a5f" />
            <rect x="2" y="12" width="28" height="3" rx="0.5" fill="#dbeafe" />
            <rect x="34" y="12" width="28" height="3" rx="0.5" fill="#dbeafe" />
            <rect x="2" y="17" width="28" height="3" rx="0.5" fill="#e5e7eb" />
            <rect x="34" y="17" width="28" height="3" rx="0.5" fill="#e5e7eb" />
            <rect x="2" y="24" width="60" height="4" rx="0.5" fill="#1e3a5f" />
            <rect x="2" y="30" width="60" height="2" rx="0.5" fill="#eff6ff" />
            <rect x="2" y="33" width="60" height="2" rx="0.5" fill="#e5e7eb" />
            <rect x="2" y="36" width="60" height="2" rx="0.5" fill="#eff6ff" />
        </svg>
    );
}

const PDF_ICONS: Record<PdfTemplate, React.ReactNode> = {
    modern: <ModernIcon />,
    classic: <ClassicIcon />,
    minimal: <MinimalIcon />,
};

const EXCEL_ICONS: Record<ExcelTemplate, React.ReactNode> = {
    detailed: <DetailedIcon />,
    compact: <CompactIcon />,
};

interface PdfTemplateSelectorProps {
    type: 'pdf';
    value: PdfTemplate;
    onChange: (v: PdfTemplate) => void;
}

interface ExcelTemplateSelectorProps {
    type: 'excel';
    value: ExcelTemplate;
    onChange: (v: ExcelTemplate) => void;
}

type ExportTemplateSelectorProps = PdfTemplateSelectorProps | ExcelTemplateSelectorProps;

export function ExportTemplateSelector(props: ExportTemplateSelectorProps) {
    const options = props.type === 'pdf' ? PDF_TEMPLATE_OPTIONS : EXCEL_TEMPLATE_OPTIONS;

    return (
        <div className={cn('grid gap-3', props.type === 'pdf' ? 'grid-cols-3' : 'grid-cols-2')}>
            {options.map((opt) => {
                const isSelected = props.value === opt.value;
                const icon =
                    props.type === 'pdf'
                        ? PDF_ICONS[opt.value as PdfTemplate]
                        : EXCEL_ICONS[opt.value as ExcelTemplate];

                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                            if (props.type === 'pdf') {
                                (props as PdfTemplateSelectorProps).onChange(opt.value as PdfTemplate);
                            } else {
                                (props as ExcelTemplateSelectorProps).onChange(opt.value as ExcelTemplate);
                            }
                        }}
                        className={cn(
                            'flex flex-col gap-2 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected ? 'border-primary ring-2 ring-primary bg-accent/30' : 'border-border bg-card'
                        )}
                    >
                        <div className="w-full aspect-[64/44] overflow-hidden rounded">{icon}</div>
                        <div>
                            <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
