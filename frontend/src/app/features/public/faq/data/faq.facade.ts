import { Injectable, signal } from '@angular/core';
import {
  FaqHeroContent,
  FaqItem,
  FaqTab,
} from '@/features/public/faq/models/faq.models';

/**
 * Facade del feature FAQ. Centraliza el contenido estático para desacoplar la
 * UI de una futura integración con CMS o backend.
 */
@Injectable({ providedIn: 'root' })
export class FaqFacade {
  private readonly _hero = signal<FaqHeroContent>({
    eyebrow: 'FAQ',
    title: 'Preguntas frecuentes',
    description:
      'Resuelve dudas comunes sobre vacantes, postulaciones, pagos y el uso de tu cuenta dentro de Impulso Jobs.',
  });

  private readonly _tabs = signal<readonly FaqTab[]>([
    {
      id: 'general',
      label: 'General',
      description: 'Información básica sobre el uso de la plataforma.',
    },
    {
      id: 'empleos',
      label: 'Empleos',
      description: 'Preguntas sobre publicación, visibilidad y postulaciones.',
    },
    {
      id: 'pagos',
      label: 'Pagos',
      description: 'Planes, facturación y cupones promocionales.',
    },
    {
      id: 'cuenta',
      label: 'Cuenta',
      description: 'Acceso, seguridad y configuración del perfil.',
    },
  ]);

  private readonly _items = signal<readonly FaqItem[]>([
    {
      id: 'general-como-funciona',
      categoryId: 'general',
      question: '¿Cómo funciona Impulso Jobs para candidatos y empresas?',
      answer:
        'Los candidatos crean su perfil, cargan su hoja de vida y postulan a vacantes desde un solo panel. Las empresas publican ofertas, administran candidatos y hacen seguimiento del proceso de selección desde su dashboard.',
    },
    {
      id: 'general-ciudades',
      categoryId: 'general',
      question: '¿Puedo usar la plataforma desde cualquier ciudad?',
      answer:
        'Sí. Impulso Jobs funciona en todo Colombia y admite vacantes presenciales, híbridas y remotas. Puedes filtrar por ubicación, modalidad y categoría para encontrar oportunidades más relevantes.',
    },
    {
      id: 'general-soporte',
      categoryId: 'general',
      question: '¿Dónde encuentro ayuda si tengo una duda puntual?',
      answer:
        'Puedes escribirnos desde la página de contacto o comunicarte con el equipo de soporte. También iremos ampliando esta sección de preguntas frecuentes a medida que publiquemos nuevas funcionalidades.',
    },
    {
      id: 'empleos-publicacion',
      categoryId: 'empleos',
      question: '¿Dónde se muestra mi vacante una vez publicada?',
      answer:
        'La vacante aparece en el listado público de empleos, en búsquedas por categoría y ubicación, y en recomendaciones dentro de la plataforma. Si tu plan incluye promoción, también recibe mayor visibilidad en zonas destacadas.',
    },
    {
      id: 'empleos-tiempo',
      categoryId: 'empleos',
      question: '¿Cuánto tarda en publicarse una oferta laboral?',
      answer:
        'En la mayoría de los casos la publicación queda disponible inmediatamente después de completar el formulario. Si requiere validación adicional por contenido o datos de empresa, el equipo la revisa en el menor tiempo posible.',
    },
    {
      id: 'empleos-postulaciones',
      categoryId: 'empleos',
      question: '¿Cuándo empezaré a recibir postulaciones?',
      answer:
        'Las postulaciones comienzan a llegar tan pronto la vacante está visible para los candidatos. El volumen depende del perfil buscado, la descripción del cargo, el salario y la modalidad de trabajo.',
    },
    {
      id: 'pagos-cupon',
      categoryId: 'pagos',
      question: '¿Cómo canjeo un cupón o código promocional?',
      answer:
        'Durante el proceso de compra o activación del plan encontrarás un campo para ingresar el código. Si el cupón es válido y está vigente, el descuento se aplica automáticamente antes de confirmar el pago.',
    },
    {
      id: 'pagos-facturacion',
      categoryId: 'pagos',
      question: '¿Recibo factura o comprobante por mi pago?',
      answer:
        'Sí. Cada compra genera un comprobante y, cuando aplique, la factura correspondiente con los datos de facturación registrados por la empresa. Recomendamos mantener esta información actualizada en tu perfil.',
    },
    {
      id: 'pagos-cancelacion',
      categoryId: 'pagos',
      question: '¿Cuál es la política de cancelación o cambios de plan?',
      answer:
        'Puedes solicitar cambios de plan o resolver novedades de facturación contactando a soporte. Cada caso se revisa según el estado del servicio, beneficios consumidos y condiciones comerciales vigentes.',
    },
    {
      id: 'cuenta-password',
      categoryId: 'cuenta',
      question: '¿Cómo restablezco mi contraseña?',
      answer:
        'Desde el acceso a tu cuenta puedes usar la opción de recuperación de contraseña. Recibirás un enlace temporal en tu correo para crear una nueva clave de forma segura.',
    },
    {
      id: 'cuenta-seguridad',
      categoryId: 'cuenta',
      question: '¿Mi información personal y empresarial está protegida?',
      answer:
        'Sí. Aplicamos medidas de seguridad para proteger accesos, datos sensibles y actividad dentro de la plataforma. Además, cada usuario solo puede gestionar la información permitida según su rol.',
    },
    {
      id: 'cuenta-perfil',
      categoryId: 'cuenta',
      question: '¿Puedo actualizar mi perfil o datos de empresa después del registro?',
      answer:
        'Sí. Tanto candidatos como empresas pueden editar su información, datos de contacto y preferencias desde su panel. Mantener el perfil al día mejora la calidad de las postulaciones y la visibilidad.',
    },
  ]);

  readonly hero = this._hero.asReadonly();
  readonly tabs = this._tabs.asReadonly();
  readonly items = this._items.asReadonly();
}
