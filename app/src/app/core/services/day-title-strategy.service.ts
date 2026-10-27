import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { PlanningDayService } from './planning-day.service';

@Injectable({ providedIn: 'root' })
export class DayTitleStrategyService extends TitleStrategy {
  private readonly _title = inject(Title);
  private readonly _planningDayService = inject(PlanningDayService);
  private readonly _routeTitle$ = new BehaviorSubject<string>('DETOUR');

  constructor() {
    super();
    combineLatest([this._routeTitle$, this._planningDayService.day$]).subscribe(([routeTitle, day]) =>
      this._title.setTitle(routeTitle.replace("Tomorrow's", day.possessive))
    );
  }

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);

    if (routeTitle) {
      this._routeTitle$.next(routeTitle);
    }
  }
}
