import type { Rgb } from '../../math/color';
import { layoutPlanetInfoPanel } from '../../ui/infoPanelLayout';
import { drawPixelText } from '../../ui/pixelTextDraw';
import type { PixelRenderer } from '../PixelRenderer';

export interface PlanetInfo {
  name: string;
  type: string;
  description: string;
  color: Rgb;
}

export interface DrawInfoPanelParams {
  renderer: PixelRenderer;
  viewportWidth: number;
  viewportHeight: number;
  pixelSize: number;
  selected: PlanetInfo | null;
  lightGray: Rgb;
  midGray: Rgb;
}

export function drawPlanetInfoPanel(params: DrawInfoPanelParams): void {
  if (!params.selected) return;

  const layout = layoutPlanetInfoPanel({
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    pixelSize: params.pixelSize,
    name: params.selected.name,
    type: params.selected.type,
    description: params.selected.description,
  });

  params.renderer.fillRectLTRB(
    layout.panelX,
    layout.panelY,
    layout.panelX + layout.panelWidth,
    layout.panelY + layout.panelHeight,
    [0, 0, 0],
    0.85
  );

  const ps = params.pixelSize;
  const borderColor = params.selected.color;
  const borderOpacity = 0.6;

  params.renderer.fillRectLTRB(
    layout.panelX,
    layout.panelY,
    layout.panelX + layout.panelWidth,
    layout.panelY + ps,
    borderColor,
    borderOpacity
  );
  params.renderer.fillRectLTRB(
    layout.panelX,
    layout.panelY + layout.panelHeight - ps,
    layout.panelX + layout.panelWidth,
    layout.panelY + layout.panelHeight,
    borderColor,
    borderOpacity
  );
  params.renderer.fillRectLTRB(
    layout.panelX,
    layout.panelY,
    layout.panelX + ps,
    layout.panelY + layout.panelHeight,
    borderColor,
    borderOpacity
  );
  params.renderer.fillRectLTRB(
    layout.panelX + layout.panelWidth - ps,
    layout.panelY,
    layout.panelX + layout.panelWidth,
    layout.panelY + layout.panelHeight,
    borderColor,
    borderOpacity
  );

  drawPixelText(
    params.renderer,
    layout.textX,
    layout.nameY,
    layout.name,
    params.selected.color,
    1,
    ps
  );
  drawPixelText(
    params.renderer,
    layout.textX,
    layout.typeY,
    layout.type,
    params.lightGray,
    0.7,
    ps
  );

  let y = layout.descY;
  for (const line of layout.descLines) {
    drawPixelText(
      params.renderer,
      layout.textX,
      y,
      line,
      params.midGray,
      0.6,
      ps
    );
    y += layout.lineHeight;
  }
}
