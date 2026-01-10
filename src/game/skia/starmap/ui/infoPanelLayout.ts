import { measurePixelTextWidth, wrapPixelText } from './pixelFont3x5';

export interface PlanetInfoPanelLayout {
    panelX: number;
    panelY: number;
    panelWidth: number;
    panelHeight: number;
    textX: number;
    nameY: number;
    typeY: number;
    descY: number;
    name: string;
    type: string;
    descLines: string[];
    lineHeight: number;
    gapY: number;
    paddingX: number;
    paddingY: number;
}

export interface LayoutPlanetInfoPanelParams {
    viewportWidth: number;
    viewportHeight: number;
    pixelSize: number;
    name: string;
    type: string;
    description: string;
    marginTop?: number;
    marginRight?: number;
}

export function layoutPlanetInfoPanel(params: LayoutPlanetInfoPanelParams): PlanetInfoPanelLayout {
    const ps = params.pixelSize;
    const marginTop = params.marginTop ?? 20;
    const marginRight = params.marginRight ?? 20;
    const paddingX = 12;
    const paddingY = 12;
    const gapY = ps * 2;
    const lineHeight = ps * 6;

    const name = params.name.toUpperCase();
    const type = params.type.toUpperCase();
    const description = params.description.toUpperCase();

    const minPanelWidth = 190;
    const maxPanelWidth = Math.max(minPanelWidth, Math.min(340, params.viewportWidth - marginRight - 20));

    let panelWidth = Math.min(maxPanelWidth, 240);
    let contentWidth = panelWidth - paddingX * 2;
    let descLines = wrapPixelText(description, contentWidth, ps);

    const widestLine = Math.max(
        measurePixelTextWidth(name, ps),
        measurePixelTextWidth(type, ps),
        ...descLines.map((l) => measurePixelTextWidth(l, ps))
    );

    panelWidth = Math.max(minPanelWidth, Math.min(maxPanelWidth, widestLine + paddingX * 2 + ps * 2));
    contentWidth = panelWidth - paddingX * 2;
    descLines = wrapPixelText(description, contentWidth, ps);

    const baseHeight = paddingY * 2 + lineHeight * 2 + gapY;
    let panelHeight = baseHeight + descLines.length * lineHeight;

    const maxPanelHeight = Math.max(120, params.viewportHeight - marginTop - 20);
    if (panelHeight > maxPanelHeight) {
        const available = Math.max(1, Math.floor((maxPanelHeight - baseHeight) / lineHeight));
        if (descLines.length > available) {
            descLines = descLines.slice(0, Math.max(1, available));
            descLines[descLines.length - 1] = '...';
        }
        panelHeight = baseHeight + descLines.length * lineHeight;
    }

    const panelX = params.viewportWidth - marginRight - panelWidth;
    const panelY = marginTop;

    const textX = panelX + paddingX;
    const nameY = panelY + paddingY;
    const typeY = nameY + lineHeight;
    const descY = typeY + lineHeight + gapY;

    return {
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        textX,
        nameY,
        typeY,
        descY,
        name,
        type,
        descLines,
        lineHeight,
        gapY,
        paddingX,
        paddingY,
    };
}

