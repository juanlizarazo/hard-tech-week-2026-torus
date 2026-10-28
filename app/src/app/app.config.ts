import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection
} from '@angular/core';
import { ActivatedRouteSnapshot, PreloadAllModules, TitleStrategy, provideRouter, withPreloading, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { routes } from './app.routes';
import { DayTitleStrategyService } from '@app/core';

export const firebaseConfig = {
  apiKey: 'AIzaSyBejiEce6IQP0uvWOEJrnGUt5j7Ajsdd-I',
  authDomain: 'hard-tech-week-2026-torus.firebaseapp.com',
  projectId: 'hard-tech-week-2026-torus',
  storageBucket: 'hard-tech-week-2026-torus.firebasestorage.app',
  messagingSenderId: '876439782204',
  appId: '1:876439782204:web:1a0de6f1fda44ef5df1439'
};

const isHomeRoute = (snapshot: ActivatedRouteSnapshot): boolean => (snapshot.firstChild ?? snapshot).routeConfig?.path === 'start';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules), withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (isHomeRoute(from) !== isHomeRoute(to)) {
            transition.skipTransition();
          }

          if (!to.fragment) {
            void transition.updateCallbackDone.then(() => window.scrollTo(0, 0));
          }
        }
      })),
    { provide: TitleStrategy, useExisting: DayTitleStrategyService },
    provideAnimationsAsync(),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => initializeFirestore(getApp(), { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })),
    provideAuth(() => getAuth()),
    provideFunctions(() => {
      const functions = getFunctions();

      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }

      return functions;
    })
  ]
};
