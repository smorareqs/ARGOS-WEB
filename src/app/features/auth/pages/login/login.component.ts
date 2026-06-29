import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { LoginTemplateComponent } from '../../templates/login-template/login-template.component';

/**
 * Screen · Inicio de sesión. Conecta el template con la tienda del dominio
 * (AuthStore) y, al autenticarse, navega al dashboard (/inicio) demostrando
 * la carga diferida entre features.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginTemplateComponent],
  providers: [AuthStore],
  template: `
    <app-login-template
      [(email)]="email"
      [(password)]="password"
      [loading]="store.loading()"
      [error]="store.error()"
      (submitted)="onSubmit()"
    />
  `,
})
export class LoginComponent {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly email = signal('admin@costalimpia.com');
  protected readonly password = signal('');

  protected async onSubmit(): Promise<void> {
    const ok = await this.store.signIn({
      email: this.email(),
      password: this.password(),
    });
    if (ok) {
      await this.router.navigate(['/inicio']);
    }
  }
}
