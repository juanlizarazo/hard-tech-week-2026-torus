import type { Timestamp } from 'firebase-admin/firestore';

declare global {
  namespace Detour.Firestore.Snapshot {
    type ProvenanceKind =
      | 'eia-930'
      | 'caiso-oasis'
      | 'open-meteo'
      | 'rmp-tariff'
      | 'torus-spec'
      | 'assumption'
      | 'simulated';

    interface IProvenance {
      id: string;
      label: string;
      kind: ProvenanceKind;
      url: string;
      seriesId?: string;
      note?: string;
    }

    interface IPointer {
      currentSnapshotId: string;
      previousSnapshotId: string | null;
      updatedAt: Timestamp;
    }

    interface IMonthEntry {
      month: string;
      rowCount: number;
    }

    interface IManifest {
      id: string;
      pulledAt: Timestamp;
      timezone: string;
      targetDate: string;
      gridRange: { start: string; end: string };
      priceRange: { start: string; end: string };
      gridMonths: IMonthEntry[];
      priceMonths: IMonthEntry[];
      dayAheadForecastSource: 'eia-930' | 'caiso-oasis';
      filteredRows: number;
      sources: IProvenance[];
    }

    interface IGridHour {
      utcHourEnding: string;
      localHourStart: string;
      demandMw: number | null;
      dayAheadForecastMw: number | null;
      netGenerationMw: number | null;
      totalInterchangeMw: number | null;
      fuelMw: Record<string, number | null>;
      flags: string[];
    }

    interface IGridMonth {
      month: string;
      hours: IGridHour[];
    }

    interface IPriceHour {
      utcStart: string;
      localStart: string;
      lmp: number | null;
      energy: number | null;
      congestion: number | null;
      loss: number | null;
      ghg: number | null;
    }

    interface IPriceMonth {
      month: string;
      hours: IPriceHour[];
    }
  }
}

export {};
