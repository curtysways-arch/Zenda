'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Award, 
    Sparkles, 
    TrendingUp, 
    Users, 
    Plus, 
    CheckCircle2, 
    Zap,
    Download,
    Trophy,
    RefreshCw,
    Gift,
    History,
    Check,
    Trash2,
    Edit2,
    Loader2,
    Calendar,
    UserCheck,
    AlertCircle,
    PlusCircle,
    Copy,
    Trash,
    Coins,
    BarChart2,
    ArrowLeft,
    Save,
    Star,
    ShoppingBag,
    Cake,
    Share2,
    HelpCircle,
    Eye,
    EyeOff,
    Bot,
    Sparkle,
    ChevronRight,
    ChevronLeft,
    Sliders,
    X,
    MessageSquare,
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

interface ActionConfig {
    id: string;
    label: string;
    desc: string;
    icono: string;
    color: string;
    eventos: { id: string; label: string; defaultMeta?: number; type: 'SIMPLE' | 'ACUMULATIVO' }[];
}

const QUEST_ACTIONS_CATALOG: ActionConfig[] = [
    {
        id: 'RESERVAS',
        label: 'Reservas',
        desc: 'Premia a tus clientes por agendar y completar citas.',
        icono: 'Calendar',
        color: '#ec4899',
        eventos: [
            { id: 'BOOKING_CREATED', label: 'Reserva creada', type: 'SIMPLE' },
            { id: 'BOOKING_APPROVED', label: 'Reserva confirmada', type: 'SIMPLE' },
            { id: 'BOOKING_COMPLETED', label: 'Cita completada', type: 'ACUMULATIVO', defaultMeta: 5 },
            { id: 'FIRST_BOOKING', label: 'Primera cita completada', type: 'SIMPLE', defaultMeta: 1 },
            { id: 'MULTIPLE_BOOKINGS', label: 'Completar X citas', type: 'ACUMULATIVO', defaultMeta: 10 }
        ]
    },
    {
        id: 'REFERIDOS',
        label: 'Referidos',
        desc: 'Premia a tus clientes por invitar amigos al negocio.',
        icono: 'Users',
        color: '#3b82f6',
        eventos: [
            { id: 'REFERRAL_REGISTERED', label: 'Registró un amigo', type: 'SIMPLE' },
            { id: 'REFERRAL_VERIFIED', label: 'El amigo verificó su teléfono', type: 'SIMPLE' },
            { id: 'REFERRAL_FIRST_BOOKING', label: 'El amigo hizo su primera reserva', type: 'SIMPLE' },
            { id: 'REFERRAL_COMPLETED', label: 'El amigo completó su primera cita', type: 'SIMPLE' },
            { id: 'REFERRAL_X_APPOINTMENTS', label: 'El amigo completó X citas', type: 'ACUMULATIVO', defaultMeta: 3 }
        ]
    },
    {
        id: 'RESEÑAS',
        label: 'Reseñas',
        desc: 'Premia las opiniones de tus clientes sobre tu negocio.',
        icono: 'Star',
        color: '#eab308',
        eventos: [
            { id: 'REVIEW_CREATED', label: 'Dejó una reseña', type: 'SIMPLE' },
            { id: 'REVIEW_5_STARS', label: 'Calificó con 5 estrellas', type: 'SIMPLE' },
            { id: 'REVIEW_COMMENTED', label: 'Comentó una reseña', type: 'SIMPLE' }
        ]
    },
    {
        id: 'COMPRAS',
        label: 'Compras',
        desc: 'Premia por la adquisición de productos o cursos.',
        icono: 'ShoppingBag',
        color: '#f43f5e',
        eventos: [
            { id: 'PURCHASE_COMPLETED', label: 'Compra realizada', type: 'SIMPLE' },
            { id: 'FIRST_PURCHASE', label: 'Primera compra', type: 'SIMPLE' },
            { id: 'PURCHASE_OVER_AMOUNT', label: 'Compra superior a un monto', type: 'SIMPLE' },
            { id: 'PURCHASE_SPECIFIC_PRODUCT', label: 'Compró producto o curso específico', type: 'SIMPLE' }
        ]
    },
    {
        id: 'PERFIL',
        label: 'Perfil',
        desc: 'Motiva a que tus clientes completen sus datos de registro.',
        icono: 'UserCheck',
        color: '#06b6d4',
        eventos: [
            { id: 'PROFILE_COMPLETED', label: 'Completar perfil completo', type: 'SIMPLE' },
            { id: 'WHATSAPP_VERIFIED', label: 'Verificar número de WhatsApp', type: 'SIMPLE' },
            { id: 'EMAIL_VERIFIED', label: 'Verificar correo electrónico', type: 'SIMPLE' },
            { id: 'AVATAR_UPLOADED', label: 'Subir foto de perfil', type: 'SIMPLE' },
            { id: 'TERMS_ACCEPTED', label: 'Aceptar términos y condiciones', type: 'SIMPLE' }
        ]
    },
    {
        id: 'CUMPLEAÑOS',
        label: 'Cumpleaños',
        desc: 'Premia a tus clientes en su mes o fecha de cumpleaños.',
        icono: 'Cake',
        color: '#10b981',
        eventos: [
            { id: 'CUMPLEANOS', label: 'Día del cumpleaños', type: 'SIMPLE' },
            { id: 'CUMPLEANOS_WEEK', label: 'Semana del cumpleaños', type: 'SIMPLE' },
            { id: 'CUMPLEANOS_MONTH', label: 'Mes del cumpleaños', type: 'SIMPLE' }
        ]
    },
    {
        id: 'SOCIAL',
        label: 'Redes Sociales',
        desc: 'Premia por compartir o seguir en redes sociales.',
        icono: 'Share2',
        color: '#8b5cf6',
        eventos: [
            { id: 'INSTAGRAM_FOLLOW', label: 'Seguir Instagram', type: 'SIMPLE' },
            { id: 'FACEBOOK_FOLLOW', label: 'Seguir Facebook', type: 'SIMPLE' },
            { id: 'POST_SHARE', label: 'Compartir publicación', type: 'SIMPLE' },
            { id: 'POST_LIKE', label: 'Dar Like', type: 'SIMPLE' },
            { id: 'WHATSAPP_JOIN', label: 'Unirse a WhatsApp', type: 'SIMPLE' },
            { id: 'VIDEO_WATCH', label: 'Ver video', type: 'SIMPLE' },
            { id: 'LINK_SHARE', label: 'Compartir enlace', type: 'SIMPLE' }
        ]
    },
    {
        id: 'PERSONALIZADA',
        label: 'Personalizada',
        desc: 'Escribe tus propios detonadores y reglas.',
        icono: 'Sparkles',
        color: '#64748b',
        eventos: []
    }
];

export default function QuestDashboard() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'quests' | 'templates' | 'participants' | 'rewards' | 'points' | 'coupons' | 'stats' | 'history'>('dashboard');
    const [primaryColor, setPrimaryColor] = useState('#ec4899');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Estados de Datos
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [participantsProgress, setParticipantsProgress] = useState<any[]>([]);
    const [participantsHistory, setParticipantsHistory] = useState<any[]>([]);
    const [rewardsList, setRewardsList] = useState<any[]>([]);
    const [loyaltyRewards, setLoyaltyRewards] = useState<any[]>([]);
    const [pointsRankings, setPointsRankings] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        totalParticipantes: 0,
        enProgreso: 0,
        completadas: 0,
        roiEstimado: 0,
        reservasGeneradas: 0,
        puntosEntregados: 0,
        cuponesUsados: 0,
        referidosValidos: 0
    });
    const [usersList, setUsersList] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Modales y Control de Vistas
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [isCatalogRewardModalOpen, setIsCatalogRewardModalOpen] = useState(false);
    const [isPointsAdjustmentModalOpen, setIsPointsAdjustmentModalOpen] = useState(false);
    const [canjeStaffId, setCanjeStaffId] = useState('');
    const [canjeNotas, setCanjeNotas] = useState('');
    const [selectedRewardToCanje, setSelectedRewardToCanje] = useState<any>(null);

    // Asistente Wizard Form Data
    const [wizardData, setWizardData] = useState<any>({
        categoria: 'RESERVAS', // RESERVAS | REFERIDOS | RESEÑAS | COMPRAS | PERFIL | CUMPLEANOS | SOCIAL | PERSONALIZADA
        triggerEvent: 'BOOKING_COMPLETED',
        nombre: '',
        descripcion: '',
        color: '#ec4899',
        icono: 'Calendar',
        progresoTipo: 'SIMPLE', // SIMPLE | ACUMULATIVO
        cantidadMeta: 1,
        condiciones: [], // lista de condiciones dinámicas: { field, operator, value }
        
        // Recompensas combinables
        recompensasSeleccionadas: {
            puntos: false,
            cupon: false,
            productoGratis: false,
            servicioGratis: false,
            cashback: false,
            badge: false,
            whatsapp: false,
            push: false,
            email: false
        },
        puntosRecompensa: 100,
        cuponNombre: '',
        cuponValor: 20,
        cuponTipo: 'PORCENTAJE', // PORCENTAJE | FIJO
        cuponVencimiento: 30, // en días
        productoGratisNombre: '',
        servicioGratisNombre: '',
        cashbackMonto: 10,
        badgeId: '',
        whatsappMensaje: '¡Hola {{nombre}}! Has completado tu reto y ganaste una recompensa. 🎁',
        pushTitulo: '🏆 Misión Completada',
        pushCuerpo: '¡Felicidades! Completaste la misión y obtuviste tus premios.',
        emailAsunto: '🎉 Recompensa ganada',
        emailCuerpo: 'Hola {{nombre}}, completaste la misión y obtuviste tus premios.',
        
        // Validación
        validacionTipo: 'AUTOMATICO', // AUTOMATICO | USUARIO | ADMIN
        
        // Configuración y Segmentación
        dificultad: 'NORMAL', // FACIL | NORMAL | DIFICIL
        prioridad: 'NORMAL', // DESTACADA | ALTA | NORMAL | BAJA
        estado: 'ACTIVA', // BORRADOR | ACTIVA | PAUSADA | FINALIZADA
        fechaInicio: '',
        fechaFin: '',
        visible: true,
        repetible: false,
        limiteUsuario: 1,
        limiteGlobal: '', // cantidad máxima total (null o número)
        parentQuestId: ''
    });

    // Nuevo estado para la IA y sugerencias
    const [iaInputText, setIaInputText] = useState('');
    const [isIaProcessing, setIsIaProcessing] = useState(false);
    const [iaSugerencia, setIaSugerencia] = useState<string | null>(null);
    const [isIaGamificationAnimating, setIsIaGamificationAnimating] = useState(false);
    const [servicesList, setServicesList] = useState<any[]>([]);
    const [newCondition, setNewCondition] = useState({ field: 'servicioId', operator: 'equals', value: '' });
    const [editingQuestId, setEditingQuestId] = useState<string | null>(null);

    // Formulario de Cupones Directos
    const [couponFormData, setCouponFormData] = useState({
        codigo: '',
        tipo: 'PORCENTAJE',
        valor: 10,
        descripcion: '',
        maxUsos: '',
        fechaFin: ''
    });

    const [catalogRewardFormData, setCatalogRewardFormData] = useState({
        nombre: '',
        descripcion: '',
        costoPuntos: 500,
        tipo: 'SERVICIO_GRATIS',
        valor: '',
        cantidadTotal: '',
        imagenUrl: ''
    });

    // Formulario de Ajuste Manual de Puntos
    const [pointsFormData, setPointsFormData] = useState({
        userId: '',
        puntos: 100,
        concepto: 'BONO',
        notas: ''
    });

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                misionesRes,
                templatesRes,
                participantsRes,
                rewardsRes,
                loyaltyRewardsRes,
                pointsRes,
                couponsRes,
                usuariosRes,
                staffRes,
                servicesRes
            ] = await Promise.all([
                fetch('/api/admin/misiones').then(res => res.json()),
                fetch('/api/admin/misiones/templates').then(res => res.json()),
                fetch('/api/admin/misiones/participants').then(res => res.json()).catch(() => ({ progress: [], history: [] })),
                fetch('/api/admin/referrals/rewards').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/rewards').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/points').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/coupons').then(res => res.json()).catch(() => []),
                fetch('/api/admin/usuarios').then(res => res.json()).catch(() => []),
                fetch('/api/admin/roles').then(res => res.json()).catch(() => ({ staff: [] })),
                fetch('/api/services').then(res => res.json()).catch(() => [])
            ]);

            // Consolidar Campañas
            if (misionesRes.success) {
                setCampaigns(misionesRes.campaigns || []);
                
                // Mapear estadísticas
                const questIds = (misionesRes.campaigns || []).flatMap((c: any) => c.Quests.map((q: any) => q.id));
                const totalMisionesCompletadas = misionesRes.stats?.completadas || 0;
                const totalClientes = misionesRes.stats?.totalParticipantes || 0;

                setStats({
                    totalParticipantes: totalClientes,
                    enProgreso: misionesRes.stats?.enProgreso || 0,
                    completadas: totalMisionesCompletadas,
                    roiEstimado: totalMisionesCompletadas > 0 ? (totalMisionesCompletadas * 12.5).toFixed(1) : 28.5,
                    reservasGeneradas: totalMisionesCompletadas,
                    puntosEntregados: totalMisionesCompletadas * 120, // representativo
                    cuponesUsados: couponsRes?.filter((c: any) => c.usosActuales > 0).length || 0,
                    referidosValidos: rewardsRes?.filter((r: any) => r.tipoOrigen === 'REFERIDO').length || 0
                });
            }

            if (templatesRes.success) {
                setTemplates(templatesRes.templates || []);
            }

            setParticipantsProgress(participantsRes.progress || []);
            setParticipantsHistory(participantsRes.history || []);
            setRewardsList(rewardsRes || []);
            setLoyaltyRewards(loyaltyRewardsRes || []);
            setPointsRankings(pointsRes || []);
            setCoupons(couponsRes || []);
            setUsersList(usuariosRes || []);
            setStaffList(staffRes.staff || staffRes || []);
            setServicesList(servicesRes || []);

        } catch (error) {
            console.error('Error al cargar datos del Growth Engine:', error);
            showToast('Error al cargar datos del sistema', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
        fetchData();
    }, []);

    // ─── LOCAL TEMPLATES (PLANTILLAS RECOMENDADAS) ───────────────────────────
    const LOCAL_TEMPLATES = [
        {
            id: 'tpl_reserva_5',
            nombre: 'Cita Completa',
            descripcion: 'Completa 5 citas en nuestro Spa y obtén 150 puntos y un cupón del 10%.',
            categoria: 'RESERVAS',
            triggerEvent: 'BOOKING_COMPLETED',
            cantidadMeta: 5,
            icono: 'Calendar',
            color: '#ec4899',
            progresoTipo: 'ACUMULATIVO',
            recompensasSeleccionadas: { puntos: true, cupon: true },
            puntosRecompensa: 150,
            cuponNombre: 'Descuento 10% Completa Citas',
            cuponValor: 10,
            cuponTipo: 'PORCENTAJE',
            cuponVencimiento: 30,
            estado: 'ACTIVA',
            dificultad: 'NORMAL',
            prioridad: 'NORMAL',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        },
        {
            id: 'tpl_referido_3',
            nombre: 'Trae un Amigo',
            descripcion: 'Refiere a 3 amigos y gana un servicio de Masaje Express gratis.',
            categoria: 'REFERIDOS',
            triggerEvent: 'REFERRAL_COMPLETED',
            cantidadMeta: 3,
            icono: 'Users',
            color: '#3b82f6',
            progresoTipo: 'ACUMULATIVO',
            recompensasSeleccionadas: { servicioGratis: true },
            servicioGratisNombre: 'Masaje Express gratis',
            estado: 'ACTIVA',
            dificultad: 'DIFICIL',
            prioridad: 'ALTA',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        },
        {
            id: 'tpl_reseña',
            nombre: 'Tu Opinión Vale Oro',
            descripcion: 'Déjanos una reseña sobre tu experiencia en el Spa y obtén 100 puntos.',
            categoria: 'RESEÑAS',
            triggerEvent: 'REVIEW_CREATED',
            cantidadMeta: 1,
            icono: 'Star',
            color: '#eab308',
            progresoTipo: 'SIMPLE',
            recompensasSeleccionadas: { puntos: true },
            puntosRecompensa: 100,
            estado: 'ACTIVA',
            dificultad: 'FACIL',
            prioridad: 'NORMAL',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        },
        {
            id: 'tpl_perfil',
            nombre: 'Completa tu Registro',
            descripcion: 'Completa todos tus datos de perfil para mejorar nuestro servicio y obtén 50 puntos.',
            categoria: 'PERFIL',
            triggerEvent: 'PROFILE_COMPLETED',
            cantidadMeta: 1,
            icono: 'UserCheck',
            color: '#06b6d4',
            progresoTipo: 'SIMPLE',
            recompensasSeleccionadas: { puntos: true },
            puntosRecompensa: 50,
            estado: 'ACTIVA',
            dificultad: 'FACIL',
            prioridad: 'BAJA',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        },
        {
            id: 'tpl_compras',
            nombre: 'Cliente Premium de Compras',
            descripcion: 'Realiza 3 compras de productos o cursos en el Spa y obtén $15 de saldo Cashback.',
            categoria: 'COMPRAS',
            triggerEvent: 'PURCHASE_COMPLETED',
            cantidadMeta: 3,
            icono: 'ShoppingBag',
            color: '#f43f5e',
            progresoTipo: 'ACUMULATIVO',
            recompensasSeleccionadas: { cashback: true },
            cashbackMonto: 15,
            estado: 'ACTIVA',
            dificultad: 'NORMAL',
            prioridad: 'NORMAL',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        },
        {
            id: 'tpl_cumple',
            nombre: 'Regalo de Cumpleaños VIP',
            descripcion: 'Recibe un cupón de 15% de descuento el mes de tu cumpleaños.',
            categoria: 'CUMPLEAÑOS',
            triggerEvent: 'CUMPLEANOS',
            cantidadMeta: 1,
            icono: 'Cake',
            color: '#10b981',
            progresoTipo: 'SIMPLE',
            recompensasSeleccionadas: { cupon: true },
            cuponNombre: 'Cupón Cumpleaños VIP',
            cuponValor: 15,
            cuponTipo: 'PORCENTAJE',
            cuponVencimiento: 30,
            estado: 'ACTIVA',
            dificultad: 'FACIL',
            prioridad: 'NORMAL',
            validacionTipo: 'AUTOMATICO',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones: []
        }
    ];

    // ─── NATURAL LANGUAGE PARSER LOCAL (IA) ──────────────────────────────────
    const parseMisionWithIA = (texto: string, services: any[]) => {
        const text = texto.toLowerCase();
        
        let categoria = 'RESERVAS';
        let triggerEvent = 'BOOKING_COMPLETED';
        let cantidadMeta = 1;
        let progresoTipo = 'SIMPLE';
        let color = '#ec4899';
        let icono = 'Calendar';
        let nombre = '';
        let descripcion = '';
        let conCupon = false;
        let cuponValor = 10;
        let cuponTipo = 'PORCENTAJE';
        let conPremioFisico = false;
        let premioFisicoNombre = '';
        
        const recompensasSeleccionadas: any = {
            puntos: false,
            cupon: false,
            productoGratis: false,
            servicioGratis: false,
            cashback: false,
            badge: false,
            whatsapp: false,
            push: false,
            email: false
        };
        
        let puntosRecompensa = 50;
        let cashbackMonto = 10;
        const condiciones: any[] = [];

        // 1. Detección de Categoría y Evento
        if (text.includes('reserva') || text.includes('cita') || text.includes('agenda') || text.includes('visita')) {
            categoria = 'RESERVAS';
            icono = 'Calendar';
            color = '#ec4899';
            if (text.includes('primera') || text.includes(' primer ')) {
                triggerEvent = 'FIRST_BOOKING';
                cantidadMeta = 1;
            } else {
                triggerEvent = 'BOOKING_COMPLETED';
            }
        } else if (text.includes('recomienda') || text.includes('invita') || text.includes('amigo') || text.includes('referido') || text.includes('trae')) {
            categoria = 'REFERIDOS';
            icono = 'Users';
            color = '#3b82f6';
            triggerEvent = 'REFERRAL_COMPLETED';
        } else if (text.includes('reseña') || text.includes('opinión') || text.includes('comentario') || text.includes('estrellas') || text.includes('califica')) {
            categoria = 'RESEÑAS';
            icono = 'Star';
            color = '#eab308';
            triggerEvent = 'REVIEW_CREATED';
        } else if (text.includes('perfil') || text.includes('registro') || text.includes('whatsapp') || text.includes('correo') || text.includes('datos')) {
            categoria = 'PERFIL';
            icono = 'UserCheck';
            color = '#06b6d4';
            triggerEvent = 'PROFILE_COMPLETED';
            if (text.includes('whatsapp')) {
                triggerEvent = 'WHATSAPP_VERIFIED';
            } else if (text.includes('correo') || text.includes('email')) {
                triggerEvent = 'EMAIL_VERIFIED';
            }
        } else if (text.includes('compra') || text.includes('adquiere') || text.includes('producto') || text.includes('curso')) {
            categoria = 'COMPRAS';
            icono = 'ShoppingBag';
            color = '#f43f5e';
            triggerEvent = 'PURCHASE_COMPLETED';
        } else if (text.includes('cumpleaños') || text.includes('cumple')) {
            categoria = 'CUMPLEAÑOS';
            icono = 'Cake';
            color = '#10b981';
            triggerEvent = 'CUMPLEANOS';
        } else if (text.includes('instagram') || text.includes('facebook') || text.includes('redes') || text.includes('comparte') || text.includes('social')) {
            categoria = 'SOCIAL';
            icono = 'Share2';
            color = '#8b5cf6';
            triggerEvent = 'INSTAGRAM_FOLLOW';
        } else {
            categoria = 'PERSONALIZADA';
            icono = 'Sparkles';
            color = '#64748b';
            triggerEvent = 'CUSTOM_EVENT';
        }

        // 2. Meta (número de veces)
        const metaRegex = /(\d+)\s*(citas|veces|amigos|compras|reseñas|visitas|masajes|servicios|productos)/;
        const matchMeta = text.match(metaRegex);
        if (matchMeta) {
            cantidadMeta = parseInt(matchMeta[1], 10);
            if (cantidadMeta > 1) {
                progresoTipo = 'ACUMULATIVO';
            }
        } else {
            const numRegex = /(?:completa|acumula|trae|invita|compra|hace)\s*(\d+)/;
            const matchNum = text.match(numRegex);
            if (matchNum) {
                cantidadMeta = parseInt(matchNum[1], 10);
                if (cantidadMeta > 1) {
                    progresoTipo = 'ACUMULATIVO';
                }
            }
        }

        // 3. Recompensas
        const puntosRegex = /(\d+)\s*puntos/;
        const matchPuntos = text.match(puntosRegex);
        if (matchPuntos) {
            puntosRecompensa = parseInt(matchPuntos[1], 10);
            recompensasSeleccionadas.puntos = true;
        } else if (text.includes('puntos')) {
            recompensasSeleccionadas.puntos = true;
            puntosRecompensa = 100;
        }

        const descuentoRegex = /(\d+)\s*%\s*(?:de\s*)?descuento/;
        const matchDescuento = text.match(descuentoRegex);
        if (matchDescuento) {
            recompensasSeleccionadas.cupon = true;
            cuponValor = parseInt(matchDescuento[1], 10);
            cuponTipo = 'PORCENTAJE';
            conCupon = true;
        } else {
            const fijoDescuentoRegex = /(?:descuento|cupón)\s*(?:de\s*)?\$?\s*(\d+)/;
            const matchFijo = text.match(fijoDescuentoRegex);
            if (matchFijo) {
                recompensasSeleccionadas.cupon = true;
                cuponValor = parseInt(matchFijo[1], 10);
                cuponTipo = 'FIJO';
                conCupon = true;
            } else if (text.includes('descuento') || text.includes('cupón')) {
                recompensasSeleccionadas.cupon = true;
                cuponValor = 15;
                cuponTipo = 'PORCENTAJE';
                conCupon = true;
            }
        }

        if (text.includes('gratis') || text.includes('regalo') || text.includes('obsequio')) {
            const regaloRegex = /(?:un|una)?\s*([a-zA-Z\s]+?)\s*(?:gratis|de regalo|de obsequio)/;
            const matchRegalo = text.match(regaloRegex);
            if (matchRegalo) {
                const nombrePremio = matchRegalo[1].trim();
                const serviceMatch = services.find(s => s.nombre.toLowerCase().includes(nombrePremio.toLowerCase()));
                if (serviceMatch) {
                    recompensasSeleccionadas.servicioGratis = true;
                    premioFisicoNombre = serviceMatch.nombre;
                } else {
                    recompensasSeleccionadas.productoGratis = true;
                    premioFisicoNombre = nombrePremio;
                }
                conPremioFisico = true;
            } else {
                recompensasSeleccionadas.productoGratis = true;
                premioFisicoNombre = 'Premio Sorpresa';
                conPremioFisico = true;
            }
        }

        const cashbackRegex = /(?:cashback|saldo)\s*(?:de\s*)?\$?\s*(\d+)/;
        const matchCashback = text.match(cashbackRegex);
        if (matchCashback) {
            recompensasSeleccionadas.cashback = true;
            cashbackMonto = parseInt(matchCashback[1], 10);
        } else if (text.includes('cashback') || text.includes('saldo')) {
            recompensasSeleccionadas.cashback = true;
            cashbackMonto = 5;
        }

        if (text.includes('whatsapp') || text.includes('mensaje')) {
            recompensasSeleccionadas.whatsapp = true;
        }
        if (text.includes('notificación') || text.includes('push') || text.includes('celular') || text.includes('pantalla')) {
            recompensasSeleccionadas.push = true;
        }
        if (text.includes('correo') || text.includes('email')) {
            recompensasSeleccionadas.email = true;
        }

        // 4. Condiciones Extra
        if (text.includes('vip')) {
            condiciones.push({ field: 'clienteVip', operator: 'equals', value: 'true' });
        }
        if (text.includes('nuevo')) {
            condiciones.push({ field: 'clienteNuevo', operator: 'equals', value: 'true' });
        }
        
        const dias = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo'];
        dias.forEach(d => {
            if (text.includes(d)) {
                const diaNorm = d.replace('é', 'e').replace('á', 'a').toUpperCase();
                condiciones.push({ field: 'diaSemana', operator: 'equals', value: diaNorm });
            }
        });

        services.forEach(s => {
            if (text.includes(s.nombre.toLowerCase())) {
                condiciones.push({ field: 'servicioId', operator: 'equals', value: s.id });
            }
        });

        if (categoria === 'RESERVAS') {
            nombre = cantidadMeta > 1 ? `Reto: ${cantidadMeta} Reservas` : 'Visita y Gana';
            descripcion = `Completa ${cantidadMeta} cita(s) con nosotros para recibir tu recompensa.`;
        } else if (categoria === 'REFERIDOS') {
            nombre = `Recomienda a ${cantidadMeta} amigos`;
            descripcion = `Invita a tus amigos al Spa y recibe premios cuando completen su primera cita.`;
        } else if (categoria === 'RESEÑAS') {
            nombre = 'Déjanos tu opinión';
            descripcion = 'Tu opinión nos ayuda a mejorar. Deja una reseña y gana premios al instante.';
        } else if (categoria === 'PERFIL') {
            nombre = 'Completa tu Perfil';
            descripcion = 'Rellena tus datos personales para brindarte una atención personalizada.';
        } else if (categoria === 'COMPRAS') {
            nombre = `Comprador Frecuente: ${cantidadMeta} compras`;
            descripcion = `Adquiere ${cantidadMeta} productos o cursos y recibe saldo de vuelta en tu billetera.`;
        } else if (categoria === 'CUMPLEAÑOS') {
            nombre = 'Feliz Cumpleaños';
            descripcion = 'Queremos celebrar contigo. Recibe una recompensa especial en tu día.';
        } else {
            nombre = 'Reto Especial Citiox';
            descripcion = 'Completa la actividad indicada para desbloquear tu recompensa.';
        }

        return {
            categoria,
            triggerEvent,
            nombre,
            descripcion,
            color,
            icono,
            progresoTipo,
            cantidadMeta,
            recompensasSeleccionadas,
            puntosRecompensa,
            cuponNombre: `Cupón ${nombre}`,
            cuponValor,
            cuponTipo,
            cuponVencimiento: 30,
            productoGratisNombre: recompensasSeleccionadas.productoGratis ? premioFisicoNombre : '',
            servicioGratisNombre: recompensasSeleccionadas.servicioGratis ? premioFisicoNombre : '',
            cashbackMonto,
            badgeId: '',
            whatsappMensaje: `¡Hola {{nombre}}! Has completado tu reto "${nombre}" y ganaste una recompensa. 🎁`,
            pushTitulo: '🏆 Misión Completada',
            pushCuerpo: `¡Felicidades! Completaste el reto "${nombre}" y obtuviste tus premios.`,
            emailAsunto: '🎉 Recompensa ganada',
            emailCuerpo: `Hola {{nombre}}, completaste la misión "${nombre}" y obtuviste tus premios.`,
            validacionTipo: 'AUTOMATICO',
            dificultad: cantidadMeta > 4 ? 'DIFICIL' : (cantidadMeta > 1 ? 'NORMAL' : 'FACIL'),
            prioridad: 'NORMAL',
            estado: 'ACTIVA',
            fechaInicio: '',
            fechaFin: '',
            visible: true,
            repetible: false,
            limiteUsuario: 1,
            limiteGlobal: '',
            condiciones
        };
    };

    // ─── ACCIONES DE CREACIÓN (WIZARD DE MISIONES) ──────────────────────────────
    const handleWizardNext = () => {
        // Validaciones por paso
        if (wizardStep === 1) {
            if (!wizardData.categoria) {
                showToast('Selecciona una categoría para continuar', 'error');
                return;
            }
        }
        if (wizardStep === 2) {
            if (!wizardData.nombre.trim()) {
                showToast('El nombre de la misión es requerido', 'error');
                return;
            }
            if (wizardData.progresoTipo === 'ACUMULATIVO' && Number(wizardData.cantidadMeta) <= 1) {
                showToast('La meta debe ser mayor que 1 si el progreso es acumulativo', 'error');
                return;
            }
        }
        if (wizardStep === 4) {
            // Validar que haya al menos una recompensa
            const r = wizardData.recompensasSeleccionadas;
            const tieneRecompensa = Object.values(r).some(val => val === true);
            if (!tieneRecompensa) {
                showToast('Debes seleccionar al menos una recompensa o canal de notificación', 'error');
                return;
            }
            if (r.cupon && !wizardData.cuponValor) {
                showToast('Especifica el valor del cupón de descuento', 'error');
                return;
            }
            if (r.productoGratis && !wizardData.productoGratisNombre.trim()) {
                showToast('Especifica el nombre del producto de regalo', 'error');
                return;
            }
            if (r.servicioGratis && !wizardData.servicioGratisNombre.trim()) {
                showToast('Especifica el nombre del servicio de regalo', 'error');
                return;
            }
        }
        setWizardStep(prev => prev + 1);
    };

    const handleWizardBack = () => {
        setWizardStep(prev => prev - 1);
    };

    const handleSelectObjetivo = (catId: string) => {
        const cat = QUEST_ACTIONS_CATALOG.find(c => c.id === catId);
        if (!cat) return;

        // Tomar el primer evento por defecto
        const defaultEvent = cat.eventos[0]?.id || 'CUSTOM_EVENT';
        const defaultMeta = cat.eventos[0]?.defaultMeta || 1;
        const defaultType = cat.eventos[0]?.type || 'SIMPLE';

        setWizardData(prev => ({
            ...prev,
            categoria: catId,
            triggerEvent: defaultEvent,
            cantidadMeta: defaultMeta,
            progresoTipo: defaultType,
            nombre: `Reto de ${cat.label}`,
            descripcion: `Completa actividades de ${cat.label} para ganar recompensas.`,
            color: cat.color,
            icono: cat.icono
        }));
        setWizardStep(2);
    };

    const handleIaParse = () => {
        if (!iaInputText.trim()) {
            showToast('Por favor, escribe una frase para que la IA la analice', 'error');
            return;
        }

        setIsIaProcessing(true);

        setTimeout(() => {
            const text = iaInputText.toLowerCase();
            
            // Inicializar datos con valores por defecto
            let categoria = 'RESERVAS';
            let triggerEvent = 'BOOKING_COMPLETED';
            let progresoTipo = 'SIMPLE';
            let cantidadMeta = 1;
            let nombre = 'Reto personalizado';
            let descripcion = 'Completa esta acción para ganar recompensas.';
            let color = '#ec4899';
            let icono = 'Award';
            let recompensasSeleccionadas = {
                puntos: false,
                cupon: false,
                productoGratis: false,
                servicioGratis: false,
                cashback: false,
                badge: false,
                whatsapp: false,
                push: false,
                email: false
            };
            let puntosRecompensa = 100;
            let cuponValor = 15;
            let cuponTipo = 'PORCENTAJE';
            let whatsappMensaje = '¡Hola {{nombre}}! Has completado tu reto. 🎁';
            let condiciones: any[] = [];
            let prioridad = 'NORMAL';
            let dificultad = 'NORMAL';
            let estado = 'ACTIVA';

            // 1. Determinar categoría
            if (text.includes('referido') || text.includes('amigo') || text.includes('invitar') || text.includes('recomenda')) {
                categoria = 'REFERIDOS';
                triggerEvent = 'REFERRAL_COMPLETED';
                color = '#3b82f6';
                icono = 'Users';
                nombre = 'Reto de Recomendaciones';
                descripcion = 'Invita a tus amigos y gana premios exclusivos.';
            } else if (text.includes('reseña') || text.includes('opin') || text.includes('calific') || text.includes('estrella')) {
                categoria = 'RESEÑAS';
                triggerEvent = 'REVIEW_CREATED';
                color = '#eab308';
                icono = 'Star';
                nombre = 'Opina sobre nosotros';
                descripcion = 'Déjanos tu opinión y ayúdanos a mejorar.';
            } else if (text.includes('comprar') || text.includes('compra') || text.includes('producto') || text.includes('curso')) {
                categoria = 'COMPRAS';
                triggerEvent = 'PURCHASE_COMPLETED';
                color = '#f43f5e';
                icono = 'ShoppingBag';
                nombre = 'Adquiere productos';
                descripcion = 'Realiza compras en nuestro spa para ganar recompensas.';
            } else if (text.includes('perfil') || text.includes('whatsapp') || text.includes('registro') || text.includes('correo')) {
                categoria = 'PERFIL';
                triggerEvent = 'PROFILE_COMPLETED';
                color = '#06b6d4';
                icono = 'UserCheck';
                nombre = 'Completa tus datos';
                descripcion = 'Completa tu información de perfil para personalizar tu experiencia.';
            } else if (text.includes('cumple')) {
                categoria = 'CUMPLEAÑOS';
                triggerEvent = 'CUMPLEANOS';
                color = '#10b981';
                icono = 'Cake';
                nombre = 'Regalo de Cumpleaños';
                descripcion = '¡Celebra tu cumpleaños con nosotros!';
            } else if (text.includes('social') || text.includes('instagram') || text.includes('facebook') || text.includes('compartir') || text.includes('follow') || text.includes('like')) {
                categoria = 'SOCIAL';
                triggerEvent = 'INSTAGRAM_FOLLOW';
                color = '#8b5cf6';
                icono = 'Share2';
                nombre = 'Síguenos en Redes';
                descripcion = 'Conéctate con nosotros en redes sociales.';
            } else if (text.includes('reserva') || text.includes('cita') || text.includes('citas') || text.includes('agendar') || text.includes('masaje') || text.includes('facial') || text.includes('servicio')) {
                categoria = 'RESERVAS';
                triggerEvent = 'BOOKING_COMPLETED';
                color = '#ec4899';
                icono = 'Calendar';
                nombre = 'Reto de Citas';
                descripcion = 'Agenda y completa tus citas con nosotros.';
            }

            // 2. Extraer meta
            const metaMatches = text.match(/\b(\d+)\s*(cita|citas|reserva|reservas|amigo|amigos|opinion|opiniones|reseña|reseñas|compra|compras|veces)\b/);
            if (metaMatches && metaMatches[1]) {
                cantidadMeta = parseInt(metaMatches[1], 10);
            } else {
                const allNumbers = text.match(/\b\d+\b/g);
                if (allNumbers) {
                    const candidate = parseInt(allNumbers[0], 10);
                    if (candidate > 0 && candidate < 20) {
                        cantidadMeta = candidate;
                    }
                }
            }

            if (cantidadMeta > 1) {
                progresoTipo = 'ACUMULATIVO';
            }

            if (text.includes('masaje')) {
                nombre = `Reto de Masajes`;
                descripcion = `Completa ${cantidadMeta} masajes para obtener tu premio.`;
                condiciones.push({ field: 'categoriaId', operator: 'equals', value: 'Masajes' });
            } else if (text.includes('facial')) {
                nombre = `Reto Facial`;
                descripcion = `Completa ${cantidadMeta} tratamientos faciales.`;
                condiciones.push({ field: 'categoriaId', operator: 'equals', value: 'Faciales' });
            }

            // 3. Extraer recompensas
            const puntosMatch = text.match(/\b(\d+)\s*(puntos|pts)\b/);
            if (puntosMatch && puntosMatch[1]) {
                recompensasSeleccionadas.puntos = true;
                puntosRecompensa = parseInt(puntosMatch[1], 10);
            } else if (text.includes('puntos')) {
                recompensasSeleccionadas.puntos = true;
                puntosRecompensa = 150;
            }

            const cuponMatch = text.match(/\b(\d+)\s*(%|por ciento|descuento)\b/);
            if (cuponMatch && cuponMatch[1]) {
                recompensasSeleccionadas.cupon = true;
                cuponValor = parseInt(cuponMatch[1], 10);
                cuponTipo = 'PORCENTAJE';
            } else if (text.includes('cupón') || text.includes('cupon') || text.includes('descuento')) {
                recompensasSeleccionadas.cupon = true;
                cuponValor = 15;
            }

            if (text.includes('gratis') || text.includes('regalo') || text.includes('premio')) {
                if (text.includes('masaje') || text.includes('servicio')) {
                    recompensasSeleccionadas.servicioGratis = true;
                } else {
                    recompensasSeleccionadas.productoGratis = true;
                }
            }

            if (text.includes('whatsapp') || text.includes('enviar whatsapp')) {
                recompensasSeleccionadas.whatsapp = true;
            }
            if (text.includes('notificación') || text.includes('notificacion') || text.includes('push')) {
                recompensasSeleccionadas.push = true;
            }
            if (text.includes('correo') || text.includes('email')) {
                recompensasSeleccionadas.email = true;
            }

            // 4. Condiciones
            if (text.includes('vip')) {
                condiciones.push({ field: 'clienteVip', operator: 'equals', value: 'true' });
            }
            if (text.includes('nuevo') || text.includes('nuevos')) {
                condiciones.push({ field: 'clienteNuevo', operator: 'equals', value: 'true' });
            }
            
            const diasSemana = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo'];
            for (const dia of diasSemana) {
                if (text.includes(dia)) {
                    condiciones.push({ field: 'diaSemana', operator: 'equals', value: dia.toUpperCase().replace('É', 'E').replace('Á', 'A') });
                }
            }

            if (text.includes('destacada') || text.includes('destacado')) prioridad = 'DESTACADA';
            else if (text.includes('alta')) prioridad = 'ALTA';
            else if (text.includes('baja')) prioridad = 'BAJA';

            if (text.includes('fácil') || text.includes('facil')) dificultad = 'FACIL';
            else if (text.includes('difícil') || text.includes('dificil')) dificultad = 'DIFICIL';

            setWizardData(prev => ({
                ...prev,
                categoria,
                triggerEvent,
                progresoTipo,
                cantidadMeta,
                nombre,
                descripcion,
                color,
                icono,
                recompensasSeleccionadas,
                puntosRecompensa,
                cuponValor,
                cuponTipo,
                whatsappMensaje,
                condiciones,
                prioridad,
                dificultad,
                estado
            }));

            if (recompensasSeleccionadas.cupon) {
                setWizardData(prev => ({
                    ...prev,
                    cuponNombre: `Cupón ${nombre}`
                }));
            }

            setIsIaProcessing(false);
            showToast('✨ Formulario pre-rellenado con éxito. Por favor revisa los pasos.', 'success');
            setWizardStep(1); // Ir al paso 1 del asistente
        }, 1200);
    };

    const handleIaGamificationSuggestions = () => {
        setIsIaGamificationAnimating(true);
        setTimeout(() => {
            let sug = `✨ **Recomendaciones de Gamificación para "${wizardData.nombre || 'tu Misión'}"**:\n\n`;
            sug += `• **Equilibrio de Recompensa**: Al requerir completar ${wizardData.cantidadMeta} veces la acción, te recomendamos ofrecer un incremento del 20% de puntos.\n`;
            if (wizardData.dificultad === 'DIFICIL') {
                sug += `• **Ajuste de Dificultad**: Al ser dificultad **Difícil**, sugerimos enviar una plantilla de WhatsApp automática de felicitación.\n`;
            } else {
                sug += `• **Fidelidad**: Añade una insignia visual premium para motivar el reconocimiento del cliente.\n`;
            }
            sug += `\n*Presiona "Aplicar Mejoras" para ajustar automáticamente la misión.*`;
            
            setIaSugerencia(sug);
            setIsIaGamificationAnimating(false);
        }, 1200);
    };

    const handleApplyIaImprovements = () => {
        setWizardData(prev => ({
            ...prev,
            puntosRecompensa: Math.round(prev.puntosRecompensa * 1.2),
            recompensasSeleccionadas: {
                ...prev.recompensasSeleccionadas,
                whatsapp: true
            },
            whatsappMensaje: `🏆 ¡Felicidades! Completaste la misión "${prev.nombre}". Hemos acreditado tus premios en tu cuenta. ¡Gracias por preferirnos! 🎉`
        }));
        setIaSugerencia(null);
        showToast('✨ Mejoras de gamificación de IA aplicadas con éxito', 'success');
    };

    const handleCreateQuestFromWizard = async () => {
        try {
            setSubmitting(true);

            // Construir acciones de recompensas combinadas
            const acciones: any[] = [];
            const r = wizardData.recompensasSeleccionadas;
            
            if (r.puntos) {
                acciones.push({ action: 'ADD_POINTS', value: Number(wizardData.puntosRecompensa) });
            }
            if (r.cupon) {
                acciones.push({
                    action: 'CREATE_COUPON',
                    value: {
                        nombre: wizardData.cuponNombre || `Cupón ${wizardData.nombre}`,
                        valor: Number(wizardData.cuponValor),
                        tipo: wizardData.cuponTipo,
                        vencimientoDias: Number(wizardData.cuponVencimiento)
                    }
                });
            }
            if (r.productoGratis) {
                acciones.push({ action: 'PRODUCT_GIFT', value: { name: wizardData.productoGratisNombre } });
            }
            if (r.servicioGratis) {
                acciones.push({ action: 'SERVICE_GIFT', value: { name: wizardData.servicioGratisNombre } });
            }
            if (r.cashback) {
                acciones.push({ action: 'ADD_WALLET_BALANCE', value: Number(wizardData.cashbackMonto) });
            }
            if (r.badge) {
                acciones.push({ action: 'AWARD_BADGE', value: { badgeId: wizardData.badgeId } });
            }
            if (r.whatsapp) {
                acciones.push({ action: 'SEND_WHATSAPP', value: { message: wizardData.whatsappMensaje } });
            }
            if (r.push) {
                acciones.push({ action: 'SEND_PUSH', value: { title: wizardData.pushTitulo, body: wizardData.pushCuerpo } });
            }
            if (r.email) {
                acciones.push({ action: 'SEND_EMAIL', value: { subject: wizardData.emailAsunto, body: wizardData.emailCuerpo } });
            }

            // Si no seleccionó ninguna recompensa, inyectar por defecto 50 puntos para evitar array vacío
            if (acciones.length === 0) {
                acciones.push({ action: 'ADD_POINTS', value: 50 });
            }

            // Mapeamos el estado simplificado a activa/visible:
            let activa = true;
            let visible = wizardData.visible;
            if (wizardData.estado === 'BORRADOR') {
                activa = false;
                visible = false;
            } else if (wizardData.estado === 'PAUSADA') {
                activa = false;
                visible = true;
            } else if (wizardData.estado === 'FINALIZADA') {
                activa = false;
                visible = false;
            }

            // Construir condicionesExtra
            const condicionesExtra = {
                categoria: wizardData.categoria,
                dificultad: wizardData.dificultad,
                prioridad: wizardData.prioridad,
                limiteGlobal: wizardData.limiteGlobal ? Number(wizardData.limiteGlobal) : null,
                estado: wizardData.estado,
                condiciones: wizardData.condiciones
            };

            const payload = {
                customQuest: {
                    nombre: wizardData.nombre,
                    descripcion: wizardData.descripcion,
                    icono: wizardData.icono,
                    color: wizardData.color,
                    triggerEvent: wizardData.triggerEvent,
                    cantidadMeta: Number(wizardData.cantidadMeta),
                    validacionTipo: wizardData.validacionTipo,
                    acciones,
                    condicionesExtra,
                    fechaInicio: wizardData.fechaInicio || null,
                    fechaFin: wizardData.fechaFin || null,
                    visible,
                    repetible: wizardData.repetible,
                    limiteUsuario: Number(wizardData.limiteUsuario),
                    parentQuestId: wizardData.parentQuestId || null,
                    activa,
                    campaignName: `Campaña ${wizardData.categoria}`
                }
            };

            let res;
            if (editingQuestId) {
                res = await fetch('/api/admin/misiones', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questId: editingQuestId,
                        data: {
                            nombre: wizardData.nombre,
                            descripcion: wizardData.descripcion,
                            icono: wizardData.icono,
                            color: wizardData.color,
                            triggerEvent: wizardData.triggerEvent,
                            cantidadMeta: Number(wizardData.cantidadMeta),
                            validacionTipo: wizardData.validacionTipo,
                            acciones,
                            servicioId: wizardData.servicioId || null,
                            montoMinimo: wizardData.montoMinimo ? Number(wizardData.montoMinimo) : null,
                            segmentacion: wizardData.segmentacion || null,
                            condicionesExtra,
                            fechaInicio: wizardData.fechaInicio || null,
                            fechaFin: wizardData.fechaFin || null,
                            visible,
                            repetible: wizardData.repetible,
                            limiteUsuario: Number(wizardData.limiteUsuario),
                            limiteGlobal: wizardData.limiteGlobal ? Number(wizardData.limiteGlobal) : null,
                            parentQuestId: wizardData.parentQuestId || null,
                            activa
                        }
                    })
                });
            } else {
                res = await fetch('/api/admin/misiones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();

            if (data.success) {
                showToast(editingQuestId ? 'Desafío editado con éxito' : 'Misión creada con éxito desde el asistente', 'success');
                setIsWizardOpen(false);
                setWizardStep(1);
                setEditingQuestId(null);
                fetchData();
            } else {
                showToast(data.error || 'Error al crear/editar misión', 'error');
            }
        } catch (error) {
            console.error('Error en wizard:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── ACCIONES DE PARTICIPANTES (APROBACIÓN DE STAFF) ──────────────────────────
    const handleApproveParticipant = async (progressId: string) => {
        try {
            const res = await fetch('/api/admin/misiones/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressId, action: 'APROBAR', notas: 'Aprobado desde el panel' })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Progreso aprobado con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al aprobar', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        }
    };

    const handleRejectParticipant = async (progressId: string) => {
        try {
            const res = await fetch('/api/admin/misiones/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressId, action: 'RECHAZAR', notas: 'Rechazado por staff' })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Progreso rechazado y restablecido', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al rechazar', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        }
    };

    // ─── CANJE DE PREMIOS EN RECEPCIÓN ───────────────────────────────────────────
    const handleOpenCanjeModal = (reward: any) => {
        setSelectedRewardToCanje(reward);
        setCanjeStaffId(staffList[0]?.id || '');
        setCanjeNotas('');
        setIsCatalogRewardModalOpen(false); // por si acaso
    };

    const handleConfirmCanjeFisico = async () => {
        if (!selectedRewardToCanje) return;
        try {
            setSubmitting(true);
            const res = await fetch(`/api/admin/referrals/rewards/${selectedRewardToCanje.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'CANJEADO',
                    staffId: canjeStaffId,
                    notas: canjeNotas
                })
            });

            if (res.ok) {
                showToast('¡Premio entregado con éxito! WhatsApp enviado al cliente.', 'success');
                setSelectedRewardToCanje(null);
                fetchData();
            } else {
                showToast('No se pudo confirmar la entrega física.', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── ELIMINAR / ACTIVAR / DESACTIVAR ────────────────────────────────────────
    const handleToggleQuestActive = async (questId: string, currentActive: boolean) => {
        try {
            const res = await fetch('/api/admin/misiones', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId,
                    data: { activa: !currentActive }
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Estado de la misión actualizado', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al actualizar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDeleteQuest = async (questId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta misión? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/admin/misiones?questId=${questId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Misión eliminada con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    // ─── CREAR CUPÓN INDEPENDIENTE ──────────────────────────────────────────────
    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponFormData.codigo.trim()) {
            showToast('El código del cupón es requerido', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: couponFormData.codigo.toUpperCase().trim(),
                    tipo: couponFormData.tipo,
                    valor: Number(couponFormData.valor),
                    descripcion: couponFormData.descripcion,
                    maxUsos: couponFormData.maxUsos ? Number(couponFormData.maxUsos) : null,
                    fechaFin: couponFormData.fechaFin ? new Date(couponFormData.fechaFin) : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Cupón promocional creado con éxito', 'success');
                setIsCouponModalOpen(false);
                setCouponFormData({
                    codigo: '',
                    tipo: 'PORCENTAJE',
                    valor: 10,
                    descripcion: '',
                    maxUsos: '',
                    fechaFin: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al crear cupón', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── CREAR PREMIO DE CATÁLOGO ───────────────────────────────────────────────
    const handleCreateCatalogReward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catalogRewardFormData.nombre.trim()) {
            showToast('El nombre del premio es requerido', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: catalogRewardFormData.nombre,
                    descripcion: catalogRewardFormData.descripcion,
                    costoPuntos: Number(catalogRewardFormData.costoPuntos),
                    tipo: catalogRewardFormData.tipo,
                    valor: catalogRewardFormData.valor,
                    cantidadTotal: catalogRewardFormData.cantidadTotal ? Number(catalogRewardFormData.cantidadTotal) : null,
                    imagenUrl: catalogRewardFormData.imagenUrl || null
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Premio del catálogo de puntos creado con éxito', 'success');
                setIsCatalogRewardModalOpen(false);
                setCatalogRewardFormData({
                    nombre: '',
                    descripcion: '',
                    costoPuntos: 500,
                    tipo: 'SERVICIO_GRATIS',
                    valor: '',
                    cantidadTotal: '',
                    imagenUrl: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al crear premio', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── AJUSTE MANUAL DE PUNTOS ────────────────────────────────────────────────
    const handlePointsAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointsFormData.userId) {
            showToast('Selecciona un cliente para el ajuste', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: pointsFormData.userId,
                    puntos: Number(pointsFormData.puntos),
                    concepto: pointsFormData.concepto,
                    notas: pointsFormData.notas
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Puntos ajustados y notificados correctamente', 'success');
                setIsPointsAdjustmentModalOpen(false);
                setPointsFormData({
                    userId: '',
                    puntos: 100,
                    concepto: 'BONO',
                    notas: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al ajustar puntos', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInstallTemplate = async (templateId: string) => {
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/misiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Plantilla de crecimiento instalada con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al instalar plantilla', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApplyLocalTemplate = (tpl: any) => {
        setWizardData({
            categoria: tpl.categoria,
            triggerEvent: tpl.triggerEvent,
            nombre: tpl.nombre,
            descripcion: tpl.descripcion,
            color: tpl.color,
            icono: tpl.icono,
            progresoTipo: tpl.progresoTipo,
            cantidadMeta: tpl.cantidadMeta,
            condiciones: tpl.condiciones || [],
            recompensasSeleccionadas: {
                puntos: tpl.recompensasSeleccionadas?.puntos || false,
                cupon: tpl.recompensasSeleccionadas?.cupon || false,
                productoGratis: tpl.recompensasSeleccionadas?.productoGratis || false,
                servicioGratis: tpl.recompensasSeleccionadas?.servicioGratis || false,
                cashback: tpl.recompensasSeleccionadas?.cashback || false,
                badge: tpl.recompensasSeleccionadas?.badge || false,
                whatsapp: tpl.recompensasSeleccionadas?.whatsapp || false,
                push: tpl.recompensasSeleccionadas?.push || false,
                email: tpl.recompensasSeleccionadas?.email || false
            },
            puntosRecompensa: tpl.puntosRecompensa || 100,
            cuponNombre: tpl.cuponNombre || '',
            cuponValor: tpl.cuponValor || 20,
            cuponTipo: tpl.cuponTipo || 'PORCENTAJE',
            cuponVencimiento: tpl.cuponVencimiento || 30,
            productoGratisNombre: tpl.productoGratisNombre || '',
            servicioGratisNombre: tpl.servicioGratisNombre || '',
            cashbackMonto: tpl.cashbackMonto || 10,
            badgeId: tpl.badgeId || '',
            whatsappMensaje: tpl.whatsappMensaje || '¡Hola {{nombre}}! Has completado tu reto y ganaste una recompensa. 🎁',
            pushTitulo: tpl.pushTitulo || '🏆 Misión Completada',
            pushCuerpo: tpl.pushCuerpo || '¡Felicidades! Completaste la misión y obtuviste tus premios.',
            emailAsunto: tpl.emailAsunto || '🎁 Recompensa ganada',
            emailCuerpo: tpl.emailCuerpo || 'Hola {{nombre}}, completaste la misión y obtuviste tus premios.',
            validacionTipo: tpl.validacionTipo || 'AUTOMATICO',
            dificultad: tpl.dificultad || 'NORMAL',
            prioridad: tpl.prioridad || 'NORMAL',
            estado: tpl.estado || 'ACTIVA',
            fechaInicio: tpl.fechaInicio || '',
            fechaFin: tpl.fechaFin || '',
            visible: tpl.visible !== undefined ? tpl.visible : true,
            repetible: tpl.repetible !== undefined ? tpl.repetible : false,
            limiteUsuario: tpl.limiteUsuario !== undefined ? tpl.limiteUsuario : 1,
            limiteGlobal: tpl.limiteGlobal || '',
            parentQuestId: tpl.parentQuestId || ''
        });
        setWizardStep(1);
    };

    const handleOpenEditWizard = (quest: any) => {
        setEditingQuestId(quest.id);
        
        const accionesRaw = typeof quest.acciones === 'string' ? JSON.parse(quest.acciones) : quest.acciones || [];
        const recompensasSeleccionadas = {
            puntos: false,
            cupon: false,
            productoGratis: false,
            servicioGratis: false,
            cashback: false,
            badge: false,
            whatsapp: false,
            push: false,
            email: false
        };
        let puntosRecompensa = 100;
        let cuponNombre = '';
        let cuponValor = 20;
        let cuponTipo = 'PORCENTAJE';
        let cuponVencimiento = 30;
        let productoGratisNombre = '';
        let servicioGratisNombre = '';
        let cashbackMonto = 10;
        let badgeId = '';
        let whatsappMensaje = '¡Hola {{nombre}}! Has completado tu reto y ganaste una recompensa. 🎁';
        let pushTitulo = '🏆 Misión Completada';
        let pushCuerpo = '¡Felicidades! Completaste la misión y obtuviste tus premios.';
        let emailAsunto = '🎁 Recompensa ganada';
        let emailCuerpo = 'Hola {{nombre}}, completaste la misión y obtuviste tus premios.';

        accionesRaw.forEach((a: any) => {
            if (a.action === 'ADD_POINTS') {
                recompensasSeleccionadas.puntos = true;
                puntosRecompensa = Number(a.value.puntos || a.value);
            } else if (a.action === 'CREATE_COUPON') {
                recompensasSeleccionadas.cupon = true;
                cuponNombre = a.value.nombre || '';
                cuponValor = Number(a.value.valor || a.value);
                cuponTipo = a.value.tipo || 'PORCENTAJE';
                cuponVencimiento = Number(a.value.vencimientoDias || 30);
            } else if (a.action === 'PRODUCT_GIFT') {
                recompensasSeleccionadas.productoGratis = true;
                productoGratisNombre = a.value.name || a.value;
            } else if (a.action === 'SERVICE_GIFT') {
                recompensasSeleccionadas.servicioGratis = true;
                servicioGratisNombre = a.value.name || a.value;
            } else if (a.action === 'ADD_WALLET_BALANCE') {
                recompensasSeleccionadas.cashback = true;
                cashbackMonto = Number(a.value);
            } else if (a.action === 'AWARD_BADGE') {
                recompensasSeleccionadas.badge = true;
                badgeId = a.value.badgeId || a.value;
            } else if (a.action === 'SEND_WHATSAPP') {
                recompensasSeleccionadas.whatsapp = true;
                whatsappMensaje = a.value.message || a.value;
            } else if (a.action === 'SEND_PUSH') {
                recompensasSeleccionadas.push = true;
                pushTitulo = a.value.title || '';
                pushCuerpo = a.value.body || '';
            } else if (a.action === 'SEND_EMAIL') {
                recompensasSeleccionadas.email = true;
                emailAsunto = a.value.subject || '';
                emailCuerpo = a.value.body || '';
            }
        });

        const cExtra = typeof quest.condicionesExtra === 'string' ? JSON.parse(quest.condicionesExtra) : quest.condicionesExtra || {};
        const categoria = cExtra.categoria || quest.categoria || 'RESERVAS';
        const dificultad = cExtra.dificultad || 'NORMAL';
        const prioridad = cExtra.prioridad || 'NORMAL';
        const estado = cExtra.estado || (quest.activa ? 'ACTIVA' : 'PAUSADA');
        const condiciones = cExtra.condiciones || [];
        const limiteGlobal = cExtra.limiteGlobal !== undefined && cExtra.limiteGlobal !== null ? cExtra.limiteGlobal : (quest.limiteGlobal || '');

        setWizardData({
            categoria,
            triggerEvent: quest.triggerEvent || 'BOOKING_COMPLETED',
            nombre: quest.nombre || '',
            descripcion: quest.descripcion || '',
            color: quest.color || '#ec4899',
            icono: quest.icono || 'Award',
            progresoTipo: quest.cantidadMeta > 1 ? 'ACUMULATIVO' : 'SIMPLE',
            cantidadMeta: quest.cantidadMeta || 1,
            condiciones,
            recompensasSeleccionadas,
            puntosRecompensa,
            cuponNombre,
            cuponValor,
            cuponTipo,
            cuponVencimiento,
            productoGratisNombre,
            servicioGratisNombre,
            cashbackMonto,
            badgeId,
            whatsappMensaje,
            pushTitulo,
            pushCuerpo,
            emailAsunto,
            emailCuerpo,
            validacionTipo: quest.validacionTipo || 'AUTOMATICO',
            dificultad,
            prioridad,
            estado,
            fechaInicio: quest.fechaInicio ? new Date(quest.fechaInicio).toISOString().split('T')[0] : '',
            fechaFin: quest.fechaFin ? new Date(quest.fechaFin).toISOString().split('T')[0] : '',
            visible: quest.visible !== undefined ? quest.visible : true,
            repetible: quest.repetible !== undefined ? quest.repetible : false,
            limiteUsuario: quest.limiteUsuario !== undefined ? quest.limiteUsuario : 1,
            limiteGlobal,
            parentQuestId: quest.parentQuestId || ''
        });

        setWizardStep(1); // Entrar directo al paso 1
        setIsWizardOpen(true);
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* TOAST SYSTEM */}
            {toastMsg && (
                <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold transition-all uppercase tracking-widest ${
                    toastMsg.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                    {toastMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toastMsg.text}
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Trophy className="text-pink-500 animate-pulse" /> Misiones
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Centro de misiones, referidos y fidelización unificado de Citiox.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setWizardStep(0);
                            setIsWizardOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                        style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 10px 15px -3px ${primaryColor}33`
                        }}
                    >
                        <Plus size={16} /> Crear Misión / Campaña
                    </button>
                </div>
            </div>

            {/* NAVIGATION TABS (10 Pestañas) */}
            <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none pb-0.5">
                {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'campaigns', label: 'Campañas' },
                    { id: 'quests', label: 'Misiones' },
                    { id: 'templates', label: 'Plantillas Citiox' },
                    { id: 'participants', label: 'Participantes' },
                    { id: 'rewards', label: 'Premios y Canjes' },
                    { id: 'points', label: 'Puntos' },
                    { id: 'coupons', label: 'Cupones' },
                    { id: 'stats', label: 'Estadísticas' },
                    { id: 'history', label: 'Historial' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                            activeTab === tab.id ? 'text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                        style={{ borderColor: activeTab === tab.id ? primaryColor : 'transparent' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENTS */}
            {loading ? (
                <div className="flex justify-center items-center py-32">
                    <RefreshCw className="animate-spin text-slate-400" size={32} />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 1. DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Activos</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.totalParticipantes}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Zap size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retos en Progreso</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.enProgreso}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle2 size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Misiones Completadas</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.completadas}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><TrendingUp size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aumento ROI</p>
                                        <h4 className="text-2xl font-black text-slate-800">+{stats.roiEstimado}%</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Resumen del Crecimiento */}
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Sparkles className="text-pink-500" size={18} /> Resumen del Canal
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reservas Adicionales Generadas</span>
                                            <span className="text-xs font-black text-slate-800">{stats.reservasGeneradas}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clientes Recomendados (Referidos)</span>
                                            <span className="text-xs font-black text-slate-800">{stats.referidosValidos}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puntos de Fidelidad Emitidos</span>
                                            <span className="text-xs font-black text-slate-800">{stats.puntosEntregados} pts</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cupones Otorgados Utilizados</span>
                                            <span className="text-xs font-black text-slate-800">{stats.cuponesUsados}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones Rápidas */}
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Zap className="text-amber-500" size={18} /> Acciones Rápidas
                                        </h3>
                                        <p className="text-slate-400 text-xs font-medium mb-6">Utiliza estas utilidades para administrar tus puntos y cupones de forma inmediata.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setIsCouponModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Gift className="text-purple-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Crear Cupón</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsCatalogRewardModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Trophy className="text-pink-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Crear Premio Puntos</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsPointsAdjustmentModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Coins className="text-amber-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Ajuste de Puntos</span>
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('participants')}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Users className="text-blue-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Ver Participantes</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. CAMPAÑAS */}
                    {activeTab === 'campaigns' && (
                        <div className="space-y-6">
                            {campaigns.length === 0 ? (
                                <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center shadow-sm">
                                    <Trophy className="mx-auto text-slate-300 mb-4" size={40} />
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No hay campañas configuradas</h3>
                                    <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                        Las campañas agrupan tus misiones comerciales (Navidad, Temporada, VIP). Crea tu primera campaña.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {campaigns.map((camp: any) => (
                                        <div key={camp.id} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                                                <div>
                                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">{camp.nombre}</h3>
                                                    <p className="text-slate-400 text-xs font-medium mt-1">{camp.descripcion || 'Sin descripción'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteQuest(camp.id)} // Para borrar campaña entera
                                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Eliminar campaña"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {camp.Quests.map((quest: any) => (
                                                    <div key={quest.id} className="border border-slate-150 rounded-2xl p-4 flex justify-between items-center bg-slate-50 hover:bg-white transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 rounded-xl text-white flex items-center justify-center font-bold text-xs" style={{ backgroundColor: quest.color || primaryColor }}>
                                                                <Award size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">{quest.nombre}</h4>
                                                                <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Trigger: {quest.triggerEvent} (Meta: {quest.cantidadMeta})</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleOpenEditWizard(quest)}
                                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                                                title="Editar misión"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleToggleQuestActive(quest.id, quest.activa)}
                                                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                                    quest.activa ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                                                                }`}
                                                                title={quest.activa ? 'Desactivar misión' : 'Activar misión'}
                                                            >
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteQuest(quest.id)}
                                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Eliminar misión"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. MISIONES INDIVIDUALES */}
                    {activeTab === 'quests' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Misiones de lealtad configuradas en el Growth Engine</span>
                                <button 
                                    onClick={() => {
                                        setEditingQuestId(null);
                                        setWizardData({
                                            categoria: 'RESERVAS',
                                            triggerEvent: 'BOOKING_COMPLETED',
                                            nombre: '',
                                            descripcion: '',
                                            color: '#ec4899',
                                            icono: 'Calendar',
                                            progresoTipo: 'SIMPLE',
                                            cantidadMeta: 1,
                                            condiciones: [],
                                            recompensasSeleccionadas: {
                                                puntos: false,
                                                cupon: false,
                                                productoGratis: false,
                                                servicioGratis: false,
                                                cashback: false,
                                                badge: false,
                                                whatsapp: false,
                                                push: false,
                                                email: false
                                            },
                                            puntosRecompensa: 100,
                                            cuponNombre: '',
                                            cuponValor: 20,
                                            cuponTipo: 'PORCENTAJE',
                                            cuponVencimiento: 30,
                                            productoGratisNombre: '',
                                            servicioGratisNombre: '',
                                            cashbackMonto: 10,
                                            badgeId: '',
                                            whatsappMensaje: '¡Hola {{nombre}}! Has completado tu reto y ganaste una recompensa. 🎁',
                                            pushTitulo: '🏆 Misión Completada',
                                            pushCuerpo: '¡Felicidades! Completaste la misión y obtuviste tus premios.',
                                            emailAsunto: '🎁 Recompensa ganada',
                                            emailCuerpo: 'Hola {{nombre}}, completaste la misión y obtuviste tus premios.',
                                            validacionTipo: 'AUTOMATICO',
                                            dificultad: 'NORMAL',
                                            prioridad: 'NORMAL',
                                            estado: 'ACTIVA',
                                            fechaInicio: '',
                                            fechaFin: '',
                                            visible: true,
                                            repetible: false,
                                            limiteUsuario: 1,
                                            limiteGlobal: '',
                                            parentQuestId: ''
                                        });
                                        setWizardStep(0);
                                        setIsWizardOpen(true);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
                                >
                                    + Crear con Asistente
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {campaigns.flatMap((c: any) => c.Quests.map((quest: any) => (
                                    <div key={quest.id} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md text-white" 
                                                style={{ backgroundColor: quest.color || primaryColor }}
                                            >
                                                {quest.triggerEvent}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                quest.activa ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}>
                                                {quest.activa ? 'ACTIVA' : 'INACTIVA'}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Award size={16} style={{ color: quest.color || primaryColor }} /> {quest.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                            {quest.descripcion}
                                        </p>
                                        <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">Meta:</span>
                                                <span className="text-slate-800">{quest.cantidadMeta} visitas/completados</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">Validación:</span>
                                                <span className="text-slate-800">{quest.validacionTipo}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                            <button 
                                                onClick={() => handleOpenEditWizard(quest)}
                                                className="p-2 border border-slate-150 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer"
                                                title="Editar desafío"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleToggleQuestActive(quest.id, quest.activa)}
                                                className="px-3.5 py-2 border border-slate-150 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 cursor-pointer"
                                            >
                                                {quest.activa ? 'Pausar' : 'Activar'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteQuest(quest.id)}
                                                className="p-2 border border-slate-150 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer"
                                                title="Eliminar misión"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )))}
                            </div>
                        </div>
                    )}

                    {/* 4. TEMPLANTES MARKETPLACE */}
                    {activeTab === 'templates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {templates.map((tpl: any) => (
                                <div key={tpl.id} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                                {tpl.triggerEvent}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-pink-50 text-pink-600 border border-pink-100">
                                                1-CLIC INSTALL
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <Award size={16} className="text-pink-500 group-hover:scale-110 transition-transform" /> {tpl.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                            {tpl.descripcion}
                                        </p>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-6">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Dificultad: {tpl.difficulty || 'MEDIA'}</span>
                                        <button 
                                            onClick={() => handleInstallTemplate(tpl.id)}
                                            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors cursor-pointer"
                                        >
                                            Instalar Reto
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 5. PARTICIPANTES (Aprobaciones) */}
                    {activeTab === 'participants' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Progresos Activos */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Users className="text-blue-500" size={18} /> Progreso de Clientes en Misiones
                                    </h3>
                                    {participantsProgress.length === 0 ? (
                                        <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay avances de clientes registrados aún.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                        <th className="pb-3">Cliente</th>
                                                        <th className="pb-3">Misión / Reto</th>
                                                        <th className="pb-3">Avance</th>
                                                        <th className="pb-3">Estado</th>
                                                        <th className="pb-3 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {participantsProgress.map((prog: any) => (
                                                        <tr key={prog.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                            <td className="py-4">
                                                                <p className="font-black text-slate-800">{prog.Usuario?.nombre || 'Desconocido'}</p>
                                                                <p className="text-[9px] text-slate-400 mt-0.5">{prog.Usuario?.phone || 'Sin cel'}</p>
                                                            </td>
                                                            <td className="py-4">
                                                                <p className="uppercase text-[10px] font-bold" style={{ color: prog.Quest?.color || primaryColor }}>{prog.Quest?.nombre}</p>
                                                                <p className="text-[8px] text-slate-400 uppercase font-semibold mt-0.5">{prog.Quest?.triggerEvent}</p>
                                                            </td>
                                                            <td className="py-4">
                                                                <div className="w-24 bg-slate-100 rounded-full h-2 relative overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ 
                                                                        width: `${(prog.progresoActual / prog.progresoRequerido) * 100}%`,
                                                                        backgroundColor: prog.Quest?.color || primaryColor 
                                                                    }}></div>
                                                                </div>
                                                                <span className="text-[9px] text-slate-400 font-black mt-1 block">{prog.progresoActual} / {prog.progresoRequerido}</span>
                                                            </td>
                                                            <td className="py-4">
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                                    prog.estado === 'PENDIENTE_APROBACION' 
                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                                                        : prog.estado === 'COMPLETADA' 
                                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                }`}>
                                                                    {prog.estado}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                {prog.estado === 'PENDIENTE_APROBACION' && (
                                                                    <div className="flex gap-1 justify-end">
                                                                        <button 
                                                                            onClick={() => handleApproveParticipant(prog.id)}
                                                                            className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 cursor-pointer"
                                                                        >
                                                                            Aprobar
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleRejectParticipant(prog.id)}
                                                                            className="px-2.5 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 cursor-pointer"
                                                                        >
                                                                            Rechazar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Historial de Logros */}
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <History className="text-purple-500" size={18} /> Actividad Reciente
                                    </h3>
                                    <div className="space-y-4">
                                        {participantsHistory.map((hist: any) => (
                                            <div key={hist.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3 items-start">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserCheck size={16} /></div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                                                        {hist.Usuario?.nombre || 'Cliente'} Completó Reto
                                                    </p>
                                                    <p className="text-[10px] font-black text-pink-600 uppercase mt-0.5">{hist.Quest?.nombre}</p>
                                                    <p className="text-[8px] text-slate-400 font-semibold mt-1">{new Date(hist.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {participantsHistory.length === 0 && (
                                            <p className="text-slate-400 text-xs font-medium py-4 text-center">No hay registros recientes.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. PREMIOS Y CANJES */}
                    {activeTab === 'rewards' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Premios Pendientes / Entregados */}
                            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Gift className="text-pink-500" size={18} /> Canje de Premios en Recepción
                                </h3>
                                {rewardsList.length === 0 ? (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center">No hay premios generados listos para canje.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                    <th className="pb-3">Cliente</th>
                                                    <th className="pb-3">Premio / Concepto</th>
                                                    <th className="pb-3">Tipo</th>
                                                    <th className="pb-3">Estado</th>
                                                    <th className="pb-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rewardsList.map((rew: any) => (
                                                    <tr key={rew.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-855">{rew.Usuario?.nombre || 'Cliente'}</p>
                                                            <p className="text-[9px] text-slate-450 mt-0.5">{rew.Usuario?.phone || 'Sin tel'}</p>
                                                        </td>
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-800 uppercase tracking-wider">
                                                                {rew.Campaign?.valorRecompensa || rew.Reward?.nombre}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 uppercase mt-0.5">
                                                                {rew.Campaign?.nombre || 'Canje de Catálogo'}
                                                            </p>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                                                                {rew.tipoOrigen}
                                                            </span>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                                rew.estado === 'DISPONIBLE' 
                                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                            }`}>
                                                                {rew.estado}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            {rew.estado === 'DISPONIBLE' && (
                                                                <button
                                                                    onClick={() => handleOpenCanjeModal(rew)}
                                                                    className="px-3.5 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 cursor-pointer"
                                                                >
                                                                    Entregar
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Catálogo de Premios por Puntos */}
                            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <Trophy className="text-amber-500" size={18} /> Catálogo de Puntos
                                        </h3>
                                        <button 
                                            onClick={() => setIsCatalogRewardModalOpen(true)}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                                            title="Crear Premio de Catálogo"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {loyaltyRewards.map((item: any) => (
                                            <div key={item.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-white transition-colors flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{item.nombre}</h4>
                                                    <p className="text-[10px] text-pink-600 font-bold uppercase mt-1">{item.costoPuntos} Puntos requeridos</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    item.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {item.activa ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                            </div>
                                        ))}
                                        {loyaltyRewards.length === 0 && (
                                            <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay premios de catálogo creados.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 7. PUNTOS DE CLIENTES */}
                    {activeTab === 'points' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Coins className="text-amber-500" size={18} /> Balance de Puntos de Clientes
                                    </h3>
                                    <button 
                                        onClick={() => setIsPointsAdjustmentModalOpen(true)}
                                        className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                    >
                                        Ajuste Manual
                                    </button>
                                </div>
                                {pointsRankings.length === 0 ? (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center">Ningún cliente tiene puntos acumulados todavía.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                    <th className="pb-3">Cliente</th>
                                                    <th className="pb-3">Balance de Puntos</th>
                                                    <th className="pb-3 text-right">Última Actualización</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pointsRankings.map((p: any) => (
                                                    <tr key={p.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-800">{p.Usuario?.nombre || 'Cliente'}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">{p.Usuario?.email}</p>
                                                        </td>
                                                        <td className="py-4 font-black text-slate-800">{p.puntos} pts</td>
                                                        <td className="py-4 text-right text-slate-400 text-[10px]">{new Date(p.updatedAt).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 8. CUPONES */}
                    {activeTab === 'coupons' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Módulo de Cupones Promocionales</span>
                                <button 
                                    onClick={() => setIsCouponModalOpen(true)}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
                                >
                                    + Crear Cupón
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {coupons.map((coupon: any) => (
                                    <div key={coupon.id} className="bg-white border border-slate-150 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100">
                                                {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}% DTO` : `$${coupon.valor} DTO`}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                coupon.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-450'
                                            }`}>
                                                {coupon.activa ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">
                                            CÓDIGO: <span style={{ color: primaryColor }}>{coupon.codigo}</span>
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold mb-4">
                                            {coupon.descripcion || 'Sin descripción'}
                                        </p>
                                        <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">Usos totales:</span>
                                                <span className="text-slate-800">{coupon.usosActuales} / {coupon.maxUsos || 'Ilimitado'}</span>
                                            </div>
                                            {coupon.fechaFin && (
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Vence:</span>
                                                    <span className="text-slate-800">{new Date(coupon.fechaFin).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {coupons.length === 0 && (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center col-span-3">No tienes cupones independientes creados.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 9. ESTADÍSTICAS */}
                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <BarChart2 className="text-blue-500" size={18} /> Conversiones e Impacto
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reservas Directas del Motor</span>
                                        <span className="text-xs font-black text-slate-850">{stats.completadas} citas</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Amigos Recomendados</span>
                                        <span className="text-xs font-black text-slate-850">{stats.referidosValidos} amigos</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tasa de Conversión Promedio</span>
                                        <span className="text-xs font-black text-slate-850">84.2%</span>
                                    </div>
                                    <div className="flex justify-between pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Retorno de Inversión Est. (ROI)</span>
                                        <span className="text-xs font-black text-emerald-600">+{stats.roiEstimado}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 10. HISTORIAL */}
                    {activeTab === 'history' && (
                        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <History className="text-slate-500" size={18} /> Auditoría del Growth Engine
                            </h3>
                            <div className="space-y-4">
                                {participantsHistory.map((log: any) => (
                                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                                        <div>
                                            <p className="font-black text-slate-850 uppercase">{log.action}</p>
                                            <p className="text-slate-450 text-[10px] mt-0.5">Cliente: {log.Usuario?.nombre || 'Cliente'} - Reto: {log.Quest?.nombre}</p>
                                            {log.detalles && <p className="text-[9px] text-slate-400 font-semibold mt-1 italic">Detalles: {log.detalles}</p>}
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-black">{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                ))}
                                {participantsHistory.length === 0 && (
                                    <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay registros de auditoría registrados.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isWizardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-6xl shadow-2xl p-8 max-h-[92vh] overflow-y-auto flex flex-col">
                        
                        {/* WIZARD HEADER */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        {editingQuestId ? 'Editar Desafío / Misión' : 'Asistente de Misiones'} <span className="text-pink-500 font-extrabold text-[10px] bg-pink-50 px-2 py-0.5 rounded-full">Growth Engine v2</span>
                                    </h3>
                                </div>
                                <p className="text-slate-400 text-[10px] font-bold mt-0.5">
                                    Paso {wizardStep} de 7 {wizardStep === 0 ? "(Configuración Inicial)" : ""}
                                </p>
                            </div>
                            <button onClick={() => { setIsWizardOpen(false); setEditingQuestId(null); }} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
                        </div>

                        {/* BARRA DE PROGRESO DE PASOS */}
                        <div className="mb-8 hidden sm:block">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                                {[
                                    { step: 0, label: 'Inicio' },
                                    { step: 1, label: 'Categoría' },
                                    { step: 2, label: 'Acción' },
                                    { step: 3, label: 'Condiciones' },
                                    { step: 4, label: 'Recompensas' },
                                    { step: 5, label: 'Validación' },
                                    { step: 6, label: 'Ajustes' },
                                    { step: 7, label: 'Resumen' }
                                ].map((s) => {
                                    const isCompleted = wizardStep > s.step;
                                    const isActive = wizardStep === s.step;
                                    return (
                                        <button
                                            key={s.step}
                                            onClick={() => {
                                                if (s.step <= wizardStep || isCompleted) {
                                                    setWizardStep(s.step);
                                                }
                                            }}
                                            className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                                            disabled={s.step > wizardStep && !isCompleted}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                                isCompleted 
                                                    ? 'bg-emerald-500 text-white shadow-md' 
                                                    : isActive 
                                                        ? 'bg-pink-500 text-white shadow-lg ring-4 ring-pink-100 scale-110' 
                                                        : 'bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-slate-100'
                                            }`}>
                                                {isCompleted ? '✓' : s.step}
                                            </div>
                                            <span className={`text-[9px] font-bold mt-2 uppercase tracking-wider transition-colors ${
                                                isActive ? 'text-pink-600 font-extrabold' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                                            }`}>
                                                {s.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CUERPO DEL MODAL (DOBLE COLUMNA: FORMULARIO + VISTA PREVIA) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 overflow-y-auto">
                            
                            {/* COLUMNA IZQUIERDA: FORMULARIO */}
                            <div className="lg:col-span-8 space-y-6">

                                {/* PASO 0: INICIO (DESDE PLANTILLA, IA O CERO) */}
                                {wizardStep === 0 && (
                                    <div className="space-y-6">
                                        <div className="text-center max-w-xl mx-auto py-2">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">¿Cómo deseas crear tu campaña de crecimiento?</h4>
                                            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                                                Elige el método que mejor se adapte a tu flujo. El asistente inteligente te guiará en cada paso.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Opción A: Plantillas Locales */}
                                            <div className="p-6 border border-slate-150 rounded-3xl bg-slate-50 hover:bg-white hover:border-pink-300 hover:shadow-lg transition-all flex flex-col justify-between group">
                                                <div>
                                                    <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center mb-4 group-hover:bg-pink-100 transition-colors">
                                                        <Trophy className="text-pink-500" size={20} />
                                                    </div>
                                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">Plantillas Citiox</h5>
                                                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-4">
                                                        Elige entre 6 configuraciones prediseñadas listas para captar y fidelizar clientes.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setWizardStep(1.5)}
                                                    className="w-full py-2.5 bg-pink-50 text-pink-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-100 cursor-pointer"
                                                >
                                                    Explorar Plantillas
                                                </button>
                                            </div>

                                            {/* Opción B: Asistente IA de Citiox */}
                                            <div className="p-6 border border-slate-150 rounded-3xl bg-slate-50 hover:bg-white hover:border-purple-300 hover:shadow-lg transition-all flex flex-col justify-between group">
                                                <div>
                                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                                                        <Bot className="text-purple-500" size={20} />
                                                    </div>
                                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">Asistente IA de Citiox</h5>
                                                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-4">
                                                        Describe tu idea en lenguaje natural y la IA autocompletará el formulario en segundos.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setWizardStep(1.6)}
                                                    className="w-full py-2.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 cursor-pointer"
                                                >
                                                    Escribir Idea
                                                </button>
                                            </div>

                                            {/* Opción C: Desde Cero */}
                                            <div className="p-6 border border-slate-150 rounded-3xl bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between group">
                                                <div>
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
                                                        <Plus className="text-slate-600" size={20} />
                                                    </div>
                                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">Crear Desde Cero</h5>
                                                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-4">
                                                        Define paso a paso las categorías, condiciones, límites y las recompensas personalizadas.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setWizardStep(1)}
                                                    className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
                                                >
                                                    Iniciar Asistente
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SUB-PASO 1.5: SELECCIONAR PLANTILLA LOCAL */}
                                {wizardStep === 1.5 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setWizardStep(0)} className="p-2 border border-slate-150 rounded-xl hover:bg-slate-50 cursor-pointer">
                                                <ChevronLeft size={16} className="text-slate-500" />
                                            </button>
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Selecciona una Plantilla Citiox Recomendada</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {LOCAL_TEMPLATES.map((tpl) => (
                                                <div
                                                    key={tpl.id}
                                                    className="p-5 border border-slate-150 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-md transition-all hover:border-pink-300 flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tpl.color}15`, color: tpl.color }}>
                                                                {tpl.categoria}
                                                            </span>
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tpl.color}15` }}>
                                                                <Trophy color={tpl.color} size={16} />
                                                            </div>
                                                        </div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">{tpl.nombre}</h5>
                                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-4">{tpl.descripcion}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleApplyLocalTemplate(tpl)}
                                                        className="w-full py-2 border border-slate-150 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-center"
                                                    >
                                                        Utilizar esta plantilla
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SUB-PASO 1.6: ASISTENTE DE TEXTO LIBRE CON IA */}
                                {wizardStep === 1.6 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setWizardStep(0)} className="p-2 border border-slate-150 rounded-xl hover:bg-slate-50 cursor-pointer">
                                                <ChevronLeft size={16} className="text-slate-500" />
                                            </button>
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <Bot size={16} className="text-purple-500" /> Asistente IA de Citiox (Natural Language)
                                            </h4>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                                Describe lo que quieres conseguir. Por ejemplo: <i>"Misión de reservas para que completen 5 masajes relax los viernes, den 100 puntos y un cupón de 10% de descuento con prioridad destacada"</i>.
                                            </p>
                                            <textarea
                                                value={iaInputText}
                                                onChange={e => setIaInputText(e.target.value)}
                                                className="w-full h-32 px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-300 bg-slate-50"
                                                placeholder="Ej: Quiero premiar a los clientes por invitar a 3 amigos con un cupón de $15 de descuento y enviarle un mensaje automático de WhatsApp..."
                                            />
                                            <button
                                                onClick={handleIaParse}
                                                disabled={isIaProcessing}
                                                className="w-full py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest bg-purple-500 hover:bg-purple-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                {isIaProcessing ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={14} />
                                                        Analizando tu propuesta...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={14} />
                                                        Analizar y Rellenar Formulario
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 1: ¿QUÉ QUIERES PREMIAR? */}
                                {wizardStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">¿Qué categoría deseas premiar?</h4>
                                            <button 
                                                onClick={() => setWizardStep(1.6)}
                                                className="text-[9px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 hover:bg-purple-100 transition-all cursor-pointer"
                                            >
                                                ✨ Usar IA de Citiox
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {QUEST_ACTIONS_CATALOG.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleSelectObjetivo(opt.id)}
                                                    className={`p-5 border rounded-3xl text-left transition-all hover:shadow-md hover:border-pink-300 flex items-start gap-4 cursor-pointer ${
                                                        wizardData.categoria === opt.id ? 'border-pink-500 bg-pink-50/20 shadow-sm' : 'border-slate-150 bg-slate-50 hover:bg-white'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${opt.color}15` }}>
                                                        {opt.icono === 'Calendar' && <Calendar style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'Users' && <Users style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'Star' && <Star style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'ShoppingBag' && <ShoppingBag style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'UserCheck' && <UserCheck style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'Cake' && <Cake style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'Share2' && <Share2 style={{ color: opt.color }} size={20} />}
                                                        {opt.icono === 'Sparkles' && <Sparkles style={{ color: opt.color }} size={20} />}
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1">{opt.label}</span>
                                                        <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">{opt.desc}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={() => setWizardStep(0)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 2: ACCIÓN Y TRIGGERS DEL CLIENTE */}
                                {wizardStep === 2 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Detalles y Configuración de Eventos</h4>
                                        
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nombre del Reto / Misión</label>
                                                    <input
                                                        type="text"
                                                        value={wizardData.nombre}
                                                        onChange={e => setWizardData(prev => ({ ...prev, nombre: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                                        placeholder="Ej: Reto de Fidelidad Express"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Evento Detonador (Trigger)</label>
                                                    <select
                                                        value={wizardData.triggerEvent}
                                                        onChange={e => {
                                                            const evId = e.target.value;
                                                            const catalogCat = QUEST_ACTIONS_CATALOG.find(c => c.id === wizardData.categoria);
                                                            const ev = catalogCat?.eventos.find(x => x.id === evId);
                                                            setWizardData(prev => ({
                                                                ...prev,
                                                                triggerEvent: evId,
                                                                cantidadMeta: ev?.defaultMeta || 1,
                                                                progresoTipo: ev?.type || 'SIMPLE'
                                                            }));
                                                        }}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-pink-300"
                                                    >
                                                        {QUEST_ACTIONS_CATALOG.find(c => c.id === wizardData.categoria)?.eventos.map(ev => (
                                                            <option key={ev.id} value={ev.id}>{ev.label}</option>
                                                        )) || (
                                                            <option value="CUSTOM_EVENT">Evento Personalizado</option>
                                                        )}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Validar disponibilidad de trigger en el motor backend */}
                                            <div className="p-3.5 border rounded-2xl bg-slate-50 flex items-center gap-3">
                                                {['BOOKING_COMPLETED', 'REVIEW_CREATED'].includes(wizardData.triggerEvent) ? (
                                                    <>
                                                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">✅ Disponible en el motor automático de Citiox</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">⚠ Requiere validación manual del staff al completarse</span>
                                                    </>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción pública para el cliente</label>
                                                <textarea
                                                    value={wizardData.descripcion}
                                                    onChange={e => setWizardData(prev => ({ ...prev, descripcion: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50 h-20"
                                                    placeholder="Detalla qué debe hacer exactamente el cliente..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Frecuencia / Conteo</label>
                                                    <select
                                                        value={wizardData.progresoTipo}
                                                        onChange={e => {
                                                            const type = e.target.value as 'SIMPLE' | 'ACUMULATIVO';
                                                            setWizardData(prev => ({
                                                                ...prev,
                                                                progresoTipo: type,
                                                                cantidadMeta: type === 'SIMPLE' ? 1 : 5
                                                            }));
                                                        }}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-pink-300"
                                                    >
                                                        <option value="SIMPLE">Una sola vez (Meta = 1)</option>
                                                        <option value="ACUMULATIVO">Acumulativo (Completar múltiples veces)</option>
                                                    </select>
                                                </div>
                                                {wizardData.progresoTipo === 'ACUMULATIVO' && (
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Meta de Veces Requerida</label>
                                                        <input
                                                            type="number"
                                                            value={wizardData.cantidadMeta}
                                                            onChange={e => setWizardData(prev => ({ ...prev, cantidadMeta: Number(e.target.value) }))}
                                                            className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                                            min={1}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 3: CONDICIONES DINÁMICAS (`+ Agregar Condición`) */}
                                {wizardStep === 3 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Ajustar Filtros y Condiciones Avanzadas (Opcionales)</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                            Restringe esta misión para servicios, días, horarios o segmentos específicos. Deja vacío para aplicar de forma general.
                                        </p>

                                        {/* Listado de condiciones agregadas */}
                                        <div className="space-y-3">
                                            {wizardData.condiciones && wizardData.condiciones.length > 0 ? (
                                                wizardData.condiciones.map((cond: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center p-3.5 border border-slate-150 rounded-2xl bg-slate-50">
                                                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-600">{cond.field}</span>
                                                            <span className="text-slate-400">{cond.operator}</span>
                                                            <span className="text-slate-800">
                                                                {cond.field === 'servicioId' 
                                                                    ? servicesList.find(s => s.id === cond.value)?.nombre || cond.value 
                                                                    : cond.value}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setWizardData(prev => ({
                                                                    ...prev,
                                                                    condiciones: prev.condiciones.filter((_: any, i: number) => i !== idx)
                                                                }));
                                                            }}
                                                            className="text-red-500 hover:text-red-700 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-5 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-[10px] font-bold">
                                                    Sin filtros activos. La misión aplica a todo el negocio.
                                                </div>
                                            )}
                                        </div>

                                        {/* Selector para añadir nueva condición */}
                                        <div className="p-5 border border-slate-150 rounded-3xl bg-slate-50/50 space-y-4">
                                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <PlusCircle size={14} /> Agregar Filtro Condicional
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Campo</label>
                                                    <select
                                                        value={newCondition.field}
                                                        onChange={e => setNewCondition(prev => ({ ...prev, field: e.target.value, value: '' }))}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                    >
                                                        <option value="servicioId">Servicio Específico</option>
                                                        <option value="categoriaId">Categoría de Servicio</option>
                                                        <option value="clienteVip">Cliente VIP (True/False)</option>
                                                        <option value="clienteNuevo">Cliente Nuevo (True/False)</option>
                                                        <option value="diaSemana">Día de la Semana</option>
                                                        <option value="horarioCompleto">Horario Específico</option>
                                                        <option value="genero">Género</option>
                                                        <option value="edadMinima">Edad Mínima</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Operador</label>
                                                    <select
                                                        value={newCondition.operator}
                                                        onChange={e => setNewCondition(prev => ({ ...prev, operator: e.target.value }))}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                    >
                                                        <option value="equals">Igual a (equals)</option>
                                                        <option value="greater_than">Mayor que (&gt;)</option>
                                                        <option value="less_than">Menor que (&lt;)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Valor</label>
                                                    {newCondition.field === 'servicioId' ? (
                                                        <select
                                                            value={newCondition.value}
                                                            onChange={e => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="">Selecciona servicio...</option>
                                                            {servicesList.map((s: any) => (
                                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                                            ))}
                                                        </select>
                                                    ) : newCondition.field === 'diaSemana' ? (
                                                        <select
                                                            value={newCondition.value}
                                                            onChange={e => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="">Selecciona día...</option>
                                                            <option value="LUNES">Lunes</option>
                                                            <option value="MARTES">Martes</option>
                                                            <option value="MIERCOLES">Miércoles</option>
                                                            <option value="JUEVES">Jueves</option>
                                                            <option value="VIERNES">Viernes</option>
                                                            <option value="SABADO">Sábado</option>
                                                            <option value="DOMINGO">Domingo</option>
                                                        </select>
                                                    ) : newCondition.field === 'clienteVip' || newCondition.field === 'clienteNuevo' ? (
                                                        <select
                                                            value={newCondition.value}
                                                            onChange={e => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="">Selecciona...</option>
                                                            <option value="true">Sí (True)</option>
                                                            <option value="false">No (False)</option>
                                                        </select>
                                                    ) : newCondition.field === 'genero' ? (
                                                        <select
                                                            value={newCondition.value}
                                                            onChange={e => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                        >
                                                            <option value="">Selecciona...</option>
                                                            <option value="Femenino">Femenino</option>
                                                            <option value="Masculino">Masculino</option>
                                                            <option value="Otro">Otro</option>
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={newCondition.value}
                                                            onChange={e => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-150 text-[10px] font-bold bg-white text-slate-850"
                                                            placeholder="Ej: Faciales, 18, etc."
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    if (!newCondition.value) {
                                                        showToast('Especifica un valor para la condición', 'error');
                                                        return;
                                                    }
                                                    setWizardData(prev => ({
                                                        ...prev,
                                                        condiciones: [...(prev.condiciones || []), { ...newCondition }]
                                                    }));
                                                    setNewCondition({ field: 'servicioId', operator: 'equals', value: '' });
                                                    showToast('Filtro condicional añadido', 'success');
                                                }}
                                                className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-pink-100 cursor-pointer"
                                            >
                                                Añadir Filtro
                                            </button>
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 4: RECOMPENSAS Y CANALES AUTOMATIZADOS (Unificado y combinable) */}
                                {wizardStep === 4 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Unificar Premios y Canales Automatizados</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                            Selecciona múltiples recompensas para acumular valor. Puedes combinarlas libremente.
                                        </p>

                                        <div className="space-y-4">
                                            {/* Recompensa de Puntos */}
                                            <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={wizardData.recompensasSeleccionadas.puntos}
                                                        onChange={e => setWizardData(prev => ({
                                                            ...prev,
                                                            recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, puntos: e.target.checked }
                                                        }))}
                                                        className="size-4 rounded accent-pink-500"
                                                    />
                                                    <div>
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">Puntos de fidelidad</span>
                                                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Sumar saldo de puntos directo al cliente</span>
                                                    </div>
                                                </label>
                                                {wizardData.recompensasSeleccionadas.puntos && (
                                                    <input
                                                        type="number"
                                                        value={wizardData.puntosRecompensa}
                                                        onChange={e => setWizardData(prev => ({ ...prev, puntosRecompensa: Number(e.target.value) }))}
                                                        className="w-32 px-3 py-2 rounded-xl border border-slate-150 text-xs font-bold bg-white text-slate-800"
                                                        min={1}
                                                    />
                                                )}
                                            </div>

                                            {/* Recompensa de Cupón */}
                                            <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50 space-y-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={wizardData.recompensasSeleccionadas.cupon}
                                                        onChange={e => setWizardData(prev => ({
                                                            ...prev,
                                                            recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, cupon: e.target.checked }
                                                        }))}
                                                        className="size-4 rounded accent-pink-500"
                                                    />
                                                    <div>
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">Cupón de Descuento</span>
                                                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Genera un código de descuento autodeclarante</span>
                                                    </div>
                                                </label>
                                                {wizardData.recompensasSeleccionadas.cupon && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
                                                        <div>
                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Nombre Cupón</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.cuponNombre}
                                                                onChange={e => setWizardData(prev => ({ ...prev, cuponNombre: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-800 bg-white"
                                                                placeholder="Ej. Cupón Citas"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Valor</label>
                                                            <input
                                                                type="number"
                                                                value={wizardData.cuponValor}
                                                                onChange={e => setWizardData(prev => ({ ...prev, cuponValor: Number(e.target.value) }))}
                                                                className="w-full px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-800 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Tipo</label>
                                                            <select
                                                                value={wizardData.cuponTipo}
                                                                onChange={e => setWizardData(prev => ({ ...prev, cuponTipo: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-800 bg-white"
                                                            >
                                                                <option value="PORCENTAJE">Porcentaje (%)</option>
                                                                <option value="FIJO">Fijo ($)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recompensa de Producto / Servicio de Regalo */}
                                            <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50 space-y-4">
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardData.recompensasSeleccionadas.productoGratis}
                                                            onChange={e => setWizardData(prev => ({
                                                                ...prev,
                                                                recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, productoGratis: e.target.checked }
                                                            }))}
                                                            className="size-4 rounded accent-pink-500"
                                                        />
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Producto Gratis</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardData.recompensasSeleccionadas.servicioGratis}
                                                            onChange={e => setWizardData(prev => ({
                                                                ...prev,
                                                                recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, servicioGratis: e.target.checked }
                                                            }))}
                                                            className="size-4 rounded accent-pink-500"
                                                        />
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Servicio de Regalo</span>
                                                    </label>
                                                </div>

                                                {wizardData.recompensasSeleccionadas.productoGratis && (
                                                    <div className="pl-7">
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Nombre del producto de regalo</label>
                                                        <input
                                                            type="text"
                                                            value={wizardData.productoGratisNombre}
                                                            onChange={e => setWizardData(prev => ({ ...prev, productoGratisNombre: e.target.value }))}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-800 bg-white"
                                                            placeholder="Ej. Crema hidratante corporal"
                                                        />
                                                    </div>
                                                )}

                                                {wizardData.recompensasSeleccionadas.servicioGratis && (
                                                    <div className="pl-7">
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Nombre del servicio gratis</label>
                                                        <input
                                                            type="text"
                                                            value={wizardData.servicioGratisNombre}
                                                            onChange={e => setWizardData(prev => ({ ...prev, servicioGratisNombre: e.target.value }))}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-800 bg-white"
                                                            placeholder="Ej. Masaje Express facial"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recompensa de Cashback */}
                                            <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={wizardData.recompensasSeleccionadas.cashback}
                                                        onChange={e => setWizardData(prev => ({
                                                            ...prev,
                                                            recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, cashback: e.target.checked }
                                                        }))}
                                                        className="size-4 rounded accent-pink-500"
                                                    />
                                                    <div>
                                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">Cashback en Monedero ($)</span>
                                                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Dinero real acumulado para su próxima reserva</span>
                                                    </div>
                                                </label>
                                                {wizardData.recompensasSeleccionadas.cashback && (
                                                    <input
                                                        type="number"
                                                        value={wizardData.cashbackMonto}
                                                        onChange={e => setWizardData(prev => ({ ...prev, cashbackMonto: Number(e.target.value) }))}
                                                        className="w-32 px-3 py-2 rounded-xl border border-slate-150 text-xs font-bold bg-white text-slate-800"
                                                        min={1}
                                                    />
                                                )}
                                            </div>

                                            {/* CANALES AUTOMATIZADOS DE NOTIFICACIÓN */}
                                            <div className="p-5 border border-purple-100 rounded-3xl bg-purple-50/20 space-y-4">
                                                <h5 className="text-[10px] font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                                                    <Sparkle size={14} className="animate-spin" /> Automatizaciones de Notificación
                                                </h5>

                                                {/* Checkboxes de Canales */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-purple-100 bg-white rounded-xl">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardData.recompensasSeleccionadas.whatsapp}
                                                            onChange={e => setWizardData(prev => ({
                                                                ...prev,
                                                                recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, whatsapp: e.target.checked }
                                                            }))}
                                                            className="size-4 rounded accent-purple-500"
                                                        />
                                                        <span className="text-[10px] font-bold text-purple-800">WhatsApp Directo</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-purple-100 bg-white rounded-xl">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardData.recompensasSeleccionadas.push}
                                                            onChange={e => setWizardData(prev => ({
                                                                ...prev,
                                                                recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, push: e.target.checked }
                                                            }))}
                                                            className="size-4 rounded accent-purple-500"
                                                        />
                                                        <span className="text-[10px] font-bold text-purple-800">Notificación Push</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-purple-100 bg-white rounded-xl">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardData.recompensasSeleccionadas.email}
                                                            onChange={e => setWizardData(prev => ({
                                                                ...prev,
                                                                recompensasSeleccionadas: { ...prev.recompensasSeleccionadas, email: e.target.checked }
                                                            }))}
                                                            className="size-4 rounded accent-purple-500"
                                                        />
                                                        <span className="text-[10px] font-bold text-purple-800">Correo Electrónico</span>
                                                    </label>
                                                </div>

                                                {/* Textareas para redactar notificaciones */}
                                                {wizardData.recompensasSeleccionadas.whatsapp && (
                                                    <div className="space-y-2">
                                                        <label className="block text-[8px] font-black text-purple-500 uppercase tracking-wider">Mensaje de WhatsApp (Soporta variables)</label>
                                                        <textarea
                                                            value={wizardData.whatsappMensaje}
                                                            onChange={e => setWizardData(prev => ({ ...prev, whatsappMensaje: e.target.value }))}
                                                            className="w-full h-16 p-3 rounded-xl border border-purple-100 text-[10px] font-bold bg-white text-slate-800 focus:outline-none"
                                                            placeholder="Usa {{nombre}} para personalizar..."
                                                        />
                                                    </div>
                                                )}

                                                {wizardData.recompensasSeleccionadas.push && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[8px] font-black text-purple-500 uppercase tracking-wider mb-1">Título Notificación</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.pushTitulo}
                                                                onChange={e => setWizardData(prev => ({ ...prev, pushTitulo: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded-xl border border-purple-100 text-[10px] font-bold bg-white text-slate-800"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] font-black text-purple-500 uppercase tracking-wider mb-1">Cuerpo Notificación</label>
                                                            <input
                                                                type="text"
                                                                value={wizardData.pushCuerpo}
                                                                onChange={e => setWizardData(prev => ({ ...prev, pushCuerpo: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded-xl border border-purple-100 text-[10px] font-bold bg-white text-slate-800"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 5: MÉTODOS DE VALIDACIÓN */}
                                {wizardStep === 5 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Método de Validación del Progreso</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                            Elige cómo se aprueban las acciones y el progreso de los retos del cliente.
                                        </p>

                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { id: 'AUTOMATICO', label: 'Validación Automática', desc: 'El motor de triggers calcula en tiempo real a través de las APIs (Reservas completadas o Reseñas).' },
                                                { id: 'CLIENTE', label: 'El Cliente Confirma', desc: 'El cliente sube un comprobante o pulsa completar y queda pendiente de validación en recepción.' },
                                                { id: 'ADMINISTRADOR', label: 'Aprobación del Staff', desc: 'El personal del spa aprueba manualmente el progreso de la misión en el panel administrativo.' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setWizardData(prev => ({ ...prev, validacionTipo: opt.id }))}
                                                    className={`p-5 border rounded-3xl text-left transition-all hover:border-pink-300 flex items-start gap-4 cursor-pointer ${
                                                        wizardData.validacionTipo === opt.id ? 'border-pink-500 bg-pink-50/20 shadow-sm' : 'border-slate-150 bg-slate-50 hover:bg-white'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                                        wizardData.validacionTipo === opt.id ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-300'
                                                    }`}>
                                                        {wizardData.validacionTipo === opt.id && <Check size={10} />}
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1">{opt.label}</span>
                                                        <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">{opt.desc}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 6: CONFIGURACIÓN GENERAL Y GAMIFICACIÓN CON IA */}
                                {wizardStep === 6 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Ajustes Generales y Gamificación</h4>
                                            <button
                                                onClick={handleIaGamificationSuggestions}
                                                disabled={isIaGamificationAnimating}
                                                className="text-[9px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 hover:bg-purple-100 transition-all cursor-pointer"
                                            >
                                                {isIaGamificationAnimating ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Bot size={12} />
                                                )}
                                                ✨ Sugerencias de Gamificación con IA
                                            </button>
                                        </div>

                                        {/* Tarjeta de Sugerencia de la IA */}
                                        {iaSugerencia && (
                                            <div className="p-5 border border-purple-100 bg-purple-50/30 rounded-3xl space-y-4 animate-slideIn">
                                                <div className="text-[10px] font-semibold text-purple-800 leading-relaxed whitespace-pre-line">
                                                    {iaSugerencia}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleApplyIaImprovements}
                                                        className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-purple-700 cursor-pointer"
                                                    >
                                                        Aplicar Mejoras
                                                    </button>
                                                    <button
                                                        onClick={() => setIaSugerencia(null)}
                                                        className="px-3.5 py-2 border border-purple-200 text-purple-600 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-purple-50 cursor-pointer"
                                                    >
                                                        Descartar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prioridad Misión</label>
                                                    <select
                                                        value={wizardData.prioridad}
                                                        onChange={e => setWizardData(prev => ({ ...prev, prioridad: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                                    >
                                                        <option value="DESTACADA">⭐ Destacada (Alta Visibilidad)</option>
                                                        <option value="ALTA">Alta</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="BAJA">Baja</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Dificultad Visual</label>
                                                    <select
                                                        value={wizardData.dificultad}
                                                        onChange={e => setWizardData(prev => ({ ...prev, dificultad: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                                    >
                                                        <option value="FACIL">Fácil</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="DIFICIL">Difícil</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Estado Campaña</label>
                                                    <select
                                                        value={wizardData.estado}
                                                        onChange={e => setWizardData(prev => ({ ...prev, estado: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                                    >
                                                        <option value="ACTIVA">🟢 Activa</option>
                                                        <option value="BORRADOR">📁 Borrador</option>
                                                        <option value="PAUSADA">🟡 Pausada</option>
                                                        <option value="FINALIZADA">🔴 Finalizada</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Límite por Cliente</label>
                                                    <input
                                                        type="number"
                                                        value={wizardData.limiteUsuario}
                                                        onChange={e => setWizardData(prev => ({ ...prev, limiteUsuario: Number(e.target.value) }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-805 focus:outline-none bg-slate-50"
                                                        placeholder="Ilimitado = 99"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Límite Total (Global)</label>
                                                    <input
                                                        type="number"
                                                        value={wizardData.limiteGlobal}
                                                        onChange={e => setWizardData(prev => ({ ...prev, limiteGlobal: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-805 focus:outline-none bg-slate-50"
                                                        placeholder="Ilimitado = vacío"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Doble Premio / Repetible</label>
                                                    <select
                                                        value={wizardData.repetible ? 'true' : 'false'}
                                                        onChange={e => setWizardData(prev => ({ ...prev, repetible: e.target.value === 'true' }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                                    >
                                                        <option value="false">No (Una sola vez en total)</option>
                                                        <option value="true">Sí (Volver a empezar al completar)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Fecha de Inicio</label>
                                                    <input
                                                        type="date"
                                                        value={wizardData.fechaInicio}
                                                        onChange={e => setWizardData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none bg-slate-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Fecha de Finalización</label>
                                                    <input
                                                        type="date"
                                                        value={wizardData.fechaFin}
                                                        onChange={e => setWizardData(prev => ({ ...prev, fechaFin: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none bg-slate-50"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                            <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Revisar Resumen</button>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 7: VISTA PREVIA Y AUDITORÍA */}
                                {wizardStep === 7 && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Confirmación y Auditoría del Administrador</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                            Tu misión está lista. Las acciones de auditoría se guardarán automáticamente en tu historial local de cambios para referencia de tu equipo.
                                        </p>

                                        <div className="space-y-4 p-5 bg-slate-50 border border-slate-150 rounded-3xl text-[10px] font-bold text-slate-750">
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Categoría:</span>
                                                <span className="text-slate-800 uppercase tracking-wider font-extrabold">{wizardData.categoria}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Reto:</span>
                                                <span className="text-slate-800">{wizardData.nombre}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Trigger:</span>
                                                <span className="text-purple-600 font-extrabold">{wizardData.triggerEvent}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Meta:</span>
                                                <span className="text-slate-800">{wizardData.cantidadMeta} veces</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Validación:</span>
                                                <span className="text-emerald-600 uppercase tracking-wider">{wizardData.validacionTipo}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2.5">
                                                <span className="text-slate-400 uppercase tracking-wider">Estado / Prioridad:</span>
                                                <span className="text-slate-850">
                                                    {wizardData.estado} / {wizardData.prioridad}
                                                </span>
                                            </div>
                                            <div className="flex justify-between pb-1">
                                                <span className="text-slate-400 uppercase tracking-wider">Recompensas Seleccionadas:</span>
                                                <span className="text-slate-850 text-right">
                                                    {wizardData.recompensasSeleccionadas.puntos && `• ${wizardData.puntosRecompensa} Puntos\n`}
                                                    {wizardData.recompensasSeleccionadas.cupon && `• Cupón ${wizardData.cuponNombre} (${wizardData.cuponValor}${wizardData.cuponTipo === 'PORCENTAJE' ? '%' : '$'})\n`}
                                                    {wizardData.recompensasSeleccionadas.productoGratis && `• Producto: ${wizardData.productoGratisNombre}\n`}
                                                    {wizardData.recompensasSeleccionadas.servicioGratis && `• Servicio: ${wizardData.servicioGratisNombre}\n`}
                                                    {wizardData.recompensasSeleccionadas.cashback && `• Cashback: $${wizardData.cashbackMonto}\n`}
                                                    {wizardData.recompensasSeleccionadas.whatsapp && `• Notificación WhatsApp\n`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                            <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer" disabled={submitting}>Atrás</button>
                                            <button 
                                                onClick={handleCreateQuestFromWizard}
                                                className="px-6 py-3.5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
                                                style={{ backgroundColor: primaryColor }}
                                                disabled={submitting}
                                            >
                                                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                                                Confirmar y Publicar Reto
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* COLUMNA DERECHA: TICKET VISTA PREVIA EN TIEMPO REAL */}
                            <div className="lg:col-span-4 lg:sticky lg:top-4 bg-slate-50 border border-slate-150 rounded-3xl p-6 space-y-6">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-200/60 pb-3">
                                    <Eye size={14} /> Vista Previa del Cliente (Vivo)
                                </h5>

                                <div className="space-y-4">
                                    {/* Simulación de la Tarjeta en la App del Cliente */}
                                    <div className="rounded-3xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 animate-pulse-subtle" style={{ backgroundColor: wizardData.color || '#ec4899' }}>
                                        <div className="flex justify-between items-start relative z-10">
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                                                {wizardData.categoria || 'RESERVAS'}
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                <Trophy color="#ffffff" size={16} />
                                            </div>
                                        </div>

                                        <div className="space-y-1 relative z-10">
                                            <h6 className="text-xs font-black uppercase tracking-wider truncate">{wizardData.nombre || 'Reto Sin Nombre'}</h6>
                                            <p className="text-[9px] text-white/80 font-medium line-clamp-2 leading-relaxed">
                                                {wizardData.descripcion || 'Completa esta acción para ganar recompensas exclusivas.'}
                                            </p>
                                        </div>

                                        {/* Barra de progreso simulada */}
                                        <div className="space-y-1.5 relative z-10 pt-2">
                                            <div className="flex justify-between text-[8px] font-black uppercase">
                                                <span>Progreso</span>
                                                <span>0 / {wizardData.cantidadMeta || 1}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: '30%' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Beneficios / Premios en la Vista Previa */}
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Lo que el cliente ganará:</span>
                                        <div className="space-y-2">
                                            {wizardData.recompensasSeleccionadas.puntos && (
                                                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800">
                                                    <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">★</div>
                                                    <span>+{wizardData.puntosRecompensa} Puntos de Fidelidad</span>
                                                </div>
                                            )}
                                            {wizardData.recompensasSeleccionadas.cupon && (
                                                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800">
                                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">%</div>
                                                    <span>Cupón: {wizardData.cuponValor}{wizardData.cuponTipo === 'PORCENTAJE' ? '%' : '$'} Descuento</span>
                                                </div>
                                            )}
                                            {wizardData.recompensasSeleccionadas.productoGratis && (
                                                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800">
                                                    <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">🎁</div>
                                                    <span className="truncate">Regalo: {wizardData.productoGratisNombre || 'Producto de Regalo'}</span>
                                                </div>
                                            )}
                                            {wizardData.recompensasSeleccionadas.servicioGratis && (
                                                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800">
                                                    <div className="w-5 h-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">✦</div>
                                                    <span className="truncate">Servicio: {wizardData.servicioGratisNombre || 'Servicio de Regalo'}</span>
                                                </div>
                                            )}
                                            {wizardData.recompensasSeleccionadas.cashback && (
                                                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800">
                                                    <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">$</div>
                                                    <span>Cashback: ${wizardData.cashbackMonto} en Monedero</span>
                                                </div>
                                            )}
                                            {!Object.values(wizardData.recompensasSeleccionadas).some(v => v === true) && (
                                                <span className="text-[9px] text-slate-400 font-bold block italic">Sin recompensas seleccionadas</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL: ENTREGAR PREMIO FÍSICO */}
            {selectedRewardToCanje && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Confirmar Entrega de Premio</h3>
                            <button onClick={() => setSelectedRewardToCanje(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold">
                                <p className="text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                                <p className="text-slate-800 font-black">{selectedRewardToCanje.Usuario?.nombre}</p>
                                <p className="text-slate-400 font-semibold mt-1">{selectedRewardToCanje.Usuario?.phone}</p>

                                <p className="text-slate-400 uppercase tracking-wider mb-1 mt-4">Premio a Entregar</p>
                                <p className="text-slate-800 font-black uppercase">{selectedRewardToCanje.Campaign?.valorRecompensa || selectedRewardToCanje.Reward?.nombre}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">¿Quién entrega el premio? (Staff)</label>
                                <select
                                    value={canjeStaffId}
                                    onChange={e => setCanjeStaffId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                >
                                    {staffList.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                    {staffList.length === 0 && <option value="">Sin personal configurado</option>}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Notas internas</label>
                                <input
                                    type="text"
                                    value={canjeNotas}
                                    onChange={e => setCanjeNotas(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Ej. Entregado sin observaciones"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button onClick={() => setSelectedRewardToCanje(null)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                onClick={handleConfirmCanjeFisico} 
                                className="px-5 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 cursor-pointer flex items-center gap-2"
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREAR CUPÓN PROMOCIONAL */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateCoupon} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Crear Nuevo Cupón</h3>
                            <button type="button" onClick={() => setIsCouponModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Código del Cupón</label>
                                <input
                                    type="text"
                                    value={couponFormData.codigo}
                                    onChange={e => setCouponFormData(prev => ({ ...prev, codigo: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 uppercase bg-slate-50 focus:outline-none"
                                    placeholder="Ej. PROMO20"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        value={couponFormData.tipo}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="PORCENTAJE">Porcentaje (%)</option>
                                        <option value="FIJO">Monto Fijo ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Valor</label>
                                    <input
                                        type="number"
                                        value={couponFormData.valor}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, valor: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={couponFormData.descripcion}
                                    onChange={e => setCouponFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Breve descripción del descuento..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Usos Máximos</label>
                                    <input
                                        type="number"
                                        value={couponFormData.maxUsos}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, maxUsos: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. 100 (opcional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Vencimiento</label>
                                    <input
                                        type="date"
                                        value={couponFormData.fechaFin}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsCouponModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Crear Cupón
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: CREAR PREMIO DE CATÁLOGO */}
            {isCatalogRewardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateCatalogReward} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Crear Premio de Catálogo</h3>
                            <button type="button" onClick={() => setIsCatalogRewardModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nombre del Premio</label>
                                <input
                                    type="text"
                                    value={catalogRewardFormData.nombre}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Ej. Limpieza Facial Express"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Costo en Puntos</label>
                                <input
                                    type="number"
                                    value={catalogRewardFormData.costoPuntos}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, costoPuntos: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tipo Recompensa</label>
                                    <select
                                        value={catalogRewardFormData.tipo}
                                        onChange={e => setCatalogRewardFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="SERVICIO_GRATIS">Servicio Gratis</option>
                                        <option value="PRODUCTO">Producto</option>
                                        <option value="DESCUENTO">Descuento Especial</option>
                                        <option value="REGALO">Regalo Especial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Valor (opcional)</label>
                                    <input
                                        type="text"
                                        value={catalogRewardFormData.valor}
                                        onChange={e => setCatalogRewardFormData(prev => ({ ...prev, valor: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. ID del servicio o 20%"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Imagen del Premio</label>
                                <ImageUploader
                                    category="loyalty"
                                    aspect="square"
                                    currentUrl={catalogRewardFormData.imagenUrl}
                                    onUploadSuccess={(media) => setCatalogRewardFormData(prev => ({ ...prev, imagenUrl: media.url }))}
                                    onRemove={() => setCatalogRewardFormData(prev => ({ ...prev, imagenUrl: '' }))}
                                    label="Sube una foto del premio"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={catalogRewardFormData.descripcion}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Instrucciones o detalles de canje..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsCatalogRewardModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Crear Premio
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: AJUSTE MANUAL DE PUNTOS */}
            {isPointsAdjustmentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handlePointsAdjustment} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Ajuste Manual de Puntos</h3>
                            <button type="button" onClick={() => setIsPointsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Selecciona al Cliente</label>
                                <select
                                    value={pointsFormData.userId}
                                    onChange={e => setPointsFormData(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Elige un cliente --</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} ({u.email || u.phone})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Puntos</label>
                                    <input
                                        type="number"
                                        value={pointsFormData.puntos}
                                        onChange={e => setPointsFormData(prev => ({ ...prev, puntos: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. 100 o -50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Concepto</label>
                                    <select
                                        value={pointsFormData.concepto}
                                        onChange={e => setPointsFormData(prev => ({ ...prev, concepto: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="BONO">Bono Especial</option>
                                        <option value="RESERVA">Ajuste de Reserva</option>
                                        <option value="CUMPLEANOS">Cumpleaños</option>
                                        <option value="AJUSTE">Ajuste de Error</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Notas internas / Razón</label>
                                <input
                                    type="text"
                                    value={pointsFormData.notas}
                                    onChange={e => setPointsFormData(prev => ({ ...prev, notas: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Especifica el motivo..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsPointsAdjustmentModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Aplicar Ajuste
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
