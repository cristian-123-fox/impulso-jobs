import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  richTextLength,
  sanitizeRichText,
} from '@/common/utils/rich-text.util';

/**
 * Campo de texto enriquecido del editor (T32): **sanea y valida en un solo
 * decorador**.
 *
 * Se compone así a propósito. Sanear en el caso de uso obliga a acordarse en
 * cada sitio, y el día que alguien añada un cuarto campo largo se olvidará;
 * aquí el saneado viaja pegado a la declaración del campo. El `@Transform`
 * corre **antes** que los validadores (`plainToInstance` y luego `validate`),
 * así que lo que se valida y lo que se guarda es ya el HTML limpio.
 *
 * @param max  Tope de caracteres **de contenido**, sin contar etiquetas.
 * @param required `true` añade `@IsNotEmpty`; como el saneador devuelve `''`
 *   para un `<p>&nbsp;</p>`, un campo "lleno de nada" se rechaza igual que uno
 *   vacío de verdad.
 */
export function RichText(options: {
  max: number;
  required?: boolean;
  message?: string;
}): PropertyDecorator {
  const validators = options.required
    ? [IsNotEmpty({ message: options.message })]
    : [IsOptional()];

  return applyDecorators(
    IsString(),
    // `value` llega como `any` de class-transformer: se tipa a `unknown` para
    // que el saneado sólo corra sobre cadenas y el resto pase sin tocar (un
    // número o un null los rechazará después `@IsString`).
    Transform(({ value }: { value: unknown }): unknown =>
      typeof value === 'string' ? sanitizeRichText(value) : value,
    ),
    ...validators,
    MaxRichTextLength(options.max),
  );
}

/**
 * Tope de longitud sobre el **texto**, no sobre el HTML. Con `@MaxLength` a
 * secas, tres palabras en negrita podrían agotar el límite sólo con etiquetas.
 */
export function MaxRichTextLength(
  max: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    registerDecorator({
      name: 'maxRichTextLength',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'string') return false;
          return richTextLength(value) <= (args.constraints[0] as number);
        },
        defaultMessage(args: ValidationArguments): string {
          const limit = (args.constraints[0] as number).toLocaleString('es-MX');
          return `El texto no puede superar los ${limit} caracteres.`;
        },
      },
    });
  };
}
