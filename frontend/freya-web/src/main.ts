import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { initThemeFromSettings } from './app/core/app-settings';
import { environment } from './environments/environment';

initThemeFromSettings();

void loadApiBase().then(() =>
  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err))
);

async function loadApiBase(): Promise<void> {
  try {
    const config = (await fetch(new URL('config.json', document.baseURI)).then((r) => r.json())) as {
      apiBase?: string;
    };
    const base = (config.apiBase ?? '').replace(/\/$/, '');
    if (base) {
      environment.apiUrl = `${base}/api/v1`;
    }
  } catch {
    /* garde l’url de l’environnement (dev / proxy docker) */
  }
}
