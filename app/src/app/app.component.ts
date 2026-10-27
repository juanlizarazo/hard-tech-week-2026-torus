import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, asapScheduler, map, observeOn } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

  public readonly isLoading$ = this._loadingService.isLoading$.pipe(observeOn(asapScheduler));
  public readonly links$: Observable<INavLink[]> = this._planningDayService.day$.pipe(
    map((day) => navLinks.map((link) => (link.dayNoun ? { ...link, label: `${day.possessive} ${link.dayNoun}` } : link)))
  );
}
