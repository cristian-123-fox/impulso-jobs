/** Credenciales que el formulario de acceso emite hacia el contenedor. */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

/** Estados del flujo de autenticación reflejados en la UI del formulario. */
export type LoginStatus = 'idle' | 'loading' | 'success' | 'error';
