/**
 * Plantillas de páginas personalizadas listas para usar, según el tipo de negocio.
 * El texto es un punto de partida: el negocio lo revisa y ajusta en el editor.
 * {negocio} se reemplaza por el nombre del negocio al crear la página.
 */

export type PageKind =
  | 'dental' | 'spa' | 'barberia' | 'gym' | 'canchas' | 'restaurante' | 'tienda' | 'lavanderia' | 'general';

export type PageTemplate = {
  key: string;
  title: string;
  description: string;
  kinds: PageKind[] | 'all';
  posicion: 'top' | 'bottom';
  buttonText?: string;
  /** '' = WhatsApp del negocio; rutas internas sin el slug (ej. "/servicios"). */
  buttonUrl?: string;
  html: string;
};

const RESERVATION_KINDS: PageKind[] = ['dental', 'spa', 'barberia', 'gym', 'canchas', 'general'];

const ALL: PageTemplate[] = [
  // ── Comunes ─────────────────────────────────────────────────────────
  {
    key: 'quienes-somos',
    title: 'Quiénes somos',
    description: 'Tu historia, lo que te hace diferente y cómo trabajas.',
    kinds: 'all',
    posicion: 'bottom',
    buttonText: 'Escríbenos',
    buttonUrl: '',
    html: `<h2>Hola, somos {negocio}</h2>
<p>Nacimos con una idea sencilla: que cada persona que nos visite se sienta bien atendida desde el primer mensaje hasta que se despide. Por eso cuidamos los detalles, explicamos todo con claridad y respetamos tu tiempo.</p>
<h3>Lo que nos importa</h3>
<ul>
<li><strong>Atención cercana.</strong> Te escuchamos antes de recomendarte algo.</li>
<li><strong>Calidad constante.</strong> Trabajamos con materiales y procesos que nos dan confianza.</li>
<li><strong>Puntualidad.</strong> Tu cita empieza a la hora acordada.</li>
<li><strong>Precios claros.</strong> Sabes cuánto vas a pagar antes de empezar.</li>
</ul>
<h3>Nuestro equipo</h3>
<p>Detrás de {negocio} hay un equipo que se capacita de forma permanente y que disfruta lo que hace. Si tienes una pregunta, cualquiera de nosotros estará feliz de ayudarte.</p>`,
  },
  {
    key: 'preguntas-frecuentes',
    title: 'Preguntas frecuentes',
    description: 'Respuestas rápidas a lo que más te preguntan los clientes.',
    kinds: RESERVATION_KINDS,
    posicion: 'bottom',
    buttonText: '¿Otra pregunta? Escríbenos',
    buttonUrl: '',
    html: `<h3>¿Cómo reservo?</h3>
<p>Desde esta misma página: elige el servicio, el día y la hora que prefieras. Recibirás la confirmación por WhatsApp.</p>
<h3>¿Puedo cambiar o cancelar mi reserva?</h3>
<p>Sí. Escríbenos con la mayor anticipación posible para liberar el horario y buscarte uno nuevo.</p>
<h3>¿Qué formas de pago aceptan?</h3>
<p>Aceptamos efectivo y transferencia. Si necesitas otra forma de pago, consúltanos antes de tu visita.</p>
<h3>¿Qué pasa si llego tarde?</h3>
<p>Haremos lo posible por atenderte, pero es probable que el servicio se acorte para no retrasar a la siguiente persona. Avísanos si vas con retraso.</p>
<h3>¿Tienen promociones?</h3>
<p>Sí, publicamos nuestras promociones vigentes en la página principal. Síguenos para enterarte de las nuevas.</p>`,
  },
  {
    key: 'politicas',
    title: 'Políticas de reserva y cancelación',
    description: 'Reglas claras sobre reservas, atrasos, cambios y pagos.',
    kinds: RESERVATION_KINDS,
    posicion: 'bottom',
    html: `<p>Queremos que todos nuestros clientes tengan su espacio. Por eso trabajamos con estas reglas sencillas:</p>
<h3>Reservas</h3>
<ul>
<li>Tu reserva queda confirmada cuando recibes nuestro mensaje de confirmación.</li>
<li>Te enviaremos un recordatorio antes de tu cita.</li>
</ul>
<h3>Cambios y cancelaciones</h3>
<ul>
<li>Puedes cambiar o cancelar sin costo con al menos 24 horas de anticipación.</li>
<li>Si cancelas con menos tiempo, intentaremos reprogramarte según la disponibilidad.</li>
</ul>
<h3>Atrasos</h3>
<ul>
<li>Te esperamos hasta 15 minutos. Después de ese tiempo el horario puede pasar a otra persona.</li>
</ul>
<p>Si tienes cualquier inconveniente, escríbenos: siempre buscamos una solución.</p>`,
  },

  {
    key: 'preguntas-frecuentes-pedidos',
    title: 'Preguntas frecuentes',
    description: 'Pedidos, entregas, pagos y horarios.',
    kinds: ['tienda', 'restaurante', 'lavanderia'],
    posicion: 'bottom',
    buttonText: '¿Otra pregunta? Escríbenos',
    buttonUrl: '',
    html: `<h3>¿Cómo hago un pedido?</h3>
<p>Desde esta misma página: elige lo que necesitas, agrégalo al carrito y confirma. Te escribiremos por WhatsApp para coordinar los detalles.</p>
<h3>¿Hacen entregas a domicilio?</h3>
<p>Sí, en las zonas que mostramos al confirmar tu pedido. También puedes retirarlo en nuestro local.</p>
<h3>¿Qué formas de pago aceptan?</h3>
<p>Aceptamos efectivo y transferencia. Si necesitas otra forma de pago, consúltanos antes de confirmar.</p>
<h3>¿Puedo cambiar mi pedido?</h3>
<p>Sí, mientras no lo hayamos empezado a preparar. Escríbenos lo antes posible.</p>`,
  },

  // ── Dental ──────────────────────────────────────────────────────────
  {
    key: 'primera-visita-dental',
    title: 'Tu primera visita',
    description: 'Qué esperar en la primera consulta y qué traer.',
    kinds: ['dental'],
    posicion: 'top',
    buttonText: 'Agendar valoración',
    buttonUrl: '/servicios',
    html: `<p>Sabemos que ir al dentista puede generar nervios. Por eso en tu primera cita vamos con calma y te explicamos cada paso.</p>
<h3>Cómo es la consulta</h3>
<ol>
<li><strong>Conversamos.</strong> Nos cuentas qué te preocupa y revisamos tu historia médica.</li>
<li><strong>Revisión completa.</strong> Evaluamos dientes, encías y mordida; si hace falta, tomamos radiografías.</li>
<li><strong>Plan claro.</strong> Te explicamos las opciones de tratamiento, tiempos y costos antes de empezar.</li>
</ol>
<h3>Qué traer</h3>
<ul>
<li>Tu cédula.</li>
<li>La lista de medicamentos que tomas.</li>
<li>Radiografías o exámenes recientes, si los tienes.</li>
</ul>
<p>Llega 10 minutos antes para completar tu ficha con tranquilidad.</p>`,
  },
  {
    key: 'cuidados-dentales',
    title: 'Cuidados después de tu tratamiento',
    description: 'Recomendaciones para después de limpiezas, extracciones y blanqueamientos.',
    kinds: ['dental'],
    posicion: 'bottom',
    buttonText: 'Consultar al doctor',
    buttonUrl: '',
    html: `<p>Estas recomendaciones generales te ayudan a recuperarte mejor. Si tu doctor te dio indicaciones distintas, sigue siempre las de tu doctor.</p>
<h3>Después de una extracción</h3>
<ul>
<li>Muerde la gasa durante 30 a 45 minutos.</li>
<li>No escupas, no fumes y no uses sorbete durante las primeras 24 horas.</li>
<li>Come alimentos blandos y fríos el primer día.</li>
</ul>
<h3>Después de un blanqueamiento</h3>
<ul>
<li>Evita café, té, vino tinto y salsas oscuras durante 48 horas.</li>
<li>Es normal sentir algo de sensibilidad los primeros días.</li>
</ul>
<h3>Todos los días</h3>
<ul>
<li>Cepíllate tres veces al día y usa hilo dental por la noche.</li>
<li>Visítanos para control y limpieza cada seis meses.</li>
</ul>
<p>Si notas sangrado que no se detiene, fiebre o dolor fuerte, escríbenos de inmediato.</p>`,
  },

  // ── Spa / estética ──────────────────────────────────────────────────
  {
    key: 'antes-de-tu-visita-spa',
    title: 'Antes de tu visita',
    description: 'Cómo prepararte para disfrutar al máximo tu tratamiento.',
    kinds: ['spa'],
    posicion: 'top',
    buttonText: 'Reservar mi tratamiento',
    buttonUrl: '/servicios',
    html: `<p>Queremos que tu visita a {negocio} sea un momento solo para ti. Estos detalles ayudan a que todo salga perfecto:</p>
<ul>
<li><strong>Llega 10 minutos antes</strong> para relajarte y conversar sobre lo que buscas.</li>
<li><strong>Cuéntanos sobre tu salud:</strong> embarazo, alergias, lesiones o tratamientos recientes.</li>
<li><strong>Evita comidas pesadas</strong> una hora antes de un masaje.</li>
<li><strong>Para faciales</strong>, ven sin maquillaje si es posible.</li>
<li><strong>Deja el celular en silencio</strong> y date permiso de desconectarte.</li>
</ul>
<h3>Después del tratamiento</h3>
<p>Bebe abundante agua, evita el sol directo y el ejercicio intenso durante el resto del día. Si tienes dudas, escríbenos.</p>`,
  },

  // ── Barbería ────────────────────────────────────────────────────────
  {
    key: 'cuidado-barba',
    title: 'Cuida tu corte y tu barba en casa',
    description: 'Consejos para que el corte dure más y la barba se vea bien.',
    kinds: ['barberia'],
    posicion: 'bottom',
    buttonText: 'Reservar mi turno',
    buttonUrl: '/servicios',
    html: `<h3>Tu corte</h3>
<ul>
<li>Lava el cabello con agua tibia, no caliente, para no resecarlo.</li>
<li>Usa poca cantidad de producto: es más fácil añadir que quitar.</li>
<li>Vuelve cada 3 a 4 semanas para mantener la forma.</li>
</ul>
<h3>Tu barba</h3>
<ul>
<li>Lávala con un jabón suave dos o tres veces por semana.</li>
<li>Aplica aceite o bálsamo con la barba aún húmeda.</li>
<li>Peina siempre en la dirección del crecimiento.</li>
<li>Recorta solo el contorno en casa y deja la forma a tu barbero.</li>
</ul>`,
  },

  // ── Gimnasio ────────────────────────────────────────────────────────
  {
    key: 'tu-primer-dia-gym',
    title: 'Tu primer día',
    description: 'Qué traer, cómo empezar y a quién pedir ayuda.',
    kinds: ['gym'],
    posicion: 'top',
    buttonText: 'Ver planes',
    buttonUrl: '/',
    html: `<p>Empezar es la parte más difícil, y ya diste el paso. En {negocio} te acompañamos desde el primer día.</p>
<h3>Qué traer</h3>
<ul>
<li>Ropa cómoda y zapatos deportivos.</li>
<li>Toalla y botella de agua.</li>
<li>Candado si quieres usar los casilleros.</li>
</ul>
<h3>Cómo empezar</h3>
<ol>
<li>Preséntate en recepción para registrar tu ingreso.</li>
<li>Pide a un entrenador que te muestre las áreas y las máquinas.</li>
<li>Empieza suave: la constancia vale más que la intensidad.</li>
</ol>`,
  },
  {
    key: 'reglamento-gym',
    title: 'Reglamento del gimnasio',
    description: 'Normas de convivencia para entrenar cómodos y seguros.',
    kinds: ['gym'],
    posicion: 'bottom',
    html: `<ul>
<li>Usa toalla en las máquinas y límpialas al terminar.</li>
<li>Devuelve pesas y discos a su lugar.</li>
<li>Comparte los equipos en horas de alta afluencia.</li>
<li>Usa ropa y calzado deportivo en todo momento.</li>
<li>Respeta a los demás: sin gritos ni música sin audífonos.</li>
<li>Si no sabes usar una máquina, pide ayuda a un entrenador.</li>
</ul>`,
  },

  // ── Canchas ─────────────────────────────────────────────────────────
  {
    key: 'reglamento-canchas',
    title: 'Reglamento de canchas',
    description: 'Normas de uso, horarios y cuidado de las instalaciones.',
    kinds: ['canchas'],
    posicion: 'bottom',
    buttonText: 'Reservar cancha',
    buttonUrl: '/',
    html: `<ul>
<li>Llega 10 minutos antes: el tiempo reservado empieza a la hora acordada.</li>
<li>Usa calzado adecuado para el tipo de cancha.</li>
<li>No se permiten bebidas alcohólicas, vidrio ni fumar dentro de la cancha.</li>
<li>Deja la cancha limpia para el siguiente grupo.</li>
<li>Los daños causados a las instalaciones serán cobrados al responsable de la reserva.</li>
</ul>
<h3>Lluvia y cancelaciones</h3>
<p>Si necesitas cambiar tu horario, avísanos con anticipación para reprogramarte sin problema.</p>`,
  },
  {
    key: 'grupos-eventos-canchas',
    title: 'Torneos y eventos',
    description: 'Reservas para empresas, cumpleaños y campeonatos.',
    kinds: ['canchas'],
    posicion: 'top',
    buttonText: 'Cotizar mi evento',
    buttonUrl: '',
    html: `<p>¿Organizas un campeonato, un partido de empresa o un cumpleaños? En {negocio} te ayudamos a armarlo.</p>
<ul>
<li>Reserva de varias horas o canchas a la vez.</li>
<li>Horarios fijos semanales para tu equipo.</li>
<li>Apoyo para organizar el fixture y los resultados.</li>
</ul>
<p>Escríbenos con la fecha, el número de equipos y lo que tienes en mente, y te enviamos una propuesta.</p>`,
  },

  // ── Restaurante / cafetería ─────────────────────────────────────────
  {
    key: 'nuestra-cocina',
    title: 'Nuestra cocina',
    description: 'La historia detrás de tus platos favoritos.',
    kinds: ['restaurante'],
    posicion: 'bottom',
    buttonText: 'Ver el menú',
    buttonUrl: '/',
    html: `<p>En {negocio} cocinamos como nos gusta comer: con ingredientes frescos, recetas que cuidamos y porciones generosas.</p>
<h3>Lo que nos define</h3>
<ul>
<li>Compramos a proveedores locales siempre que podemos.</li>
<li>Preparamos al momento: nada de platos recalentados.</li>
<li>Escuchamos tus comentarios para mejorar cada día.</li>
</ul>
<p>Si tienes alguna alergia o preferencia, dínoslo al hacer tu pedido y adaptamos tu plato.</p>`,
  },
  {
    key: 'eventos-restaurante',
    title: 'Eventos y grupos',
    description: 'Cumpleaños, reuniones de trabajo y pedidos grandes.',
    kinds: ['restaurante'],
    posicion: 'bottom',
    buttonText: 'Cotizar mi evento',
    buttonUrl: '',
    html: `<p>Celebra con nosotros. Preparamos menús especiales para grupos y pedidos grandes para tu oficina o tu casa.</p>
<ul>
<li>Reserva de mesas para grupos.</li>
<li>Menús cerrados con precio por persona.</li>
<li>Pedidos para llevar con anticipación.</li>
</ul>
<p>Escríbenos con la fecha y el número de personas, y te ayudamos a organizarlo.</p>`,
  },

  // ── Tienda ──────────────────────────────────────────────────────────
  {
    key: 'envios',
    title: 'Envíos y entregas',
    description: 'Zonas, tiempos y costos de entrega.',
    kinds: ['tienda'],
    posicion: 'bottom',
    buttonText: 'Ir a la tienda',
    buttonUrl: '/',
    html: `<h3>¿Cómo funciona?</h3>
<ol>
<li>Haz tu pedido en la tienda en línea.</li>
<li>Te confirmamos por WhatsApp el total y el tiempo de entrega.</li>
<li>Recibes tu pedido en la dirección que indiques o lo retiras en el local.</li>
</ol>
<h3>Tiempos de entrega</h3>
<p>Los pedidos confirmados antes del mediodía suelen salir el mismo día. El costo del envío depende de tu zona y se muestra antes de pagar.</p>`,
  },
  {
    key: 'cambios-devoluciones',
    title: 'Cambios y devoluciones',
    description: 'Qué hacer si un producto no es lo que esperabas.',
    kinds: ['tienda'],
    posicion: 'bottom',
    buttonText: 'Solicitar un cambio',
    buttonUrl: '',
    html: `<p>Queremos que estés feliz con tu compra. Si algo no salió bien, lo resolvemos.</p>
<ul>
<li>Tienes 7 días desde que recibes tu pedido para pedir un cambio.</li>
<li>El producto debe estar sin uso, con etiquetas y en su empaque original.</li>
<li>Si el producto llegó con fallas, el cambio no tiene costo.</li>
</ul>
<p>Escríbenos con tu número de pedido y una foto del producto para empezar.</p>`,
  },

  // ── Lavandería / cuidado de calzado ─────────────────────────────────
  {
    key: 'como-cuidamos',
    title: 'Cómo cuidamos tus prendas',
    description: 'Nuestro proceso paso a paso.',
    kinds: ['lavanderia'],
    posicion: 'top',
    buttonText: 'Solicitar servicio',
    buttonUrl: '',
    html: `<ol>
<li><strong>Revisión.</strong> Revisamos cada prenda o par y anotamos manchas, daños y detalles.</li>
<li><strong>Tratamiento.</strong> Elegimos el producto y el método según el material.</li>
<li><strong>Secado y acabado.</strong> Secamos con cuidado y damos el acabado final.</li>
<li><strong>Entrega.</strong> Te avisamos cuando esté listo para retirar o enviarte.</li>
</ol>
<p>Si una mancha no sale por completo, te lo contamos antes de entregar.</p>`,
  },
];

/** Deduce el tipo de negocio a partir de sus datos (tipo, rubro, nombre o slug). */
export function detectPageKind(negocio: any): PageKind {
  const cfg = (negocio?.configuracion && typeof negocio.configuracion === 'object') ? negocio.configuracion : {};
  const hay = [
    negocio?.tipoNegocio, cfg?.tipoNegocio, cfg?.rubro, negocio?.rubro, negocio?.categoria,
    negocio?.BusinessType?.name, negocio?.BusinessType?.nombre, negocio?.BusinessType?.slug,
    negocio?.slug, negocio?.nombre,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/dental|dentist|odonto/.test(hay)) return 'dental';
  if (/sports_courts|cancha|futbol|fútbol|padel|pádel/.test(hay)) return 'canchas';
  if (/gym|gimnas|fitness|crossfit/.test(hay)) return 'gym';
  if (/barber/.test(hay)) return 'barberia';
  if (/shoe_care|lavand|laundry|tintorer/.test(hay)) return 'lavanderia';
  if (/restaur|cafeter|cafe|café|comida|food|pizz|parrill/.test(hay)) return 'restaurante';
  if (/store|tienda|shop|boutique/.test(hay)) return 'tienda';
  if (/spa|estetic|estétic|salon|salón|belleza|nails|uñas|masaj|pelu/.test(hay)) return 'spa';
  return 'general';
}

export function templatesFor(kind: PageKind) {
  const specific = ALL.filter((t) => t.kinds !== 'all' && t.kinds.includes(kind));
  const common = ALL.filter((t) => t.kinds === 'all');
  return [...specific, ...common];
}

export function getPageTemplate(key: string) {
  return ALL.find((t) => t.key === key);
}

export function fillTemplate(text: string, vars: { negocio?: string }) {
  const name = ((vars.negocio || '').trim() || 'nosotros')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return text.replace(/\{negocio\}/g, name);
}
