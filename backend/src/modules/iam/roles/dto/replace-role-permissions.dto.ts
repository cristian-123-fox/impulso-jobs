import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, IsUUID } from 'class-validator';

/**
 * Conjunto completo de permisos del rol, no un delta: el árbol envía lo que
 * queda marcado y el backend calcula altas y bajas. Así dos administradores
 * editando a la vez no acumulan cambios contradictorios en silencio.
 */
export class ReplaceRolePermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de permisos que quedan asignados al rol.',
  })
  @IsArray()
  // Tope defensivo: el catálogo ronda los 50 permisos.
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsUUID('4', { each: true, message: 'Identificador de permiso inválido.' })
  permissionIds!: string[];
}
