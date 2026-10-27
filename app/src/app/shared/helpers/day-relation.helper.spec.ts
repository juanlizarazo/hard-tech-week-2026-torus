import { DayRelationHelper } from './day-relation.helper';

describe('DayRelationHelper', () => {
  const tuesdayEveningDenver = new Date('2026-10-28T01:30:00Z');
  const tuesdayMorningDenver = new Date('2026-10-27T15:00:00Z');

  it('reads the calendar day in America/Denver, not UTC', () => {
    expect(DayRelationHelper.localDate(tuesdayEveningDenver)).toBe('2026-10-27');
    expect(DayRelationHelper.localMinutes(tuesdayEveningDenver)).toBe(19 * 60 + 30);
  });

  it('calls the next day tomorrow, the same day today and earlier days by date', () => {
    expect(DayRelationHelper.label('2026-10-28', tuesdayMorningDenver)).toBe('tomorrow, Wed Oct 28');
    expect(DayRelationHelper.label('2026-10-27', tuesdayMorningDenver)).toBe('today, Tue Oct 27');
    expect(DayRelationHelper.label('2026-10-26', tuesdayMorningDenver)).toBe('Mon Oct 26');
  });

  it('builds the words a screen uses for the planning day', () => {
    expect(DayRelationHelper.planningDay('2026-10-27', tuesdayEveningDenver)).toEqual({
      targetDate: '2026-10-27',
      relation: 'today',
      label: 'today, Tue Oct 27',
      word: 'today',
      name: 'Today',
      possessive: "Today's"
    });
    expect(DayRelationHelper.planningDay('2026-10-26', tuesdayEveningDenver).word).toBe('on Mon Oct 26');
  });

  it('rewrites copy written for tomorrow', () => {
    const today = DayRelationHelper.planningDay('2026-10-27', tuesdayEveningDenver);

    expect(DayRelationHelper.phrase("See tomorrow's grid: when is it jammed tomorrow?", today)).toBe("See today's grid: when is it jammed today?");
  });
});
