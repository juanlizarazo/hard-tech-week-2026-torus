import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dt-lp-text',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './lp-text.component.html',
  styleUrl: './lp-text.component.scss'
})
export class LpTextComponent implements OnChanges, OnDestroy {
  private readonly _changeDetector = inject(ChangeDetectorRef);

  @Input({ required: true }) public lpText = '';
  @Input() public solveMs: number | null = null;
  @Input() public date = '';

  public lineCount = 0;
  public constraintCount = 0;
  public variableCount = 0;
  public isCopied = false;
  public copyFailed = false;

  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;

  public get metaLabel(): string {
    const parts = [`${this.lineCount.toLocaleString('en-US')} lines`];

    if (this.variableCount) {
      parts.push(`${this.variableCount.toLocaleString('en-US')} variables`);
    }

    if (this.constraintCount) {
      parts.push(`${this.constraintCount.toLocaleString('en-US')} constraints`);
    }

    if (this.solveMs !== null && this.solveMs !== undefined) {
      parts.push(`solved in ${Math.round(this.solveMs)} ms`);
    }

    return `${parts.join(', ')}.`;
  }

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
    this._changeDetector.detectChanges();
    this._copiedTimer = setTimeout(() => {
      this.isCopied = false;
      this.copyFailed = false;
      this._copiedTimer = null;
      this._changeDetector.detectChanges();
    }, 2000);
  }

  public onDownload(): void {
    const blob = new Blob([this.lpText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `detour-plan-${this.date || 'day'}.lp`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
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
