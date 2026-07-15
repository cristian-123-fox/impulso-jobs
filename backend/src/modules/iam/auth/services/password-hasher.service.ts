import { Injectable } from '@nestjs/common';
import { comparePassword, hashPassword } from '@/common/utils/password.util';

/** Servicio de dominio: hashing/verificación de contraseñas (bcrypt). */
@Injectable()
export class PasswordHasherService {
  hash(plain: string): Promise<string> {
    return hashPassword(plain);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return comparePassword(plain, hash);
  }
}
