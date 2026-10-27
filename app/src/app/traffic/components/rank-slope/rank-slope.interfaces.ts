export interface IRankSlopeRow {
  hour: number;
  hourLabel: string;
  averageRank: number;
  marginalRank: number;
  averageLbPerMwh: number;
  marginalLbPerMwh: number;
}

export interface IRankSlopeLine {
  hour: number;
  hourLabel: string;
  averageRank: number;
  marginalRank: number;
  averageY: number;
  marginalY: number;
  averageLabelY: number;
  marginalLabelY: number;
  change: number;
  isHighlighted: boolean;
  description: string;
  changeText: string;
}
