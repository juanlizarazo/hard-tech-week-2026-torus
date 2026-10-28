export const indexStages: Record<string, { name: string; verb: string }> = {
  F: { name: 'Forecast', verb: "forecast tomorrow's grid" },
  D: { name: 'Decide', verb: 'decide the plan' },
  P: { name: 'Prove', verb: 'prove it on past months' }
};

export const indexKey = 'F = forecast tomorrow\'s grid, D = decide the plan, P = prove it on past months.';
