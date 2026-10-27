import { TemplateRef } from '@angular/core';
import { IGlossaryEntry } from '../../glossary/glossary.interfaces';

export interface ISidePanelContent {
  title: string;
  template: TemplateRef<unknown> | null;
  entry: IGlossaryEntry | null;
}
