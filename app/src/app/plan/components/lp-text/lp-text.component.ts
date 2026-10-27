import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dt-lp-text',
  imports: [DecimalPipe, MatButtonModule, MatExpansionModule, MatIconModule],
  templateUrl: './lp-text.component.html',
  styleUrl: './lp-text.component.scss'
})
export class LpTextComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) public lpText = '';
  @Input() public solveMs: number | null = null;

  public lineCount = 0;
  public constraintCount = 0;
  public variableCount = 0;
  public isCopied = false;
  public copyFailed = false;

  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;

  public ngOnChanges(): void {
    this._computeCounts(this.lpText ?? '');
  }

  public ngOnDestroy(): void {
    this._clearTimer();
  }

  public async onCopy(event: MouseEvent): Promise<void> {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(this.lpText);
      this.isCopied = true;
      this.copyFailed = false;
    } catch {
      this.isCopied = false;
      this.copyFailed = true;
    }

    this._clearTimer();
    this._copiedTimer = setTimeout(() => {
      this.isCopied = false;
      this.copyFailed = false;
      this._copiedTimer = null;
    }, 2000);
  }

  private _computeCounts(text: string): void {
    const lines = text.length ? text.split('\n') : [];
    const rowPattern = /^\s*\w+:/;
    const commentPattern = /^\s*\\/;
    let section = '';
    let constraints = 0;
    let variables = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      if (lower === 'subject to' || lower === 'st' || lower === 's.t.') {
        section = 'constraints';
        continue;
      }

      if (lower === 'bounds' || lower === 'end' || lower === 'generals' || lower === 'binaries') {
        section = lower;
        continue;
      }

      if (!trimmed.length || commentPattern.test(line)) {
        continue;
      }

      if (section === 'constraints' && rowPattern.test(line)) {
        constraints++;
      }

      if (section === 'bounds') {
        variables++;
      }
    }

    this.lineCount = lines.length;
    this.constraintCount = constraints;
    this.variableCount = variables;
  }

  private _clearTimer(): void {
    if (this._copiedTimer) {
      clearTimeout(this._copiedTimer);
      this._copiedTimer = null;
    }
  }
}
