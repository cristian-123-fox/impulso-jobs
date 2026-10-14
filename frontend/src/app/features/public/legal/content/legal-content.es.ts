import type {
  LegalContentKey,
  LegalDocumentContent,
} from './legal-content.models';

/**
 * Aviso de privacidad (modalidad integral y simplificada, arts. 15 y 16
 * LFPDPPP, DOF 20-03-2025).
 *
 * Cada sección cita el artículo que la obliga. El orden sigue el del artículo
 * 15, que es el que recorre una verificación, y las seis fracciones tienen
 * titular propio para que el respaldo se encuentre sin leer todo el documento.
 */
const privacy: LegalDocumentContent = {
  intro:
    'Este aviso explica qué datos personales recogemos, con qué finalidad, con ' +
    'quién los compartimos y cómo puedes ejercer tus derechos. Cuando los ' +
    'recabamos por medios electrónicos también te damos, antes de pedírtelos, ' +
    'la modalidad simplificada que manda el artículo 16, fracción II.',
  summary: [
    'Tratamos tus datos para prestarte el servicio: tu cuenta, tu perfil, tus ' +
      'postulaciones y, si eres empresa, tus vacantes.',
    'Tus datos más delicados —documento oficial, fecha de nacimiento, RFC— se ' +
      'tratan con consentimiento expreso, no tácito.',
    'Mostramos tu información a las empresas que contratan con nosotros solo ' +
      'cuando tu lo autorizas al hacer visible tu perfil.',
    'No vendemos tus datos, no los usamos para publicidad de terceros y no los ' +
      'salimos de México sin una base legal expresa.',
    'Puedes ejercer tus derechos ARCO y revocar tu consentimiento cuando ' +
      'quieras, sin dar explicaciones ni penalización.',
  ],
  sections: [
    {
      id: 'responsable',
      heading: '1. Identidad y domicilio del responsable (art. 15, fr. I)',
      paragraphs: [
        'Impulso Jobs es una plataforma digital que conecta a personas que ' +
          'buscan empleo con empresas que ofrecen vacantes. El responsable del ' +
          'tratamiento de tus datos personales es:',
      ],
      table: {
        head: ['Dato', 'Valor'],
        rows: [
          ['Nombre o razón social', '{{LEGAL_NAME}}'],
          ['Nombre comercial', 'Impulso Jobs'],
          ['RFC', '{{RFC}}'],
          ['Domicilio fiscal', '{{FISCAL_ADDRESS}}'],
          ['Domicilio de operación', '{{OPERATING_ADDRESS}}'],
          ['Correo para datos personales', '{{DPO_EMAIL}}'],
          ['Teléfono para aclaraciones', '{{CONSUMER_PHONE}}'],
          ['Correo para reclamaciones', '{{CONSUMER_EMAIL}}'],
        ],
      },
      callout:
        'Los valores entre llaves los sustituye el responsable antes de ' +
        'publicar. Si los ve así, el aviso está incompleto y no cumple el ' +
        'artículo 15, fracción I.',
    },
    {
      id: 'datos',
      heading: '2. Datos personales que tratamos (art. 15, fr. II)',
      paragraphs: [
        'No tratamos datos personales sensibles en el sentido del artículo 2, ' +
          'fracción VI —salud, origen étnico, creencias, opiniones políticas o ' +
          'preferencia sexual—, porque el servicio no los necesita.',
      ],
      bullets: [
        'Identificación y contacto: nombre, apellidos, correo, teléfono y clave ' +
          'de país del teléfono.',
        'Identificación oficial: documento de identidad, CURP, país emisor, ' +
          'fecha de nacimiento y país de residencia. Son los que exige la ley ' +
          'para dar de alta una cuenta y para que una empresa pueda verificar ' +
          'quién es.',
        'Datos fiscales, solo para cuentas de empresa: razón social, RFC, ' +
          'régimen fiscal, uso de CFDI, código postal y domicilio.',
        'Perfil profesional: título, resumen, experiencia laboral, formación, ' +
          'idiomas, habilidades y hoja de vida en PDF.',
        'Contenido que decides subir: fotografía de perfil, logotipo ' +
          'corporativo e imágenes de tus vacantes.',
        'Uso del servicio: vacantes publicadas, postulaciones, respuestas a ' +
          'preguntas de filtrado, vacantes guardadas y los datos de contacto ' +
          'que nos das en el formulario o en el newsletter.',
        'Datos técnicos: dirección IP, agente de usuario, registro de ' +
          'aceptación de documentos legales y bitácora de auditoría.',
        'Datos de pago: los estrictamente necesarios para facturar. No ' +
          'almacenamos números completos de tarjeta.',
      ],
      callout:
        'La fotografía es un caso aparte: además de dato personal, su uso es una ' +
        'cesión de derechos de imagen con documento y casilla propios, porque la ' +
        'ley exige que ese consentimiento sea expreso y separado.',
    },
    {
      id: 'finalidades',
      heading: '3. Finalidades del tratamiento (art. 15, fr. III)',
      paragraphs: [
        'La columna de la derecha indica qué finalidades se sostienen en la ' +
          'relación contractual contigo y cuáles exigen tu consentimiento. El ' +
          'artículo 15, fracción III obliga a distinguirlas.',
      ],
      table: {
        head: ['Finalidad', 'Base'],
        rows: [
          ['Crear y mantener tu cuenta y autenticarte', 'Relación contractual'],
          ['Publicar tu perfil cuando lo habilitas', 'Consentimiento'],
          ['Mostrar tus datos al banco de talento', 'Consentimiento expreso'],
          ['Gestionar tus postulaciones y las de tu empresa', 'Relación contractual'],
          ['Cobrar, facturar y administrar tu plan o promoción', 'Relación contractual'],
          ['Enviar newsletter y comunicaciones comerciales', 'Consentimiento — puedes negarte sin perder el servicio'],
          ['Guardar evidencia de qué aceptaste y cuándo', 'Cumplimiento legal'],
          ['Atender solicitudes ARCO y reclamaciones', 'Cumplimiento legal'],
          ['Mantener la seguridad y registrar auditoría', 'Cumplimiento legal'],
          ['Atender requerimientos de autoridad competente', 'Orden jurídica'],
        ],
      },
      callout:
        'No usamos tus datos para perfiles publicitarios ni para decidir qué ' +
        'ofertas se te muestran mediante evaluación automatizada. El artículo ' +
        '26, fracción II de la LFPDPPP da derecho a oponerse al tratamiento ' +
        'automatizado con efectos jurídicos, y la forma más limpia de ' +
        'respetarlo es no hacerlo.',
    },
    {
      id: 'transferencias',
      heading: '4. Transferencias (art. 15, fr. V y art. 35)',
      paragraphs: [
        'No vendemos ni rentamos tus datos personales. Sólo hay dos supuestos ' +
          'en los que viajan fuera de esta plataforma:',
      ],
      bullets: [
        'A la empresa que publica una vacante, cuando te postulas. El artículo ' +
          '36, fracción VII permite la transferencia necesaria para el ' +
          'mantenimiento de una relación jurídica entre titular y responsable. ' +
          'Aun así exigimos tu consentimiento expreso al hacer visible tu ' +
          'perfil, para que la decisión sea tuya y quede registrada.',
        'A los proveedores que nos contratan para operar el servicio, en su ' +
          'papel de persona encargada: pasarela de pago, correo electrónico y ' +
          'alojamiento. La persona encargada recibe este aviso y asume las ' +
          'mismas obligaciones que nosotros.',
      ],
      callout:
        'Las transferencias fuera de México exigirían una base legal propia del ' +
        'artículo 36 y una cláusula expresa en este aviso. A la fecha de esta ' +
        'versión no hay ninguna.',
    },
    {
      id: 'cookies',
      heading: '5. Cookies y tecnologías de recabado automático',
      paragraphs: [
        'Usamos tecnologías que obtienen información de manera automática al ' +
          'momento en que entras al sitio. El artículo 14, párrafo tercero, del ' +
          'Reglamento de la LFPDPPP obliga a informar de su uso en ese momento y ' +
          'de cómo se pueden deshabilitar.',
      ],
      bullets: [
        'Cada petición a nuestros servidores comunica tu dirección IP y tu ' +
          'agente de usuario.',
        'Guardamos tu preferencia de idioma y tu respuesta al aviso de cookies ' +
          'en cookies propias, de primera parte y eliminables desde tu navegador.',
        'Google Fonts, Google Identity Services y OpenStreetMap son recursos de ' +
          'terceros y solo se cargan si das tu consentimiento. Si no lo das, el ' +
          'sitio funciona igual con la tipografía y el mapa del sistema.',
      ],
      callout:
        'La descripción cookie por cookie está en la Política de cookies, donde ' +
        'puedes cambiar tu decisión cuando quieras.',
    },
    {
      id: 'seguridad',
      heading: '6. Medidas de seguridad',
      paragraphs: [
        'Mantenemos medidas administrativas, técnicas y físicas contra daño, ' +
          'pérdida, alteración, destrucción o acceso no autorizado, como exige ' +
          'el artículo 18. En concreto:',
      ],
      bullets: [
        'Contraseñas cifradas con bcrypt; nunca en texto plano.',
        'Sesión con tokens de acceso cortos y de refresco largos, revocables y ' +
          'con lista de revocación.',
        'Control de acceso por rol y permiso en cada endpoint; la autorización ' +
          'nunca se resuelve en el navegador.',
        'Verificación de propiedad de cada recurso: una empresa solo ve sus ' +
          'vacantes y un candidato solo sus datos.',
        'Bitácora de auditoría de las operaciones sensibles.',
        'Copias de seguridad y cifrado en tránsito.',
      ],
      callout:
        'Si una vulneración afecta de forma significativa tus derechos ' +
        'patrimoniales o morales, te lo informaremos de inmediato para que ' +
        'puedas tomar medidas, como manda el artículo 19.',
    },
    {
      id: 'conservacion',
      heading: '7. Conservación',
      bullets: [
        'Cuenta y perfil: mientras la cuenta esté activa y, tras la baja, el ' +
          'periodo de retención acotado, bloqueados y no utilizables.',
        'Registros mercantiles, contratos y comprobantes de pago: diez años, ' +
          'por los artículos 38, 46 y 49 del Código de Comercio.',
        'Datos de incumplimiento de obligaciones contractuales: setenta y dos ' +
          'meses, por el artículo 10, párrafo tercero, de la LFPDPPP.',
        'Constancia de aceptación de documentos legales: se conserva aunque se ' +
          'elimine la cuenta, porque es la evidencia de lo que se aceptó.',
        'Hoja de vida y archivos que subiste: se eliminan con tu cuenta.',
      ],
      callout:
        'Cuando un dato deja de ser necesario para las finalidades de este ' +
        'aviso, se suprime tras el bloqueo previo, como exige el artículo 10.',
    },
    {
      id: 'arco',
      heading: '8. Tus derechos ARCO (art. 15, fr. IV y arts. 21 a 34)',
      table: {
        head: ['Derecho', 'Cómo se ejerce sin papeleo'],
        rows: [
          ['Acceso', 'Descarga completa de tus datos en JSON desde «Mi cuenta»'],
          ['Rectificación', 'Edita tu perfil o los datos de tu empresa'],
          ['Cancelación', 'Baja de cuenta desde «Mi cuenta»; se anula de inmediato'],
          ['Oposición', 'Cambia la visibilidad de tu perfil en «Configuración»'],
        ],
      },
      paragraphs: [
        'Si prefieres el procedimiento por escrito, escribe al correo de datos ' +
          'personales de la sección 1 incluyendo:',
      ],
      steps: [
        'Tu nombre y un domicilio o medio para recibir notificaciones.',
        'Documento que acredite tu identidad, o la personalidad e identidad de ' +
          'tu representante legal.',
        'Descripción clara de los datos afectados y de qué derecho se trata.',
        'Cualquier documento que facilite la localización de los datos.',
      ],
      callout:
        'Respondemos en un máximo de veinte días naturales desde que recibimos ' +
        'la solicitud y aplicamos la respuesta en los quince días siguientes ' +
        '(artículo 31). Podemos ampliar ese plazo una vez por un periodo igual si ' +
        'lo justificamos. El ejercicio es gratuito; solo cobramos reproducción o ' +
        'envío, y si tú pones el medio, la entrega es sin costo (artículo 34).',
    },
    {
      id: 'revocacion',
      heading: '9. Revocación del consentimiento',
      paragraphs: [
        'Puedes revocar tu consentimiento en cualquier momento. La revocación no ' +
          'tiene efectos retroactivos: lo hecho mientras consentías sigue siendo ' +
          'válido.',
      ],
      bullets: [
        'Desde «Mi cuenta» puedes revocar cada consentimiento y ver el historial ' +
          'completo de lo que aceptaste, con fecha y versión.',
        'Escribirnos al correo de datos personales surte el mismo efecto.',
      ],
      callout:
        'Revocar los Términos o el Aviso no cancela tu cuenta ni anula una ' +
        'suscripción en curso: cierra la puerta a tratamientos futuros. Para ' +
        'cancelar de verdad, usa la baja de cuenta.',
    },
    {
      id: 'menores',
      heading: '10. Menores de edad',
      paragraphs: [
        'El servicio está dirigido a mayores de 18 años. No recabamos ' +
        'intencionadamente datos de menores. Si crees que una cuenta es de un ' +
        'menor, escríbenos y la eliminamos.',
      ],
    },
    {
      id: 'terceros',
      heading: '11. Datos de terceros',
      paragraphs: [
        'Si en tu perfil, en una vacante o en tu hoja de vida aparecen datos de ' +
          'otra persona, nos pides publicarlos. Al subir una imagen de alguien ' +
          'más garantizas que tienes su autorización y asumes la ' +
          'responsabilidad.',
      ],
    },
    {
      id: 'cambios',
      heading: '12. Cambios a este aviso (art. 15, fr. VI)',
      paragraphs: [
        'Todo cambio material se publica en esta página con versión nueva, ' +
          'fecha de vigencia y acceso a las versiones anteriores. No cambiamos ' +
          'un aviso de forma retroactiva: lo que aceptaste sigue siendo exigible ' +
          'bajo la versión que aceptaste.',
      ],
      callout:
        'Procedimiento: un cambio menor se anuncia en la página; uno sustancial ' +
        'se avisa por correo a la dirección de tu cuenta y, a tu entrada, se te ' +
        'pide aceptar de nuevo.',
    },
  ],
  closing:
    'Si consideras vulnerado tu derecho a la protección de datos personales, ' +
    'puedes acudir a la Secretaría Anticorrupción y Buen Gobierno. Tienes ' +
    'quince días hábiles desde que te comuniquemos nuestra respuesta, y también ' +
    'puedes acudir si no recibes respuesta una vez vencido el plazo de veinte ' +
    'días del artículo 31.',
};

/**
 * Términos y condiciones.
 *
 * Redactados como contrato de adhesión (art. 85 LFPC): español, letra legible y
 * sin ninguna de las cláusulas que el artículo 90 declara nulas —ni ' +
 * 'modificación unilateral, ni limitación de responsabilidad, ni renuncia a la ' +
 * 'LFPC, ni sometimiento a tribunales extranjeros.
 */
const terms: LegalDocumentContent = {
  intro:
    'Estos términos regulan el uso de Impulso Jobs. Al crear una cuenta o ' +
      'contratar un plan aceptas este documento en su versión vigente. Si no ' +
      'estás de acuerdo, no uses el servicio.',
  summary: [
    'Impulso Jobs es un intermediario: conectamos vacantes con candidatos. No ' +
      'somos patrones ni garantizamos que una contratación se concrete.',
    'La empresa publica, decide y contrata. El candidato decide a qué se ' +
      'postula.',
    'Las obligaciones exigibles al aceptar son las de la plataforma y las de la ' +
      'empresa que contrata un plan; el candidato se obliga a usar el servicio de ' +
      'forma lícita.',
    'Los planes se cobran por adelantado con IVA incluido y son digitales: el ' +
      'periodo empieza al confirmarse el pago.',
    'Puedes cancelar sin penalización. Lo consumido no se reembolsa.',
  ],
  sections: [
    {
      id: 'alcance',
      heading: '1. Qué es Impulso Jobs',
      paragraphs: [
        'Impulso Jobs es una plataforma digital que permite a empresas publicar ' +
          'vacantes y a candidatos buscar y postularse. El servicio consiste en ' +
          'publicar información y facilitar la comunicación entre las partes.',
      ],
      callout:
        'Conforme al artículo 12, párrafo segundo, de la Ley Federal del ' +
        'Trabajo, las agencias de empleo o intermediarios que intervienen en ' +
        'el proceso de contratación no son patrones: ese carácter corresponde a ' +
        'quien se beneficia del servicio. Impulso Jobs no es patrón, no ' +
        'mantiene relación laboral con los candidatos y no responde por las ' +
        'obligaciones laborales que generen las empresas usuarias.',
    },
    {
      id: 'cuentas',
      heading: '2. Cuentas y requisitos',
      bullets: [
        'Una cuenta por persona; en empresas, una por colaborador autorizado.',
        'Los datos que registras deben ser ciertos y estar al día. Verificamos ' +
          'el correo y, para candidatos, la identidad documental.',
        'Eres responsable de la confidencialidad de tu contraseña y de toda ' +
          'actividad hecha con tu cuenta.',
        'Notifica de inmediato cualquier uso no autorizado.',
        'Podemos suspender cuentas con datos falsos, documentos de otra gente, ' +
          'scraping masivo o peticiones que comprometan el servicio.',
      ],
    },
    {
      id: 'empresa',
      heading: '3. Obligaciones de la empresa',
      bullets: [
        'Publicar vacantes veraces: puestos, salario cuando aplique, ' +
          'condiciones y ubicación reales.',
        'No discriminar por origen, género, edad, orientación sexual, ' +
          'discapacidad, religión ni ningún otro motivo.',
        'Respetar la legislación vigente en protección de datos laborales y ' +
          'derechos de las personas que se postulan a sus vacantes.',
        'Tratar los datos de los candidatos que reciben con la misma reserva que ' +
          'nosotros y no destinarlos a otro fin.',
        'Garantizar que la imagen que sube de su empresa es de su propiedad o ' +
          'tiene licencia.',
      ],
      callout:
        'Una empresa que publica una oferta falsa o discriminatoria puede ser ' +
        'suspendida sin aviso previo.',
    },
    {
      id: 'candidato',
      heading: '4. Obligaciones del candidato',
      bullets: [
        'La información de tu perfil debe ser veraz; un perfil con datos falsos ' +
          'puede eliminarse.',
        'No uses el servicio para spam, para ofertas masivas no solicitadas ni ' +
          'para republicar el contenido de las empresas.',
        'La hoja de vida que subes debe ser tuya. Si incluye datos de terceros, ' +
          'garantizas que tienes su autorización.',
        'Entiendes que postularse no genera relación laboral ni derecho a ' +
          'contraprestación.',
      ],
    },
    {
      id: 'planes',
      heading: '5. Planes, precios y facturación',
      paragraphs: [
        'Los planes se ofrecen por periodos anuales o por promoción de vacante, ' +
          'con los precios y beneficios indicados en la página de planes en el ' +
          'momento de la compra.',
      ],
      bullets: [
        'Todos los precios se exhiben con el IVA desglosado y el monto total, ' +
          'conforme al artículo 7 BIS de la Ley Federal de Protección al ' +
          'Consumidor.',
        'El pago se realiza con los medios disponibles en el momento de la ' +
          'compra; los medios de terceros son responsables de su propio ' +
          'procesamiento.',
        'El periodo contratado comienza cuando se confirma el pago, no cuando se ' +
          'solicita.',
        'Emitimos comprobante fiscal digital por cada cobro.',
      ],
      callout:
        'Las facturas se timbran al identificarse el pago. En medios en efectivo ' +
        'o transferencia, como el vale de pagado OXXO, el comprobante puede ' +
        'tardar hasta que el pago se aplica.',
    },
    {
      id: 'renovacion',
      heading: '6. Renovación y cancelación (art. 76 Bis, fr. VIII y IX, LFPC)',
      paragraphs: [
        'Las suscripciones anuales incluyen renovación automática. Esto es lo que ' +
          'hacemos para que sea legal y para que sea justo:',
      ],
      steps: [
        'El consentimiento al cobro recurrente se pide de forma expresa e ' +
          'informada en el momento de la contratación, con una casilla sin marcar.',
        'Te avisamos por correo con al menos cinco días naturales de antelación ' +
          'a cada cobro por renovación.',
        'Puedes cancelar sin penalización desde tu cuenta, en dos pasos, sin ' +
          'llamar ni escribir a nadie.',
        'Si cancelas dentro de los cinco días anteriores al cobro, la renovación ' +
          'no se procesa.',
      ],
      callout:
        'La Ley nos obliga a ofrecer cancelación inmediata y sin penalización. No ' +
        'podemos cobrarte una penalización por cancelar, aunque el contrato se ' +
        'haya renovado.',
    },
    {
      id: 'reembolsos',
      heading: '7. Reembolsos',
      paragraphs: [
        'El detalle completo está en la Política de reembolso, que forma parte de ' +
          'estos términos. En resumen: los servicios son digitales y empiezan a ' +
          'prestarse en el momento del pago, así que lo consumido no se reembolsa; ' +
          'lo no consumido, sí.',
      ],
      callout:
        'Si un cobro se hizo por error, duplicado o sin tu autorización, se ' +
        'reembolsa íntegramente sin importar el periodo.',
    },
    {
      id: 'contenido',
      heading: '8. Contenido publicado por los usuarios',
      paragraphs: [
        'Las empresas publican vacantes y los candidatos publican perfiles y ' +
          'hojas de vida. Ese contenido es de ellos.',
      ],
      bullets: [
        'Nos das licencia para mostrarlo en el servicio, con el fin exclusivo de ' +
          'que el servicio funcione.',
        'Nos garantizas que tienes los derechos sobre lo que subes: el ' +
          'logotipo de tu empresa, las imágenes de tus vacantes y cualquier ' +
          'archivo.',
        'Las fotografías de personas tienen reglas propias: revisa la Cesión de ' +
          'derechos de imagen.',
      ],
    },
    {
      id: 'propiedad',
      heading: '9. Propiedad intelectual',
      bullets: [
        'La marca, el diseño, el software y el contenido propio del sitio son de ' +
          'Impulso Jobs o de sus licenciantes.',
        'Nos concedes el uso de tu logotipo dentro del portal mientras tu cuenta ' +
          'esté activa.',
        'Las fotografías, textos y marcas de terceros que aparecen en el ' +
          'servicio pertenecen a sus titulares.',
      ],
    },
    {
      id: 'aviso-contenido',
      heading: '10. Aviso de contenido protegido y contraaviso',
      paragraphs: [
        'Si consideras que una imagen o un texto publicado infringe tus ' +
          'derechos de autor, notifícanoslo. Cumplimos el régimen de los ' +
          'artículos 114 Septies y 114 Octies de la Ley Federal del Derecho de ' +
          'Autor.',
      ],
      steps: [
        'Envía el aviso con tu nombre, la URL exacta del material, la obra y tu ' +
          'derecho sobre ella, y una firma electrónica o autógrafa escaneada que ' +
          'acredite la titularidad.',
        'No condicionamos el retiro a que acredites el registro de la obra: ' +
          'basta la declaración bajo protesta de decir verdad.',
        'Retiramos el material y notificamos a quien lo publicó.',
        'Si quien lo publicó cree que fue un error, puede presentar un ' +
          'contraaviso con los mismos datos.',
        'La Ley sanciona con multa a quien presente un aviso de mala fe.',
      ],
    },
    {
      id: 'suspension',
      heading: '11. Suspensión y terminación',
      paragraphs: [
        'Puedes cerrar tu cuenta cuando quieras. Podemos suspenderla de forma ' +
          'temporal por incumplimiento de estos términos o por riesgo para la ' +
          'seguridad de la plataforma, avisándote siempre que sea posible.',
      ],
    },
    {
      id: 'garantias',
      heading: '12. Limitación de responsabilidad',
      paragraphs: [
        'El servicio se presta en el estado en que se encuentra. No podemos ' +
          'garantizar que sea ininterrumpido ni libre de errores.',
      ],
      callout:
        'El artículo 90 de la LFPC declara nulas las cláusulas que liberen de ' +
        'responsabilidad civil al proveedor. Lo que aquí se acepta es únicamente ' +
        'que no respondemos por daños indirectos, y se mantiene íntegro el ' +
        'derecho del consumidor a reclamar por el incumplimiento del servicio.',
    },
    {
      id: 'ley',
      heading: '13. Legislación aplicable',
      paragraphs: [
        'Estos términos se rigen por la legislación mexicana aplicable, en ' +
          'particular la Ley Federal de Protección de Datos Personales en Posesión ' +
          'de los Particulares, la Ley Federal de Protección al Consumidor, la ' +
          'Ley Federal del Trabajo y la Ley Federal del Derecho de Autor.',
      ],
      callout:
        'El artículo 90, fracción VI de la LFPC declara nulas las cláusulas que ' +
        'obliguen a renunciar a la protección de esa Ley o a ' +
        'someterse a tribunales extranjeros. Ninguna de las dos cosas está aquí, y ' +
        'no podrían estarlo.',
    },
    {
      id: 'cambios',
      heading: '14. Cambios a estos términos',
      paragraphs: [
        'Podemos modificar estos términos. Los cambios se publican con su versión ' +
          'y fecha de vigencia, y las versiones anteriores quedan disponibles.',
      ],
      callout:
        'Un cambio material no se aplica retroactivamente a los contratos en ' +
        'curso: la versión que aceptaste es la que te rige mientras dure ese ' +
        'periodo.',
    },
  ],
  closing:
    'Al marcar las casillas consientes de forma expresa con este documento. ' +
    'Guardamos esa aceptación con su versión, la fecha, la dirección IP y el ' +
    'navegador, y puedes ver el registro en «Mi cuenta».',
};

/**
 * Política de cookies.
 *
 * En México no existe una ley de cookies. El fundamento es el artículo 14,
 * párrafo tercero, del Reglamento de la LFPDPPP y el artículo 15, fracción IV de
 * la Ley: informar del uso de mecanismos de recabado automático y ofrecer medios
 * para limitar su uso.
 */
const cookies: LegalDocumentContent = {
  intro:
    'Esta política explica qué tecnologías usamos para obtener información sobre ' +
    'tu visita, quién las controla y cómo desactivarlas. Antes de aceptarlas, un ' +
    'aviso te pregunta y puedes rechazar todo lo que no sea imprescindible sin ' +
    'que el sitio deje de funcionar.',
  summary: [
    'No usamos cookies publicitarias ni de seguimiento entre sitios.',
    'Guardamos dos cookies propias para el idioma y para recordar tu decisión. ' +
      'Son las únicas que se ponen sin preguntar antes.',
    'Google Fonts, Google Identity Services y OpenStreetMap solo se cargan si das ' +
      'tu consentimiento.',
    'Rechazar todo es tan fácil como aceptar: el mismo botón, el mismo número ' +
      'de clics.',
    'Puedes cambiar tu decisión cuando quieras desde esta misma página.',
  ],
  sections: [
    {
      id: 'que-son',
      heading: '1. Qué son las cookies',
      paragraphs: [
        'Una cookie es un pequeño archivo que el sitio guarda en tu navegador. ' +
          'Sirve para recordar cosas entre páginas —tu idioma, o que ya ' +
          'respondiste a este aviso— sin obligarte a identificarte.',
      ],
      bullets: [
        'Además de cookies, algunas tecnologías hacen lo mismo: guardar ' +
          'información en tu equipo o leerla.',
        'El fingerprinting, que reconstruye tu identificador combinando ' +
          'características del navegador, es una de ellas.',
      ],
      callout: 'No usamos fingerprinting de ningún tipo.',
    },
    {
      id: 'tabla',
      heading: '2. Cookies y recursos que usamos',
      table: {
        head: ['Nombre', 'Quién lo pone', 'Para qué', 'Categoría'],
        rows: [
          ['ij_lang', 'Impulso Jobs', 'Recordar el idioma. No te identifica.', 'Imprescindible'],
          [
            'ij_consent',
            'Impulso Jobs',
            'Recordar tu respuesta a este aviso.',
            'Imprescindible',
          ],
          [
            'accounts.google.com',
            'Google LLC',
            'Botón de acceso con Google. Google pone sus cookies en su dominio ' +
              'y puede ver tu IP.',
            'Funcional — solo con tu consentimiento',
          ],
          [
            'tile.openstreetmap.org',
            'OpenStreetMap',
            'Mostrar el mapa de contacto y la ubicación de la vacante. Cada ' +
              'tesela comunica tu IP a OpenStreetMap.',
            'Funcional — solo con tu consentimiento',
          ],
          [
            'js.stripe.com',
            'Stripe Inc.',
            'Procesar el pago de planes y promociones.',
            'Imprescindible para comprar',
          ],
        ],
      },
    },
    {
      id: 'consentimiento',
      heading: '3. Cómo obtenemos tu consentimiento',
      paragraphs: [
        'Al entrar por primera vez te mostramos un aviso con tres caminos: ' +
          'aceptar todo, rechazar todo y ver el detalle para elegir categoría por ' +
          'categoría.',
      ],
      bullets: [
        'La categoría imprescindible no se puede desactivar: sin idioma ni ' +
          'respuesta guardada, el sitio no funciona.',
        'Las demás empiezan apagadas. No se te carga nada por adelantado antes ' +
          'de que decidas.',
        'Tu respuesta se guarda en la cookie ij_consent y, si tienes cuenta, ' +
          'también en nuestro registro de consentimientos.',
      ],
      callout:
        'Antes de que exista tu respuesta, el sitio no ha cargado ninguna ' +
        'tecnología de terceros. Lo que se descarga en esa primera visita es ' +
        'nuestro propio HTML, CSS e imágenes.',
    },
    {
      id: 'desactivar',
      heading: '4. Cómo desactivarlas',
      steps: [
        'Para cambiar tu decisión: vuelve a esta página y pulsa «Cambiar mis ' +
          'preferencias». Se abre el mismo aviso.',
        'Para eliminarlas desde el sistema: borra los datos de sitios en la ' +
          'configuración de tu navegador.',
        'Para bloquear cookies de terceros: la configuración del navegador ' +
          'permite rechazarlas todas; la web sigue funcionando con la tipografía ' +
          'del sistema y sin mapa.',
      ],
      callout:
        'Si bloqueas la cookie del aviso, verás el banner otra vez en la ' +
        'siguiente visita, porque no podremos recordar que ya respondiste.',
    },
    {
      id: 'servidor',
      heading: '5. Datos que el servidor registra',
      paragraphs: [
        'Independientemente de las cookies, cada petición a nuestros servidores ' +
          'incluye tu dirección IP y tu agente de usuario. Eso no se puede ' +
          'apagar y no lo entregamos a terceros: lo usamos para la seguridad, el ' +
          'control de intentos fallidos y la auditoría.',
      ],
    },
    {
      id: 'cambios',
      heading: '6. Cambios en esta política',
      paragraphs: [
        'Si añadimos una tecnología nueva, aparecerá aquí antes de empezar a ' +
          'usarla y, si exige consentimiento, el aviso te lo volverá a pedir.',
      ],
    },
  ],
  closing:
    'Tienes derecho a oponerte al tratamiento de tus datos para finalidades ' +
    'distintas de las del servicio (artículo 15, fracción IV de la LFPDPPP). ' +
    'Negarte a las cookies opcionales es esa oposición y no te cuesta nada ' +
    'funcional.',
};

/** Política de reembolso, alineada con los planes y promociones reales. */
const refund: LegalDocumentContent = {
  intro:
    'Esta política explica en qué casos devolvemos dinero, en cuánto tiempo y ' +
    'cómo. Forma parte de los Términos y condiciones; si hay contradicción, ' +
    'prevalece esta política.',
  summary: [
    'Los planes son servicios digitales y empiezan a prestarse al confirmarse ' +
      'el pago.',
    'Reembolsamos íntegro el error de cobro, el cobro duplicado y el pago sin ' +
      'autorización.',
    'Reembolsamos la parte proporcional no consumida de una cancelación.',
    'No reembolsamos el periodo ya consumido.',
    'Reembolsar no cancela la suscripción: para dejar de cobrar hay que cancelar ' +
      'además.',
  ],
  sections: [
    {
      id: 'principio',
      heading: '1. Principio',
      paragraphs: [
        'Cada cobro corresponde a un servicio digital que se presta desde que se ' +
          'confirma el pago: las vacantes están publicadas, el banco de talento ' +
          'está disponible y los beneficios del plan están activos. Por eso la ' +
          'regla general es que lo consumido no se devuelve.',
      ],
      callout:
        'La Ley Federal de Protección al Consumidor no impone un derecho ' +
        'general de desistimiento para servicios digitales en México, pero sí ' +
        'obliga a que el reembolso sea efectivo cuando el proveedor incumple.',
    },
    {
      id: 'devoluciones',
      heading: '2. Casos en que sí hay reembolso',
      table: {
        head: ['Caso', 'Qué se devuelve', 'Plazo'],
        rows: [
          ['Cobro duplicado', 'El 100 % del cobro duplicado', '15 días hábiles desde el reporte'],
          ['Cobro sin autorización', 'El 100 %', '15 días hábiles'],
          ['Error en el cobro (importe, medio o concepto)', 'La diferencia o el 100 %', '15 días hábiles'],
          ['Servicio no disponible por causa imputable a nosotros', 'Proporcional al tiempo sin servicio', '15 días hábiles'],
          ['Fallo de la pasarela y el cobro no se revierte con el banco', 'El 100 % una vez confirmado', '30 días naturales'],
          [
            'Cancelación avisada en los 5 días previos al cobro de renovación',
            'El 100 %, porque la renovación no se procesó',
            '15 días hábiles',
          ],
        ],
      },
    },
    {
      id: 'proporcional',
      heading: '3. Cancelación de una suscripción en curso',
      paragraphs: ['Al cancelar:'],
      bullets: [
        'Se desactiva el acceso a las funciones de pago de inmediato.',
        'El periodo ya consumido no se devuelve.',
        'El periodo no consumido se devuelve de forma proporcional, calculada ' +
          'por días.',
        'La cancelación no genera ningún cargo adicional.',
      ],
      callout:
        'La fracción IX del artículo 76 Bis de la Ley Federal de Protección al ' +
        'Consumidor nos obliga a ofrecer este mecanismo de cancelación inmediata. ' +
        'No podemos añadirle penalización ni condiciones.',
    },
    {
      id: 'promociones',
      heading: '4. Promociones de vacante',
      paragraphs: [
        'Las promociones destacan la vacante (destacada o de alta) durante ' +
          'un periodo concreto. Si la vacante se elimina, se oculta o se cierra ' +
          'antes de que termine el periodo pagado por un motivo imputable a la ' +
          'empresa, se reembolsa lo proporcional al tiempo restante. Si la vacante ' +
          'termina su curso natural porque su fecha de expiración llegó, el ' +
          'periodo se consumió y no hay reembolso.',
      ],
    },
    {
      id: 'excepciones',
      heading: '5. Casos en que no hay reembolso',
      bullets: [
        'El periodo contratado ya consumido.',
        'La vacante caducó por su propia fecha de expiración.',
        'La cuenta fue suspendida por incumplimiento de los Términos y ' +
          'condiciones.',
        'El contenido publicado se retiró por infringir la ley o los Términos.',
      ],
    },
    {
      id: 'medio',
      heading: '6. Método y plazo',
      steps: [
        'Escribes al correo de soporte indicando el identificador de la orden o ' +
          'de la suscripción y el motivo.',
        'Revisamos el caso en un máximo de diez días hábiles. Si procede, te ' +
          'informamos el importe exacto antes de devolverlo.',
        'El reembolso se ejecuta por el mismo medio con el que pagaste. Las ' +
          'tarjetas de crédito tienen el plazo del banco emisor, que no depende de ' +
          'nosotros.',
        'Emitimos o complementamos el comprobante fiscal correspondiente.',
      ],
      callout:
        'Los reembolsos se ejecutan en un máximo de quince días hábiles desde ' +
        'que se aprueba el caso, conforme al compromiso de esta política.',
    },
    {
      id: 'reclamos',
      heading: '7. Si no estás de acuerdo',
      paragraphs: [
        'Puedes pedir una conciliación ante la Procuraduría Federal del ' +
          'Consumidor y presentarte a arbitraje, conforme a los artículos 111 y ' +
          '117 de la Ley Federal de Protección al Consumidor. La LFPC te aplica ' +
          'también como persona moral: su artículo 2, fracción I define al ' +
          'consumidor como la persona física o moral que adquiere como ' +
          'destinatario final.',
      ],
    },
  ],
  closing:
    'Esta política no limita ningún derecho que te otorgue la Ley Federal de ' +
    'Protección al Consumidor. Ante cualquier duda, preferimos que nos escribas ' +
    'antes de comprar.',
};

/**
 * Cesión de derechos de imagen.
 *
 * Documento y casilla separados porque el consentimiento para usar la imagen de
 * una persona tiene que ser expreso y separado del consentimiento al
 * tratamiento de datos. La Ley Federal del Derecho de Autor (artículos 87 y
 * 216 Bis) y la jurisprudencia 1a./J. 22/2022 lo exigen así, y este uso es
 * comercial.
 */
const imageRights: LegalDocumentContent = {
  intro:
    'Si subes una fotografía a tu perfil, nos autorizas a mostrarla. Este ' +
    'documento explica hasta dónde llega esa autorización y qué queda fuera. ' +
    'Autorizar es opcional: puedes usar Impulso Jobs sin foto.',
  summary: [
    'Nos autorizas a mostrar tu foto en el portal, sin retocar y sin usarla con ' +
      'fines distintos de los aquí descritos.',
    'No cedemos tus derechos de autor ni entregamos tu imagen a terceros para ' +
      'que la exploten.',
    'Puedes retirar tu foto cuando quieras, sin que ello borre tu cuenta ni tu ' +
      'historial de postulaciones.',
    'Si la foto no es tuya, garantizas que tienes autorización de quien aparece ' +
      'en ella.',
  ],
  sections: [
    {
      id: 'autorizacion',
      heading: '1. Qué autorizas',
      bullets: [
        'Mostrar tu fotografía en tu perfil de candidato dentro de Impulso ' +
          'Jobs.',
        'Mostrar tu fotografía, junto con el resto de tu perfil, en los ' +
          'resultados del banco de talento a empresas con acceso contratado.',
        'Que la imagen se cargue técnicamente en nuestras páginas, incluidos ' +
          'miniaturas y copias reducidas.',
      ],
    },
    {
      id: 'alcance',
      heading: '2. Durante cuánto y en qué territorio',
      paragraphs: [
        'La autorización se concede por el tiempo que tu cuenta esté activa y se ' +
          'mantiene mientras tu perfil sea visible. Cuando retires la foto, ' +
          'dejamos de mostrarla.',
      ],
      callout:
        'La autorización es limitada: no podemos con ella imprimir tu cara en un ' +
        'anuncio, venderla ni entregarla a un tercero para que la use. Si algún ' +
        'día quisiéramos eso, tendríamos que pedirte un permiso nuevo y distinto.',
    },
    {
      id: 'fuera',
      heading: '3. Qué queda fuera',
      bullets: [
        'No cedemos la autoría de la imagen. Si es fotografía y es tuya, los ' +
          'derechos de autor siguen siendo tuyos.',
        'No la usamos para publicidad fuera del portal.',
        'No la cedemos a terceros para su uso comercial.',
        'No la usamos para entrenar modelos de inteligencia artificial.',
      ],
    },
    {
      id: 'terceros',
      heading: '4. Si la foto no es tuya',
      paragraphs: [
        'Si en tu foto aparece otra persona, o si es una fotografía que no te ' +
          'pertenece, al subirla nos garantizas que cuentas con su autorización ' +
          'expresa para este uso.',
      ],
      callout:
        'Esto incluye las fotos de perfil que descargas de redes sociales. Que ' +
        'sean públicas no significa que puedas republicarlas comercialmente.',
    },
    {
      id: 'empresas',
      heading: '5. Logos e imágenes de empresas',
      paragraphs: [
        'El mismo criterio aplica a los logotipos e imágenes que sube una empresa: ' +
          'nos garantiza que son de su propiedad o que cuentan con licencia, y que ' +
          'su uso en el portal no infringe derechos de un tercero.',
      ],
    },
    {
      id: 'retiro',
      heading: '6. Cómo retirar tu autorización',
      steps: [
        'Baja la fotografía desde tu perfil, o',
        'Envía un correo pidiendo que se retire, indicando tu cuenta.',
      ],
      callout:
        'Retirar la foto no elimina tu cuenta ni tus postulaciones; solo deja de ' +
        'mostrarse la imagen. Si además quieres cerrar la cuenta, eso es el ' +
        'derecho de cancelación y se ejerce desde «Mi cuenta».',
    },
    {
      id: 'fundamento',
      heading: '7. Fundamento legal',
      paragraphs: [
        'Este documento se apoya en los artículos 87 y 216 Bis de la Ley Federal ' +
          'del Derecho de Autor, que exigen consentimiento expreso para publicar ' +
          'la imagen de una persona con fines comerciales, y en la jurisprudencia ' +
          '1a./J. 22/2022 de la Suprema Corte de Justicia de la Nación, que ' +
          'reconoce que esa imagen puede reclamarse por responsabilidad civil ' +
          'cuando se usa sin consentimiento.',
      ],
    },
  ],
  closing:
    'Guardamos el registro de esta autorización con la versión del documento, la ' +
    'fecha, la dirección IP y el navegador. Puedes verlo en «Mi cuenta».',
};

/**
 * Español e inglés en el mismo archivo a propósito: los cinco documentos están
 *jurídicamente emparejados y subir una versión sin la otra dejaría a medio
 * mercado sin aviso. Que vivan juntos hace que la omisión sea visible en el
 * diff.
 */
export const LEGAL_CONTENT_ES: Record<LegalContentKey, LegalDocumentContent> = {
  privacy,
  terms,
  cookies,
  refund,
  imageRights,
};