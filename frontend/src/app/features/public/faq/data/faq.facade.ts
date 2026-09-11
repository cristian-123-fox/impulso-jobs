import { Injectable, signal } from '@angular/core';
import { FaqItem, FaqTab } from '@/features/public/faq/models/faq.models';

/**
 * Facade del feature FAQ. Mantiene el **índice** de categorías y preguntas
 * —ids y a qué categoría pertenece cada una— para desacoplar la UI de una
 * futura integración con CMS o backend.
 *
 * El texto de cada pregunta vive en el diccionario, bajo la misma clave que el
 * id (T26); aquí sólo está el orden, que es contenido editorial: las preguntas
 * más frecuentes van primero.
 */
@Injectable({ providedIn: 'root' })
export class FaqFacade {
  private readonly _tabs = signal<readonly FaqTab[]>([
    { id: 'general' },
    { id: 'empleos' },
    { id: 'pagos' },
    { id: 'cuenta' },
  ]);

  private readonly _items = signal<readonly FaqItem[]>([
    { id: 'general-como-funciona', categoryId: 'general' },
    { id: 'general-ciudades', categoryId: 'general' },
    { id: 'general-soporte', categoryId: 'general' },
    { id: 'empleos-publicacion', categoryId: 'empleos' },
    { id: 'empleos-tiempo', categoryId: 'empleos' },
    { id: 'empleos-postulaciones', categoryId: 'empleos' },
    { id: 'pagos-cupon', categoryId: 'pagos' },
    { id: 'pagos-facturacion', categoryId: 'pagos' },
    { id: 'pagos-cancelacion', categoryId: 'pagos' },
    { id: 'cuenta-password', categoryId: 'cuenta' },
    { id: 'cuenta-seguridad', categoryId: 'cuenta' },
    { id: 'cuenta-perfil', categoryId: 'cuenta' },
  ]);

  readonly tabs = this._tabs.asReadonly();
  readonly items = this._items.asReadonly();
}
