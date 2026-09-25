/** Mismo respaldo que `email-theme.ts`: el portal en local. */
const DEFAULT_WEB_URL = 'http://localhost:4200';

/** Página del panel de la empresa que sabe leer el resultado del Checkout. */
const RETURN_PATH = '/empresa/promociones';

/**
 * URLs a las que Stripe devuelve al usuario. Llevan el id de la orden para que
 * el panel pueda, al volver cancelado, liberar la reserva en el acto en vez de
 * esperar a que la sesión caduque.
 *
 * Volver por `success` **no** activa nada: sólo pinta "estamos confirmando tu
 * pago". Lo que activa es el webhook firmado.
 *
 * Se lee `APP_WEB_URL` en cada llamada, como hace el mailer.
 */
export function checkoutReturnUrls(orderId: string): {
  success: string;
  cancel: string;
} {
  const base = (process.env.APP_WEB_URL?.trim() || DEFAULT_WEB_URL).replace(
    /\/+$/,
    '',
  );
  const order = encodeURIComponent(orderId);
  return {
    success: `${base}${RETURN_PATH}?checkout=success&order=${order}`,
    cancel: `${base}${RETURN_PATH}?checkout=cancelled&order=${order}`,
  };
}
