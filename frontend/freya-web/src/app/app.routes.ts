import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { AccueilComponent } from './features/accueil/accueil.component';
import { PlanningComponent } from './features/planning/planning.component';
import { RepasComponent } from './features/repas/repas.component';
import { VoyagesComponent } from './features/voyages/voyages.component';
import { SimplePageComponent } from './features/placeholders/simple-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: AccueilComponent },
      { path: 'planning', component: PlanningComponent },
      { path: 'repas', component: RepasComponent },
      { path: 'voyages', component: VoyagesComponent },
      {
        path: 'sport',
        component: SimplePageComponent,
        data: { title: 'Sport', subtitle: 'Séances de la semaine à venir.' }
      },
      {
        path: 'chat',
        component: SimplePageComponent,
        data: { title: 'Chat', subtitle: 'Les échanges apparaîtront ici.' }
      },
      {
        path: 'parametres',
        component: SimplePageComponent,
        data: { title: 'Paramètres', subtitle: 'Compte, notifications et apparence.' }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
