import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { authInterceptor, errorInterceptor } from './core/interceptors/interceptors';

import { routes } from './app.routes';
import { AppInitService } from './app-init.service';

export function initializeApp(appInitService: AppInitService) {
  return () => appInitService.initializeApp();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    AppInitService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitService],
      multi: true
    }
  ]
};