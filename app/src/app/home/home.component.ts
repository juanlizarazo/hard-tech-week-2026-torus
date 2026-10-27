import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Observable, map } from 'rxjs';
import { AuthService } from '@app/core';
import { firebaseConfig } from '../app.config';

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, MatCardModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly _authService = inject(AuthService);

  public readonly projectId = firebaseConfig.projectId;
  public readonly isConnected$: Observable<boolean> = this._authService.user$.pipe(
    map((user) => !!user)
  );
}
