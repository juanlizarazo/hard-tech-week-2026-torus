import { Injectable, inject } from '@angular/core';
import { Auth, User, authState, signInAnonymously } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _auth = inject(Auth);

  public readonly user$: Observable<User | null> = authState(this._auth);

  public async initializeAnonymousAuth(): Promise<void> {
    try {
      await this._auth.authStateReady();

      if (!this._auth.currentUser) {
        await signInAnonymously(this._auth);
      }
    } catch (error) {
      console.error('Anonymous sign-in failed', error);
    }
  }
}
