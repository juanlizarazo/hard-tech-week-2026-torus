import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { asapScheduler, observeOn } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from '@app/core';
import { SidePanelComponent, SimulatedBadgeComponent, SnapshotBadgeComponent } from '@app/shared/components';
import { navLinks } from './app.constants';

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

  public readonly isLoading$ = this._loadingService.isLoading$.pipe(observeOn(asapScheduler));
  public readonly links = navLinks;
}
