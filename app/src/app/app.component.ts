import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable } from 'rxjs';
import { LoadingService } from '@app/core';
import { SnapshotBadgeComponent } from '@app/shared/components';
import { INavLink } from './app.interfaces';
import { navLinks } from './app.constants';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatTabsModule,
    MatProgressBarModule,
    SnapshotBadgeComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly _loadingService = inject(LoadingService);

  public readonly isLoading$: Observable<boolean> = this._loadingService.isLoading$;
  public readonly links: INavLink[] = navLinks;
}
