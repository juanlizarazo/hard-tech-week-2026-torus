import { Component, Input, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, filter, from, map, of, switchMap } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'dt-print-footer',
  imports: [AsyncPipe],
  templateUrl: './print-footer.component.html',
  styleUrl: './print-footer.component.scss'
})
export class PrintFooterComponent {
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _shareUrl$ = new BehaviorSubject<string>('');

  @Input({ required: true })
  public set shareUrl(url: string) {
    this._shareUrl$.next(url);
  }

  public get shareUrl(): string {
    return this._shareUrl$.value;
  }

  public readonly qrSvg$: Observable<SafeHtml | null> = this._shareUrl$.pipe(
    distinctUntilChanged(),
    filter((url: string) => url.length > 0),
    switchMap((url: string) =>
      from(QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#17202b', light: '#ffffff' } })).pipe(
        map((svg: string) => this._sanitizer.bypassSecurityTrustHtml(svg)),
        catchError((error: unknown) => {
          console.error('Failed to draw the share QR code', error);

          return of(null);
        })
      )
    )
  );
}
