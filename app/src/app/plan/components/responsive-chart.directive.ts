import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { chartLayout } from './chart.constants';

@Directive()
export abstract class ResponsiveChartDirective implements AfterViewInit, OnDestroy {
  private readonly _host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  private _observer: ResizeObserver | null = null;

  public viewWidth = chartLayout.DEFAULT_WIDTH;

  public get isNarrow(): boolean {
    return this.viewWidth < chartLayout.MOBILE_WIDTH;
  }

  public ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this._observer = new ResizeObserver((entries: ResizeObserverEntry[]) => this._onResize(entries));
    this._observer.observe(this._host.nativeElement);
  }

  public ngOnDestroy(): void {
    this._observer?.disconnect();
    this._observer = null;
  }

  protected abstract render(): void;

  private _onResize(entries: ResizeObserverEntry[]): void {
    const entry = entries[0];

    if (!entry) {
      return;
    }

    const width = Math.max(chartLayout.MIN_WIDTH, Math.round(entry.contentRect.width));

    if (Math.abs(width - this.viewWidth) < 4) {
      return;
    }

    this.viewWidth = width;
    this.render();
    this._changeDetector.detectChanges();
  }
}
