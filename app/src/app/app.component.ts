import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, asapScheduler, filter, map, observeOn, startWith } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService, PlanningDayService } from '@app/core';
import { SidePanelComponent, SimulatedBadgeComponent, SnapshotBadgeComponent } from '@app/shared/components';
import { navLinks } from './app.constants';
import { INavLink } from './app.interfaces';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatProgressBarModule,
    SidePanelComponent,
    SimulatedBadgeComponent,
    SnapshotBadgeComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly _loadingService = inject(LoadingService);
  private readonly _planningDayService = inject(PlanningDayService);
  private readonly _router = inject(Router);

  public readonly isLoading$ = this._loadingService.isLoading$.pipe(observeOn(asapScheduler));
  public readonly isHome$: Observable<boolean> = this._router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null),
    map(() => this._router.url.split(/[?#]/)[0] === '/start')
  );
  public readonly links$: Observable<INavLink[]> = this._planningDayService.day$.pipe(
    map((day) => navLinks.map((link) => (link.dayNoun ? { ...link, description: `${day.possessive} ${link.dayNoun}` } : link)))
  );
}
