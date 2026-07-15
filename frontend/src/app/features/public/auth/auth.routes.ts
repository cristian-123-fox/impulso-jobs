import { Routes } from '@angular/router';
import { LoginPage } from '@/features/public/auth/pages/login-page/login-page';
import { ForgotPasswordPage } from '@/features/public/auth/pages/forgot-password-page/forgot-password-page';
import { ResetPasswordPage } from '@/features/public/auth/pages/reset-password-page/reset-password-page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'recuperar-password', component: ForgotPasswordPage },
  { path: 'restablecer-password', component: ResetPasswordPage },
];
