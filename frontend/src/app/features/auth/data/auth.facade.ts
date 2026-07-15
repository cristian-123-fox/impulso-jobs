import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LoginCredentials } from '@/features/auth/models/auth.models';

/**
 * Facade de autenticación. Por ahora simula la latencia y las respuestas del
 * backend para poder construir la experiencia de acceso; debe reemplazarse por
 * la llamada real al módulo `iam` (`POST /auth/login`) cuando esté disponible.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  login(credentials: LoginCredentials): Observable<void> {
    return timer(1300).pipe(
      switchMap(() =>
        // Simulación: la contraseña "wrongpass" representa credenciales inválidas.
        credentials.password.toLowerCase() === 'wrongpass'
          ? throwError(
              () =>
                new Error('Correo o contraseña incorrectos. Inténtalo de nuevo.'),
            )
          : of(undefined),
      ),
    );
  }
}
