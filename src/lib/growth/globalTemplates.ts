export interface QuestTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  difficulty: 'FACIL' | 'MEDIA' | 'DIFICIL';
  benefits: string;
  estImprovement: number; // Porcentaje promedio de mejora
  triggerEvent: string;
  cantidadMeta: number;
  validacionTipo: 'AUTOMATICO' | 'USUARIO' | 'ADMIN';
  servicioId?: string | null;
  montoMinimo?: number | null;
  condicionesExtra?: any;
  acciones: any[];
}

export const GLOBAL_QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'tpl-primera-cita',
    nombre: 'Primera Cita de Bienvenida',
    descripcion: 'Incentiva a que los nuevos clientes completen su primer servicio.',
    icono: 'Sparkles',
    color: '#3b82f6', // azul
    difficulty: 'FACIL',
    benefits: 'Aumenta un 25% la tasa de conversión de nuevos clientes.',
    estImprovement: 25.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 50 },
      { action: 'SEND_PUSH', value: { title: '🎉 ¡Bienvenido a Citiox!', body: 'Has ganado tus primeros 50 puntos por completar tu primera cita.' } }
    ]
  },
  {
    id: 'tpl-cliente-frecuente',
    nombre: 'Cliente Frecuente (3 reservas)',
    descripcion: 'Fideliza a tus clientes premiándolos al completar 3 reservas.',
    icono: 'CalendarRange',
    color: '#8b5cf6', // violeta
    difficulty: 'MEDIA',
    benefits: 'Mejora la retención mensual de clientes en un 30%.',
    estImprovement: 30.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 150 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 15 } }
    ]
  },
  {
    id: 'tpl-cliente-vip',
    nombre: 'Embajador VIP (10 reservas)',
    descripcion: 'Premia a tus clientes más fieles al completar 10 reservas.',
    icono: 'Crown',
    color: '#f59e0b', // dorado
    difficulty: 'DIFICIL',
    benefits: 'Genera defensores de marca y aumenta el ticket promedio.',
    estImprovement: 35.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 10,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 500 },
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 20 } },
      { action: 'UP_LEVEL', value: 200 }
    ]
  },
  {
    id: 'tpl-happy-hour',
    nombre: 'Reserva en Happy Hour (Lunes-Miércoles)',
    descripcion: 'Impulsa las reservas de servicios en horarios de baja demanda.',
    icono: 'Clock',
    color: '#10b981', // esmeralda
    difficulty: 'MEDIA',
    benefits: 'Aumenta un 18% la ocupación de horas muertas en días laborables.',
    estImprovement: 18.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    condicionesExtra: {
        logic: 'AND',
        rules: [
            { field: 'diaSemana', operator: 'IN', value: [1, 2, 3] }, // Lunes, Martes, Miércoles
            { field: 'horaInicio', operator: 'BETWEEN', value: ['10:00', '14:00'] }
        ]
    },
    acciones: [
      { action: 'ADD_POINTS', value: 100 }
    ]
  },
  {
    id: 'tpl-seguir-instagram',
    nombre: 'Seguir en Instagram',
    descripcion: 'Consigue más seguidores en tus redes sociales recompensando a tus clientes.',
    icono: 'Instagram',
    color: '#ec4899', // rosa
    difficulty: 'FACIL',
    benefits: 'Aumenta el alcance orgánico de tus redes en un 40%.',
    estImprovement: 40.0,
    triggerEvent: 'FOLLOW_SOCIAL',
    cantidadMeta: 1,
    validacionTipo: 'USUARIO',
    acciones: [
      { action: 'ADD_POINTS', value: 30 },
      { action: 'SEND_PUSH', value: { title: '📸 ¡Gracias por seguirnos!', body: 'Has recibido 30 puntos por seguir nuestro perfil en Instagram.' } }
    ]
  },
  {
    id: 'tpl-referir-amigos',
    nombre: 'Refiere 3 amigos',
    descripcion: 'Multiplica tu clientela haciendo que tus clientes actuales te recomienden.',
    icono: 'Users',
    color: '#06b6d4', // cian
    difficulty: 'MEDIA',
    benefits: 'Aumenta la captación de nuevos clientes en un 21% sin costo publicitario.',
    estImprovement: 21.0,
    triggerEvent: 'REFERRAL_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 25 } },
      { action: 'ADD_POINTS', value: 200 }
    ]
  },
  {
    id: 'tpl-cumpleanos',
    nombre: 'Regalo de Cumpleaños',
    descripcion: 'Envía automáticamente un cupón especial de regalo a tus clientes en su cumpleaños.',
    icono: 'Cake',
    color: '#f43f5e', // rose
    difficulty: 'FACIL',
    benefits: 'Fideliza y genera un impacto emocional positivo en tus clientes.',
    estImprovement: 15.0,
    triggerEvent: 'BIRTHDAY',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 10 } }
    ]
  },
  {
    id: 'tpl-vip-premium',
    nombre: 'Socio de Honor (15 Reservas)',
    descripcion: 'Consolida la máxima lealtad premiando a tus clientes estrella con un paquete VIP al llegar a 15 visitas.',
    icono: 'Crown',
    color: '#8b5cf6', // Violeta
    difficulty: 'DIFICIL',
    benefits: 'Asegura la retención a largo plazo y estimula a tus mejores clientes a seguir reservando.',
    estImprovement: 45.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 15,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 1000 },
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 30 } },
      { action: 'SEND_PUSH', value: { title: '👑 ¡Eres Socio de Honor!', body: 'Has alcanzado las 15 visitas. Te regalamos 1000 puntos y un cupón de $30 USD de descuento.' } }
    ]
  },
  {
    id: 'tpl-referir-premium',
    nombre: 'Recomendador Estrella (5 Amigos)',
    descripcion: 'Motiva a tus clientes a convertirse en embajadores activos de tu marca trayendo a 5 amigos nuevos.',
    icono: 'Users',
    color: '#ec4899', // Rosa
    difficulty: 'DIFICIL',
    benefits: 'Incrementa la captación orgánica de clientes nuevos con el mayor retorno de inversión.',
    estImprovement: 38.0,
    triggerEvent: 'REFERRAL_COMPLETED',
    cantidadMeta: 5,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 500 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 35 } },
      { action: 'SEND_PUSH', value: { title: '⭐ ¡Embajador Estrella!', body: '¡Cinco amigos tuyos se han registrado! Has ganado 500 puntos y un súper cupón del 35% de descuento.' } }
    ]
  },
  {
    id: 'tpl-autocuidado',
    nombre: 'Ritual de Autocuidado Mensual',
    descripcion: 'Fomenta la recurrencia periódica premiando a los clientes que completan 5 visitas en un mes.',
    icono: 'Zap',
    color: '#10b981', // Verde esmeralda
    difficulty: 'MEDIA',
    benefits: 'Estabiliza el flujo mensual de caja aumentando la frecuencia de las visitas.',
    estImprovement: 28.0,
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 5,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 300 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 20 } },
      { action: 'SEND_PUSH', value: { title: '💆‍♀️ ¡Tu Ritual de Bienestar!', body: 'Completaste tus 5 citas del mes. Tienes 300 nuevos puntos y 20% de descuento para tu siguiente reserva.' } }
    ]
  }
];
