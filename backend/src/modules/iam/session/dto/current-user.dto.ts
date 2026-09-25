import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@/common/types/role.enum';

/**
 * Identidad de la sesión activa (T27). Amplía lo que devuelve el login con el
 * nombre y la imagen del titular, resueltos **según el rol**, para que el
 * cliente no tenga que adivinar a qué perfil pegar en cada área.
 */
export class CurrentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  /**
   * Nombre para mostrar: candidato → nombre + apellido; empresa → nombre
   * comercial. `users` no guarda nombre, así que un ADMIN —y cualquier perfil
   * aún sin completar— cae al correo, que siempre existe.
   */
  @ApiProperty()
  displayName!: string;

  /** Foto del candidato o logo de la empresa. URL absoluta (T23). */
  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  /**
   * Permisos efectivos de la sesión (unión de sus roles + la base del
   * ámbito). El frontend los usa **sólo para decidir qué mostrar** —el menú de
   * un miembro de empresa con un rol restringido—; quien autoriza sigue siendo
   * el `PermissionsGuard` en cada petición.
   */
  @ApiProperty({ type: [String] })
  permissions!: string[];
}
