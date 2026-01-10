export const FONT_3X5: Record<string, number[]> = {
    'A': [0b010, 0b101, 0b111, 0b101, 0b101],
    'B': [0b110, 0b101, 0b110, 0b101, 0b110],
    'C': [0b011, 0b100, 0b100, 0b100, 0b011],
    'D': [0b110, 0b101, 0b101, 0b101, 0b110],
    'E': [0b111, 0b100, 0b110, 0b100, 0b111],
    'F': [0b111, 0b100, 0b110, 0b100, 0b100],
    'G': [0b011, 0b100, 0b101, 0b101, 0b011],
    'H': [0b101, 0b101, 0b111, 0b101, 0b101],
    'I': [0b111, 0b010, 0b010, 0b010, 0b111],
    'J': [0b001, 0b001, 0b001, 0b101, 0b010],
    'K': [0b101, 0b110, 0b100, 0b110, 0b101],
    'L': [0b100, 0b100, 0b100, 0b100, 0b111],
    'M': [0b101, 0b111, 0b101, 0b101, 0b101],
    'N': [0b101, 0b111, 0b111, 0b101, 0b101],
    'O': [0b010, 0b101, 0b101, 0b101, 0b010],
    'P': [0b110, 0b101, 0b110, 0b100, 0b100],
    'Q': [0b010, 0b101, 0b101, 0b111, 0b011],
    'R': [0b110, 0b101, 0b110, 0b101, 0b101],
    'S': [0b011, 0b100, 0b010, 0b001, 0b110],
    'T': [0b111, 0b010, 0b010, 0b010, 0b010],
    'U': [0b101, 0b101, 0b101, 0b101, 0b011],
    'V': [0b101, 0b101, 0b101, 0b101, 0b010],
    'W': [0b101, 0b101, 0b101, 0b111, 0b101],
    'X': [0b101, 0b101, 0b010, 0b101, 0b101],
    'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
    'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
    '0': [0b111, 0b101, 0b101, 0b101, 0b111],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b111, 0b001, 0b111, 0b100, 0b111],
    '3': [0b111, 0b001, 0b111, 0b001, 0b111],
    '4': [0b101, 0b101, 0b111, 0b001, 0b001],
    '5': [0b111, 0b100, 0b111, 0b001, 0b111],
    '6': [0b111, 0b100, 0b111, 0b101, 0b111],
    '7': [0b111, 0b001, 0b001, 0b001, 0b001],
    '8': [0b111, 0b101, 0b111, 0b101, 0b111],
    '9': [0b111, 0b101, 0b111, 0b001, 0b111],
    '.': [0b000, 0b000, 0b000, 0b000, 0b010],
    ',': [0b000, 0b000, 0b000, 0b010, 0b100],
    '-': [0b000, 0b000, 0b111, 0b000, 0b000],
    "'": [0b010, 0b010, 0b000, 0b000, 0b000],
    ':': [0b000, 0b010, 0b000, 0b010, 0b000],
    '/': [0b001, 0b001, 0b010, 0b100, 0b100],
};

export function measurePixelTextWidth(text: string, pixelSize: number): number {
    let w = 0;
    const t = text.toUpperCase();
    for (const char of t) {
        if (char === ' ') w += pixelSize * 3;
        else w += pixelSize * 4;
    }
    return w;
}

export function wrapPixelText(text: string, maxPixelWidth: number, pixelSize: number): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';

    const pushLine = () => {
        const l = line.trim();
        if (l) lines.push(l);
        line = '';
    };

    const splitLongWord = (word: string): string[] => {
        const parts: string[] = [];
        let remaining = word;
        while (remaining.length > 0) {
            let cut = remaining.length;
            while (cut > 1 && measurePixelTextWidth(remaining.slice(0, cut), pixelSize) > maxPixelWidth) {
                cut--;
            }
            parts.push(remaining.slice(0, cut));
            remaining = remaining.slice(cut);
        }
        return parts;
    };

    for (const rawWord of words) {
        const word = rawWord.toUpperCase();
        const wordWidth = measurePixelTextWidth(word, pixelSize);

        if (wordWidth > maxPixelWidth) {
            const parts = splitLongWord(word);
            for (const part of parts) {
                if (!line) {
                    line = part + ' ';
                } else if (measurePixelTextWidth(line + part, pixelSize) <= maxPixelWidth) {
                    line += part + ' ';
                } else {
                    pushLine();
                    line = part + ' ';
                }
            }
            continue;
        }

        if (!line) {
            line = word + ' ';
            continue;
        }

        if (measurePixelTextWidth(line + word, pixelSize) <= maxPixelWidth) {
            line += word + ' ';
        } else {
            pushLine();
            line = word + ' ';
        }
    }

    pushLine();
    return lines;
}

