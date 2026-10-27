import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _loading = new BehaviorSubject<boolean>(false);
  private _pendingCount = 0;

  public readonly isLoading$: Observable<boolean> = this._loading.asObservable();

  public show(): void {
    this._pendingCount++;
    this._loading.next(true);
  }

  public hide(): void {
    this._pendingCount = Math.max(0, this._pendingCount - 1);
    this._loading.next(this._pendingCount > 0);
  }
}
