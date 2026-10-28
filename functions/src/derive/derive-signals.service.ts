import { LoadForecastHelper } from '../../../app/src/app/core/forecast/load-forecast.helper';
import { IDerivedSignals } from '../../../app/src/app/core/models/derived.interfaces';
import { EmissionsHelper } from '../../../app/src/app/core/signals/emissions.helper';
import { ForecastScoreHelper } from '../../../app/src/app/core/signals/forecast-score.helper';

export class DeriveSignalsService {
  public static build(
    manifest: Detour.Firestore.Snapshot.IManifest,
    gridMonths: Detour.Firestore.Snapshot.IGridMonth[],
    weatherMonths: Detour.Firestore.Snapshot.IWeatherMonth[],
  ): IDerivedSignals {
    const gridHours = gridMonths
      .flatMap((month) => month.hours)
      .sort((first, second) => first.utcHourEnding.localeCompare(second.utcHourEnding));
    const rows = EmissionsHelper.buildRows(gridHours);
    const weatherHours = weatherMonths.flatMap((month) => month.hours);
    const loadForecast =
      weatherMonths.length === 0
        ? null
        : LoadForecastHelper.build(
            gridHours,
            weatherHours,
            manifest.targetDate,
            manifest.weatherPulledAt ? manifest.weatherPulledAt.toDate().toISOString() : '',
          );

    const derived: IDerivedSignals = {
      version: 1,
      derivedAt: new Date().toISOString(),
      marginalEmissions: [EmissionsHelper.marginalSeries(rows, 'fossil-generation'), EmissionsHelper.marginalSeries(rows, 'demand')],
      averageEmissions: EmissionsHelper.averageIntensity(rows),
      forecastScore: ForecastScoreHelper.score(gridHours),
      loadForecast,
    };

    return JSON.parse(JSON.stringify(derived)) as IDerivedSignals;
  }
}
