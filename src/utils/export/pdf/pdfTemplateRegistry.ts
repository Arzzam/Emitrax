import { PdfTemplate } from '@/types/export.types';

import { ClassicTemplate } from './templates/ClassicTemplate';
import { MinimalTemplate } from './templates/MinimalTemplate';
import { ModernTemplate } from './templates/ModernTemplate';
import { PdfTemplateProps } from './templates/shared';

export const pdfTemplateRegistry: Record<PdfTemplate, React.ComponentType<PdfTemplateProps>> = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
};
