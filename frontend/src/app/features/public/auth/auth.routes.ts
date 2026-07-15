import { Routes } from '@angular/router';
import { LoginPage } from '@/features/public/auth/pages/login-page/login-page';
import { ForgotPasswordPage } from '@/features/public/auth/pages/forgot-password-page/forgot-password-page';
import { ResetPasswordPage } from '@/features/public/auth/pages/reset-password-page/reset-password-page';
import { VerifyEmailPage } from '@/features/public/auth/pages/verify-email-page/verify-email-page';
import { RegisterCandidatePage } from '@/features/public/auth/pages/register-candidate-page/register-candidate-page';
import { RegisterCompanyPage } from '@/features/public/auth/pages/register-company-page/register-company-page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'registro', component: RegisterCandidatePage },
  { path: 'registro/empresa', component: RegisterCompanyPage },
  { path: 'recuperar-password', component: ForgotPasswordPage },
  { path: 'restablecer-password', component: ResetPasswordPage },
  { path: 'verificar-email', component: VerifyEmailPage },
];
