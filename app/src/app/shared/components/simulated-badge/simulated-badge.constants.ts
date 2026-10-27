import { ConnectedPosition } from '@angular/cdk/overlay';

export const simulatedBadgeSettings = {
  HIDE_DELAY_MS: 160,
  TITLE: 'What is real here',
  SIMULATED: 'Simulated: the site loads (seeded generator, seed 42) and the Torus Station itself, a Nova Spin flywheel plus a Nova Pulse battery.',
  REAL: "Real: PACE's public grid data (load, forecast, price, carbon) and Rocky Mountain Power's published tariffs."
};

export const simulatedBadgePositions: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 }
];
