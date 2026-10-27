import { IPlanningDay } from './day-relation.interfaces';
import { DayRelation } from './day-relation.types';

export class DayRelationHelper {
  private static readonly _timezone = 'America/Denver';

  private static readonly _localDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DayRelationHelper._timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  private static readonly _localHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DayRelationHelper._timezone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  public static localDate(now: Date): string {
    return DayRelationHelper._localDateFormatter.format(now);
  }

  public static localMinutes(now: Date): number {
    const [hour, minute] = DayRelationHelper._localHourFormatter.format(now).split(':').map(Number);

    return hour * 60 + minute;
  }

  public static relation(targetDate: string, now: Date): DayRelation {
    const today = DayRelationHelper.localDate(now);

    if (targetDate > today) {
      return 'tomorrow';
    }

    return targetDate === today ? 'today' : 'past';
  }

  public static dayLabel(localDate: string): string {
    const [year, month, day] = localDate.split('-').map(Number);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).formatToParts(
      new Date(Date.UTC(year, month - 1, day))
    );
    const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((entry) => entry.type === type)?.value ?? '';

    return `${part('weekday')} ${part('month')} ${part('day')}`;
  }

  public static label(targetDate: string, now: Date): string {
    const relation = DayRelationHelper.relation(targetDate, now);
    const dayLabel = DayRelationHelper.dayLabel(targetDate);

    return relation === 'past' ? dayLabel : `${relation}, ${dayLabel}`;
  }

  public static planningDay(targetDate: string | null, now: Date): IPlanningDay {
    if (!targetDate) {
      return DayRelationHelper.unknownDay();
    }

    const relation = DayRelationHelper.relation(targetDate, now);
    const dayLabel = DayRelationHelper.dayLabel(targetDate);
    const possessives: Record<DayRelation, string> = { tomorrow: "Tomorrow's", today: "Today's", past: 'Latest' };

    return {
      targetDate,
      relation,
      label: DayRelationHelper.label(targetDate, now),
      word: relation === 'past' ? `on ${dayLabel}` : relation,
      name: relation === 'past' ? dayLabel : relation === 'today' ? 'Today' : 'Tomorrow',
      possessive: possessives[relation]
    };
  }

  public static phrase(text: string, day: IPlanningDay): string {
    const lowerPossessive = day.relation === 'past' ? 'the latest' : day.possessive.toLowerCase();

    return text.replaceAll("Tomorrow's", day.possessive).replaceAll("tomorrow's", lowerPossessive).replaceAll('tomorrow', day.word);
  }

  public static unknownDay(): IPlanningDay {
    return { targetDate: null, relation: 'tomorrow', label: 'tomorrow', word: 'tomorrow', name: 'Tomorrow', possessive: "Tomorrow's" };
  }
}
