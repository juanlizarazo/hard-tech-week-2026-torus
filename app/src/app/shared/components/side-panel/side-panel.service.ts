import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IGlossaryEntry } from '../../glossary/glossary.interfaces';
import { ISidePanelContent } from './side-panel.interfaces';

@Injectable({ providedIn: 'root' })
export class SidePanelService {
  private readonly _content = new BehaviorSubject<ISidePanelContent | null>(null);
  private _returnFocusTo: HTMLElement | null = null;

  public readonly content$: Observable<ISidePanelContent | null> = this._content.asObservable();

  public openTemplate(title: string, template: TemplateRef<unknown>): void {
    this._open({ title, template, entry: null });
  }

  public openEntry(entry: IGlossaryEntry): void {
    this._open({ title: entry.term, template: null, entry });
  }

  public close(): void {
    this._content.next(null);
    const target = this._returnFocusTo;
    this._returnFocusTo = null;
    setTimeout(() => target?.focus(), 0);
  }

  private _open(content: ISidePanelContent): void {
    if (!this._content.value) {
      this._returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }

    this._content.next(content);
  }
}
