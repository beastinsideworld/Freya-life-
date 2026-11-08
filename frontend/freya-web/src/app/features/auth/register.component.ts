import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './login.component.scss'
})
export class RegisterComponent {
  email = '';
  password = '';
  displayName = '';
  readonly error = signal('');
  readonly loading = signal(false);

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  submit(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.register(this.email, this.password, this.displayName).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Inscription impossible.');
      }
    });
  }
}
