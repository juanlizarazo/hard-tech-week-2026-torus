import { ForecastScoreHelper } from '../signals/forecast-score.helper';
import { IForecastFeatureRow, IResidualQuantile } from './load-forecast.interfaces';
import { LoadForecastHelper } from './load-forecast.helper';
import { RidgeHelper } from './ridge.helper';

const buildRow = (overrides: Partial<IForecastFeatureRow>): IForecastFeatureRow => ({
  utcHourEnding: '2026-07-15T06',
  localDate: '2026-07-15',
  localHour: 0,
  month: '2026-07',
  dayOfMonth: 15,
  season: 'summer',
  features: [1],
  demandMw: 1000,
  dayAheadForecastMw: 1000,
  forecastExcluded: false,
  lag168Mw: 1000,
  ...overrides,
});

describe('forecast helpers', () => {
  it('recovers known coefficients from noise-free synthetic data', () => {
    const rows: number[][] = [];
    const targets: number[] = [];

    for (let x1 = 0; x1 < 10; x1++) {
      for (let x2 = 0; x2 < 10; x2++) {
        rows.push([x1, x2]);
        targets.push(3 + 2 * x1 - 1 * x2);
      }
    }

    const gram = RidgeHelper.gram(rows, targets);
    const beta = RidgeHelper.solve(gram, 1e-9);

    expect(beta[0]).toBeCloseTo(3, 4);
    expect(beta[1]).toBeCloseTo(2, 4);
    expect(beta[2]).toBeCloseTo(-1, 4);
    expect(RidgeHelper.predict(beta, [5, 5])).toBeCloseTo(3 + 2 * 5 - 5, 4);
  });

  it('keeps p10 <= p50 <= p90 for every target hour, including skewed residuals', () => {
    const historicalRows: IForecastFeatureRow[] = Array.from({ length: 6 }, (_unused, index) =>
      buildRow({
        utcHourEnding: `2026-07-${10 + index}T06`,
        localDate: `2026-07-${10 + index}`,
        dayOfMonth: 10 + index,
        features: [index],
        demandMw: 1000 + index * 10,
      }),
    );
    const targetRow = buildRow({
      utcHourEnding: '2026-07-20T06',
      localDate: '2026-07-20',
      dayOfMonth: 20,
      localHour: 6,
      features: [3],
      demandMw: null,
    });
    const rows = [...historicalRows, targetRow];
    const standardized = rows.map((row) => row.features);
    const quantiles = new Map<string, IResidualQuantile>([
      ['6-summer', { q10: 25, q90: -25 }],
      ['0-summer', { q10: -5, q90: 5 }],
    ]);

    const targetHours = LoadForecastHelper.targetDayForecast(rows, standardized, '2026-07-20', 1, quantiles);

    expect(targetHours.length).toBe(1);

    for (const hour of targetHours) {
      expect(hour.p10Mw).toBeLessThanOrEqual(hour.p50Mw);
      expect(hour.p50Mw).toBeLessThanOrEqual(hour.p90Mw);
    }
  });

  it('scores mape, bias and peak under-forecast on a hand-checked tiny series', () => {
    const scored = Array.from({ length: 23 }, (_unused, hour) => {
      const demandMw = hour === 17 ? 1200 : 1000;
      const forecastMw = hour === 17 ? 1080 : 1100;

      return { localDate: '2026-07-15', demandMw, forecastMw };
    });

    const score = ForecastScoreHelper.scorePoints(scored, [{ id: 'test', label: 'test', kind: 'simulated', url: '' }]);

    expect(score.hoursScored).toBe(23);
    expect(score.daysScored).toBe(1);
    expect(score.mapePercent).toBeCloseTo(10, 8);
    expect(score.biasPercent).toBeCloseTo(((22 * 0.1 - 0.1) / 23) * 100, 8);
    expect(score.peakUnderForecastRate).toBe(100);
    expect(score.meanPeakMissMw).toBeCloseTo(120, 8);
    expect(score.startDate).toBe('2026-07-15');
    expect(score.endDate).toBe('2026-07-15');
  });
});
