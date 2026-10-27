import { glossary } from './glossary.constants';
import { IGlossaryEntry } from './glossary.interfaces';
import { GlossaryKey } from './glossary.types';

export class GlossaryHelper {
  public static entry(key: GlossaryKey): IGlossaryEntry {
    return glossary[key];
  }
}
