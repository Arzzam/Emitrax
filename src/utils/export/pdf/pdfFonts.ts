import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY = 'NotoSans';

const NOTO_SANS_REGULAR =
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_SANS_BOLD = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

let fontsRegistered = false;

export function registerPdfFonts(): void {
    if (fontsRegistered) return;

    Font.register({
        family: PDF_FONT_FAMILY,
        fonts: [
            { src: NOTO_SANS_REGULAR, fontWeight: 'normal' },
            { src: NOTO_SANS_BOLD, fontWeight: 'bold' },
        ],
    });

    fontsRegistered = true;
}
