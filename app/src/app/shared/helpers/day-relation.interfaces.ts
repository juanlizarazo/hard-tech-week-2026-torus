import { DayRelation } from './day-relation.types';

export interface IPlanningDay {
  targetDate: string | null;
  relation: DayRelation;
  label: string;
  word: string;
  name: string;
  possessive: string;
}
