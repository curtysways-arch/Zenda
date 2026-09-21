export const DEFAULT_CONFIGS_GENERAL = {
    CONFIRMATION_MSG: '✅ ¡Hola {{nombre}}! Tu cita en *{{negocio}}* ha sido *CONFIRMADA*. 💆\n\n✨ *Servicio:* {{servicio}}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n\n📲 *Consulta los detalles aquí:*\n{{link_reserva}}\n\n¡Te esperamos!',
    PENDING_MSG: '👋 ¡Hola {{nombre}}! Hemos recibido tu solicitud de cita en *{{negocio}}* para el {{fecha}} a las {{hora}}.\n\n⏳ *Estado:* Pendiente de confirmación.\n\n📲 *Contacto directo:* \nhttps://wa.me/{{telefono_negocio}}\n\nTe notificaremos por aquí lo antes posible.',
    REMINDER_MSG: '⏰ Recordatorio: Tienes una cita hoy en *{{negocio}}* a las {{hora}}. ¡Te esperamos! 💆',
    BOOKING_TIMEOUT: '10',
    REMINDER_DAY_ENABLED: '1',
    REMINDER_DAY_TIME: '08:00',
    REMINDER_DAY_MSG: '☀️ ¡Buen día {{nombre}}! Te recordamos que hoy tienes una cita en *{{negocio}}* a las {{hora}}. ¡Te esperamos!',
    REMINDER_2H_ENABLED: '1',
    REMINDER_2H_MSG: '⏰ ¡Hola {{nombre}}! En 2 horas es tu cita en *{{negocio}}*. ¡Nos vemos pronto!'
};

export const DEFAULT_CONFIGS_GYM = {
    CONFIRMATION_MSG: '✅ ¡Hola {{nombre}}! Tu membresía en *{{negocio}}* ha sido *ACTIVADA* con éxito. 🏋️\n\n✨ *Plan:* {{servicio}}\n📅 *Vigencia hasta:* {{fecha}}\n\n📲 *Consulta tu carnet QR de acceso y estado aquí:*\n{{link_reserva}}\n\n¡A darlo todo en el entrenamiento! 💪🔥',
    PENDING_MSG: '👋 ¡Hola {{nombre}}! Bienvenido/a a *{{negocio}}*. Tu registro como socio ha sido completado con éxito. 🏋️‍♂️💪\n\nPuedes ingresar a tus entrenamientos presentando tu código QR en recepción o escaneando el código de entrada.\n\n📲 *Accede a tu cuenta y pase digital:*\n{{link_reserva}}\n\n¡Nos vemos en el box!',
    REMINDER_MSG: '⏰ Recordatorio: Tienes entrenamiento / clase programada hoy en *{{negocio}}* a las {{hora}}. ¡A darlo todo! 🏋️',
    BOOKING_TIMEOUT: '0',
    REMINDER_DAY_ENABLED: '1',
    REMINDER_DAY_TIME: '08:00',
    REMINDER_DAY_MSG: '☀️ ¡Buen día {{nombre}}! Te recordamos tu entrenamiento/clase programada hoy en *{{negocio}}* a las {{hora}}. ¡Te esperamos listos para entrenar! 🏋️‍♂️',
    REMINDER_2H_ENABLED: '1',
    REMINDER_2H_MSG: '⏰ ¡Hola {{nombre}}! En 2 horas inicia tu clase / sesión en *{{negocio}}*. ¡Nos vemos en el gimnasio! 💪'
};

export const DEFAULT_CONFIGS_DENTAL = {
    CONFIRMATION_MSG: '✅ ¡Hola {{nombre}}! Tu cita odontológica en *{{negocio}}* ha sido *CONFIRMADA*. 🦷\n\n✨ *Tratamiento:* {{servicio}}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n\n📲 *Consulta los detalles aquí:*\n{{link_reserva}}\n\n¡Cuidamos tu sonrisa!',
    PENDING_MSG: '👋 ¡Hola {{nombre}}! Hemos recibido tu solicitud de consulta en *{{negocio}}* para el {{fecha}} a las {{hora}}.\n\n⏳ *Estado:* Pendiente de confirmación clínica.\n\n📲 *Contacto directo:* \nhttps://wa.me/{{telefono_negocio}}\n\nTe notificaremos por aquí lo antes posible. 🦷',
    REMINDER_MSG: '⏰ Recordatorio: Tienes consulta odontológica hoy en *{{negocio}}* a las {{hora}}. ¡Te esperamos! 🦷',
    BOOKING_TIMEOUT: '15',
    REMINDER_DAY_ENABLED: '1',
    REMINDER_DAY_TIME: '08:00',
    REMINDER_DAY_MSG: '☀️ ¡Buen día {{nombre}}! Te recordamos que hoy tienes tu consulta odontológica en *{{negocio}}* a las {{hora}}. Por favor llegar 5 min antes. 🦷',
    REMINDER_2H_ENABLED: '1',
    REMINDER_2H_MSG: '⏰ ¡Hola {{nombre}}! En 2 horas es tu cita odontológica en *{{negocio}}*. ¡Te esperamos! 🦷'
};

export const DEFAULT_CONFIGS = DEFAULT_CONFIGS_GENERAL;

export function getDefaultConfigs(tipo?: string) {
    const t = (tipo || '').toUpperCase().trim();
    if (t === 'GYM' || t === 'GIMNASIO' || t === 'FITNESS') return DEFAULT_CONFIGS_GYM;
    if (t === 'DENTAL' || t === 'ODONTOLOGIA' || t === 'DENTISTA') return DEFAULT_CONFIGS_DENTAL;
    return DEFAULT_CONFIGS_GENERAL;
}
