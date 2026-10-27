export class TimeLabelHelper {
  public static hour(hour: number): string {
    const normalized = ((hour % 24) + 24) % 24;
    const twelveHour = normalized % 12 === 0 ? 12 : normalized % 12;

    return `${twelveHour} ${TimeLabelHelper.meridiem(normalized)}`;
  }

  public static window(startHour: number, endHour: number): string {
    const start = ((startHour % 24) + 24) % 24;
    const end = ((endHour % 24) + 24) % 24;

    if (TimeLabelHelper.meridiem(start) === TimeLabelHelper.meridiem(end) && end > start) {
      const startTwelve = start % 12 === 0 ? 12 : start % 12;

      return `${startTwelve}–${TimeLabelHelper.hour(end)}`;
    }

    return `${TimeLabelHelper.hour(start)}–${TimeLabelHelper.hour(end)}`;
  }

  private static meridiem(hour: number): string {
    return hour < 12 ? 'a.m.' : 'p.m.';
  }
}
