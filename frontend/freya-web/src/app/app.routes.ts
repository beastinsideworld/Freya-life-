import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { AccueilComponent } from './features/accueil/accueil.component';
import { PlanningComponent } from './features/planning/planning.component';
import { RepasComponent } from './features/repas/repas.component';
import { VoyagesComponent } from './features/voyages/voyages.component';
import { TeleComponent } from './features/tele/tele.component';
import { ParametresComponent } from './features/parametres/parametres.component';
import { ChatComponent } from './features/chat/chat.component';
import { BudgetComponent } from './features/budget/budget.component';
import { AnimauxComponent } from './features/animaux/animaux.component';
import { PetShareViewComponent } from './features/animaux/pet-share-view.component';
import { SportComponent } from './features/sport/sport.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'partage/animaux/:token', component: PetShareViewComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: AccueilComponent },
      { path: 'planning', component: PlanningComponent },
      { path: 'repas', component: RepasComponent },
      { path: 'voyages', component: VoyagesComponent },
      { path: 'tele', component: TeleComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'budget', component: BudgetComponent },
      { path: 'sport', component: SportComponent },
      { path: 'animaux', component: AnimauxComponent },
      { path: 'parametres', component: ParametresComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
