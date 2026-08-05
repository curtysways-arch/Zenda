'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Users,
  Map,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  MoreVertical,
  Phone,
  MapPin,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Edit3,
  Trash2,
  ChevronRight,
  AlertCircle,
  Bike,
  Car,
  Footprints,
  Filter,
  History,
  Route,
  ShieldCheck,
  FileText,
  Eye,
  Send,
  UserCheck,
  UserX,
  Lock,
  Calendar,
  Mail,
  Share2,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type DriverEstado = 'DISPONIBLE' | 'OCUPADO' | 'FUERA_DE_SERVICIO';
type VerificationStatus = 'INVITED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type AssignmentEstado = 'ASIGNADO' | 'ACEPTADO' | 'EN_RUTA' | 'LLEGO' | 'COMPLETADO' | 'CANCELADO';
type AssignmentTipo = 'RETIRO' | 'ENTREGA';

interface Driver {
  id: string;
  name: string;
  avatar: string | null;
  estado: DriverEstado;
  active: boolean;
  createdAt?: string;
  profile?: {
    verificationStatus?: VerificationStatus;
    telefono?: string;
    vehiculo?: string;
    tipoVehiculo?: string;
    placa?: string;
    licencia?: string;
    documento?: string;
    fechaNacimiento?: string;
    direccion?: string;
    email?: string;
    contactoEmergencia?: string;
    marca?: string;
    modelo?: string;
    color?: string;
    anio?: string;
    cedulaFrenteUrl?: string;
    cedulaReversoUrl?: string;
    licenciaUrl?: string;
    matriculaUrl?: string;
    fotoVehiculoUrl?: string;
    selfieUrl?: string;
    observaciones?: string;
    motivoRechazo?: string;
  };
}

interface Assignment {
  id: string;
  tipo: AssignmentTipo;
  estado: AssignmentEstado;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion: string;
  ordenReferenciaId?: string;
  ordenReferenciaTipo?: string;
  notas?: string;
  horaAsignacion: string;
  horaSalida?: string;
  horaCompletado?: string;
  resource: {
    id: string;
    name: string;
    avatar?: string;
    estado: DriverEstado;
  };
}

// ─── BADGES ──────────────────────────────────────────────────────────────────
const VerificationStatusBadge = ({ status }: { status?: VerificationStatus }) => {
  const map: Record<string, { label: string; bg: string }> = {
    INVITED: { label: 'Invitado', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
    PENDING_VERIFICATION: { label: 'Pendiente Revisión', bg: 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' },
    APPROVED: { label: 'Aprobado', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Rechazado', bg: 'bg-rose-100 text-rose-700 border-rose-200' },
    SUSPENDED: { label: 'Suspendido', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const cfg = map[status || 'APPROVED'] || map.APPROVED;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};

const DriverEstadoBadge = ({ estado }: { estado: DriverEstado }) => {
  const map = {
    DISPONIBLE: { label: 'Disponible', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    OCUPADO: { label: 'Ocupado', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
    FUERA_DE_SERVICIO: { label: 'Fuera de servicio', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };
  const cfg = map[estado] || map.FUERA_DE_SERVICIO;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        estado === 'DISPONIBLE' ? 'bg-emerald-500' :
        estado === 'OCUPADO' ? 'bg-amber-500' : 'bg-slate-400'
      }`} />
      {cfg.label}
    </span>
  );
};

const AssignmentEstadoBadge = ({ estado }: { estado: AssignmentEstado }) => {
  const map: Record<AssignmentEstado, { label: string; bg: string }> = {
    ASIGNADO: { label: 'Asignado', bg: 'bg-blue-100 text-blue-700' },
    ACEPTADO: { label: 'Aceptado', bg: 'bg-indigo-100 text-indigo-700' },
    EN_RUTA: { label: 'En Ruta', bg: 'bg-amber-100 text-amber-700' },
    LLEGO: { label: 'Llegó', bg: 'bg-purple-100 text-purple-700' },
    COMPLETADO: { label: 'Completado', bg: 'bg-emerald-100 text-emerald-700' },
    CANCELADO: { label: 'Cancelado', bg: 'bg-rose-100 text-rose-700' },
  };
  const cfg = map[estado] || { label: estado, bg: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};

const VehicleIcon = ({ tipo }: { tipo?: string }) => {
  if (tipo === 'MOTO' || tipo === 'Moto') return <Bike className="w-4 h-4" />;
  if (tipo === 'AUTO' || tipo === 'Auto') return <Car className="w-4 h-4" />;
  if (tipo === 'BICICLETA' || tipo === 'Bicicleta') return <Bike className="w-4 h-4" />;
  return <Footprints className="w-4 h-4" />;
};

// ─── MODAL NUEVA INVITACIÓN ───────────────────────────────────────────────────
function InviteDriverModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [countryCode, setCountryCode] = useState('+593'); // 🇪🇨 Ecuador por defecto
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    tipoVehiculo: 'MOTO',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; whatsapp: any } | null>(null);

  const countries = [
    { code: '+593', flag: '🇪🇨', name: 'Ecuador (+593)' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia (+57)' },
    { code: '+51', flag: '🇵🇪', name: 'Perú (+51)' },
    { code: '+52', flag: '🇲🇽', name: 'México (+52)' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina (+54)' },
    { code: '+56', flag: '🇨🇱', name: 'Chile (+56)' },
    { code: '+58', flag: '🇻🇪', name: 'Venezuela (+58)' },
    { code: '+1', flag: '🇺🇸', name: 'USA/Canadá (+1)' },
    { code: '+34', flag: '🇪🇸', name: 'España (+34)' },
  ];

  const handleCreateInvite = async () => {
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('Nombre y teléfono son requeridos');
      return;
    }
    setSaving(true);
    setError('');

    // Combinar el código de país con el número si no viene ya con código
    const fullPhone = form.telefono.startsWith('+')
      ? form.telefono
      : `${countryCode}${form.telefono.trim()}`;

    try {
      const res = await fetch('/api/logistics/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, telefono: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando invitación');
      setInviteResult(data);
    } catch (e: any) {
      setError(e.message || 'Error al generar la invitación');
    } finally {
      setSaving(false);
    }
  };

  if (inviteResult) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center space-y-5">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600">
            <Send className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">¡Invitación Creada!</h3>
            <p className="text-xs text-slate-500 mt-1">
              El repartidor debe ingresar al enlace para completar sus datos y expediente privado.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 break-all text-left">
            {inviteResult.inviteUrl}
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={inviteResult.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-md"
            >
              <Phone className="w-4 h-4" />
              Enviar Enlace por WhatsApp
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteResult.inviteUrl);
                alert('Enlace copiado al portapapeles');
              }}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50"
            >
              Copiar Enlace
            </button>
            <button
              onClick={() => { onSave(); onClose(); }}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invitar Repartidor</h2>
            <p className="text-xs text-slate-500">Genera un enlace seguro de registro mediante OTP</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Juan García"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono WhatsApp *</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="099 888 7777"
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de transporte</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 'MOTO', label: 'Moto', icon: Bike },
                { val: 'AUTO', label: 'Auto', icon: Car },
                { val: 'BICICLETA', label: 'Bici', icon: Bike },
                { val: 'A_PIE', label: 'A pie', icon: Footprints },
              ].map(({ val, label, icon: Icon }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipoVehiculo: val }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.tipoVehiculo === val
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateInvite}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md"
          >
            {saving ? 'Generando...' : 'Crear Enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL REVISIÓN DE EXPEDIENTE ─────────────────────────────────────────────
function DossierReviewModal({
  driver,
  onClose,
  onDecision,
}: {
  driver: Driver;
  onClose: () => void;
  onDecision: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [loading, setLoading] = useState(false);
  const p = driver.profile;

  const handleDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !rejecting) {
      setRejecting(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: driver.id,
          action,
          motivoRechazo: action === 'REJECT' ? motivoRechazo : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error procesando decisión');
      if (data.whatsapp?.url) {
        window.open(data.whatsapp.url, '_blank');
      }
      onDecision();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Error procesando verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {driver.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{driver.name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>DNI/Doc: {p?.documento || 'No especificado'}</span>
                <VerificationStatusBadge status={p?.verificationStatus} />
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Datos personales */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Datos Personales</h3>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-sm">
              <div><span className="text-slate-500">Teléfono:</span> <p className="font-semibold">{p?.telefono || '—'}</p></div>
              <div><span className="text-slate-500">Email:</span> <p className="font-semibold">{p?.email || '—'}</p></div>
              <div><span className="text-slate-500">F. Nacimiento:</span> <p className="font-semibold">{p?.fechaNacimiento || '—'}</p></div>
              <div><span className="text-slate-500">Dirección:</span> <p className="font-semibold">{p?.direccion || '—'}</p></div>
              <div className="col-span-2"><span className="text-slate-500">Contacto Emergencia:</span> <p className="font-semibold">{p?.contactoEmergencia || '—'}</p></div>
            </div>
          </div>

          {/* Vehículo */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. Vehículo</h3>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-sm">
              <div><span className="text-slate-500">Tipo:</span> <p className="font-semibold">{p?.tipoVehiculo || '—'}</p></div>
              <div><span className="text-slate-500">Marca / Modelo:</span> <p className="font-semibold">{p?.marca ? `${p.marca} ${p.modelo || ''}` : p?.vehiculo || '—'}</p></div>
              <div><span className="text-slate-500">Placa:</span> <p className="font-semibold uppercase">{p?.placa || '—'}</p></div>
            </div>
          </div>

          {/* Documentos Privados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Documentos Adjuntos (Privados)</h3>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Confidencial</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cédula Frente', url: p?.cedulaFrenteUrl },
                { label: 'Cédula Reverso', url: p?.cedulaReversoUrl },
                { label: 'Licencia de Conducir', url: p?.licenciaUrl },
                { label: 'Foto del Vehículo', url: p?.fotoVehiculoUrl },
                { label: 'Selfie / Perfil', url: p?.selfieUrl },
              ].map(({ label, url }) => (
                <div key={label} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                  {url ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Cargado
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-200 text-slate-500 font-medium px-2 py-0.5 rounded-full">Sin adjunto</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de Rechazo */}
          {rejecting && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-rose-800">Motivo del rechazo *</label>
              <textarea
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Ej: Licencia de conducir vencida. Por favor sube una foto legible."
                rows={2}
                className="w-full p-2.5 border border-rose-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer Acciones */}
        <div className="flex gap-3 p-5 border-t bg-slate-50 rounded-b-2xl">
          {rejecting ? (
            <>
              <button
                onClick={() => setRejecting(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDecision('REJECT')}
                disabled={loading || !motivoRechazo.trim()}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Rechazo y Notificar por WhatsApp'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleDecision('REJECT')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-100"
              >
                <UserX className="w-4 h-4" />
                Rechazar
              </button>
              <button
                onClick={() => handleDecision('APPROVE')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md"
              >
                <UserCheck className="w-4 h-4" />
                {loading ? 'Aprobando...' : 'Aprobar Repartidor'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB VERIFICACIONES ───────────────────────────────────────────────────────
function VerificationsTab({
  drivers,
  onRefresh,
}: {
  drivers: Driver[];
  onRefresh: () => void;
}) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const pending = drivers.filter(
    d => d.profile?.verificationStatus === 'PENDING_VERIFICATION' || d.profile?.verificationStatus === 'INVITED'
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Verificaciones de Expedientes</h2>
          <p className="text-sm text-slate-500">
            {pending.length} solicitudes pendientes de aprobación por el negocio
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Repartidor</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Documento / Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Vehículo</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Sin expedientes registrados</p>
                </td>
              </tr>
            ) : (
              drivers.map(d => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-100 text-purple-700 font-bold rounded-full flex items-center justify-center">
                        {d.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{d.profile?.documento || 'Sin doc'}</p>
                    <p className="text-xs text-slate-400">{d.profile?.telefono || 'Sin teléfono'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <VehicleIcon tipo={d.profile?.tipoVehiculo} />
                      <span>{d.profile?.vehiculo || d.profile?.tipoVehiculo || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <VerificationStatusBadge status={d.profile?.verificationStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedDriver(d)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Expediente
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <DossierReviewModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onDecision={onRefresh}
        />
      )}
    </div>
  );
}

// ─── MODAL ASIGNACIÓN ─────────────────────────────────────────────────────────
function AssignDriverModal({
  drivers,
  onClose,
  onSave,
}: {
  drivers: Driver[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    resourceId: '',
    tipo: 'RETIRO' as AssignmentTipo,
    clienteNombre: '',
    clienteTelefono: '',
    clienteDireccion: '',
    ordenReferenciaId: '',
    notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Repartidores elegibles: deben tener estado DISPONIBLE y estar APROBADOS
  const available = drivers.filter(
    d => d.estado === 'DISPONIBLE' && d.active && d.profile?.verificationStatus === 'APPROVED'
  );

  const handleSave = async () => {
    if (!form.resourceId) { setError('Selecciona un repartidor aprobado'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/logistics/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.whatsapp?.url) setWaLink(data.whatsapp.url);
      else { onSave(); onClose(); }
    } catch (e: any) {
      setError(e.message || 'Error creando asignación');
    } finally {
      setSaving(false);
    }
  };

  if (waLink) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">¡Asignación creada!</h3>
          <p className="text-sm text-slate-500 mb-6">
            El repartidor ha sido asignado. ¿Deseas notificarle por WhatsApp?
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Enviar por WhatsApp
            </a>
            <button
              onClick={() => { onSave(); onClose(); }}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Omitir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-slate-900">Asignar Repartidor</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de misión</label>
            <div className="flex gap-2">
              {(['RETIRO', 'ENTREGA'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.tipo === t
                      ? t === 'RETIRO'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {t === 'RETIRO' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  {t === 'RETIRO' ? 'Retiro' : 'Entrega'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Repartidor Aprobado Disponibles ({available.length})
            </label>
            {available.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm text-center">
                No hay repartidores aprobados disponibles en este momento
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {available.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setForm(f => ({ ...f, resourceId: d.id }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      form.resourceId === d.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <VehicleIcon tipo={d.profile?.tipoVehiculo} />
                        {d.profile?.vehiculo || d.profile?.tipoVehiculo || 'Sin vehículo'}
                      </p>
                    </div>
                    {form.resourceId === d.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
              <input
                value={form.clienteNombre}
                onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))}
                placeholder="Nombre del cliente"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
              <input
                value={form.clienteTelefono}
                onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))}
                placeholder="+51..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Orden #</label>
              <input
                value={form.ordenReferenciaId}
                onChange={e => setForm(f => ({ ...f, ordenReferenciaId: e.target.value }))}
                placeholder="ORD-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección</label>
              <input
                value={form.clienteDireccion}
                onChange={e => setForm(f => ({ ...f, clienteDireccion: e.target.value }))}
                placeholder="Av. Principal 123"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border text-slate-600 rounded-xl font-semibold">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || available.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN BOARD ─────────────────────────────────────────────────────────────
function KanbanCard({ assignment, onUpdate }: { assignment: Assignment; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  const nextState: Record<AssignmentEstado, AssignmentEstado | null> = {
    ASIGNADO: 'ACEPTADO',
    ACEPTADO: 'EN_RUTA',
    EN_RUTA: 'LLEGO',
    LLEGO: 'COMPLETADO',
    COMPLETADO: null,
    CANCELADO: null,
  };

  const handleAdvance = async () => {
    const next = nextState[assignment.estado];
    if (!next) return;
    setUpdating(true);
    try {
      await fetch(`/api/logistics/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: next }),
      });
      onUpdate();
    } finally {
      setUpdating(false);
    }
  };

  const next = nextState[assignment.estado];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            assignment.tipo === 'RETIRO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {assignment.tipo === 'RETIRO' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">{assignment.tipo}</p>
            {assignment.ordenReferenciaId && <p className="text-xs text-slate-400">#{assignment.ordenReferenciaId}</p>}
          </div>
        </div>
        <AssignmentEstadoBadge estado={assignment.estado} />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{assignment.clienteNombre || 'Sin cliente'}</p>
        <p className="text-xs text-slate-500">{assignment.clienteDireccion || '—'}</p>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
          {assignment.resource.name.charAt(0)}
        </div>
        <span className="text-xs font-semibold text-slate-700 flex-1">{assignment.resource.name}</span>
      </div>

      {next && (
        <button
          onClick={handleAdvance}
          disabled={updating}
          className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
        >
          {updating ? '...' : `Avanzar ➔ ${next}`}
        </button>
      )}
    </div>
  );
}

function KanbanBoard({ assignments, onUpdate }: { assignments: Assignment[]; onUpdate: () => void }) {
  const columns: { key: AssignmentEstado; label: string; color: string }[] = [
    { key: 'ASIGNADO', label: 'Asignados', color: 'bg-blue-50 border-blue-200' },
    { key: 'EN_RUTA', label: 'En Ruta', color: 'bg-amber-50 border-amber-200' },
    { key: 'LLEGO', label: 'Llegó', color: 'bg-purple-50 border-purple-200' },
    { key: 'COMPLETADO', label: 'Completado', color: 'bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => {
        const colAssignments = assignments.filter(a => a.estado === col.key);
        return (
          <div key={col.key} className={`${col.color} rounded-2xl border p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">{col.label}</h3>
              <span className="bg-white/80 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                {colAssignments.length}
              </span>
            </div>
            <div className="space-y-3">
              {colAssignments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin asignaciones</p>
              ) : (
                colAssignments.map(a => <KanbanCard key={a.id} assignment={a} onUpdate={onUpdate} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TAB REPARTIDORES ─────────────────────────────────────────────────────────
function ResourcesTab({
  drivers,
  onRefresh,
}: {
  drivers: Driver[];
  onRefresh: () => void;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Repartidores Registrados</h2>
          <p className="text-sm text-slate-500">
            {drivers.filter(d => d.profile?.verificationStatus === 'APPROVED').length} aprobados · {drivers.filter(d => d.estado === 'DISPONIBLE').length} disponibles
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Nuevo Repartidor (Invitar)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map(driver => (
          <div
            key={driver.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                {driver.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{driver.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <VehicleIcon tipo={driver.profile?.tipoVehiculo} />
                  <span className="text-xs text-slate-500">
                    {driver.profile?.vehiculo || driver.profile?.tipoVehiculo || 'Sin vehículo'}
                    {driver.profile?.placa ? ` · ${driver.profile.placa}` : ''}
                  </span>
                </div>
              </div>
              <VerificationStatusBadge status={driver.profile?.verificationStatus} />
            </div>

            {driver.profile?.telefono && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {driver.profile.telefono}
              </div>
            )}
          </div>
        ))}
      </div>

      {showInviteModal && (
        <InviteDriverModal
          onClose={() => setShowInviteModal(false)}
          onSave={onRefresh}
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'verificaciones' | 'recursos' | 'historial';

export default function LogisticaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [driversRes, assignmentsRes] = await Promise.all([
        fetch('/api/logistics/resources?includeInactive=true'),
        fetch('/api/logistics/assignments'),
      ]);
      if (driversRes.ok) setDrivers(await driversRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } catch (error) {
      console.error('Error loading logistics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const pendingVerifications = drivers.filter(
    d => d.profile?.verificationStatus === 'PENDING_VERIFICATION'
  ).length;

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: Truck },
    { key: 'verificaciones', label: 'Verificaciones', icon: ShieldCheck, badge: pendingVerifications },
    { key: 'recursos', label: 'Repartidores', icon: Users },
    { key: 'historial', label: 'Historial', icon: History },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">Logística</h1>
                <p className="text-xs text-slate-500">Módulo Transversal · Citiox Enterprise</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                Nueva Asignación
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-4 mt-4">
            {[
              { label: 'En ruta', value: assignments.filter(a => a.estado === 'EN_RUTA').length, color: 'text-amber-600' },
              { label: 'Pendientes Revisión', value: pendingVerifications, color: 'text-purple-600' },
              { label: 'Aprobados', value: drivers.filter(d => d.profile?.verificationStatus === 'APPROVED').length, color: 'text-emerald-600' },
              { label: 'Total Repartidores', value: drivers.length, color: 'text-slate-600' },
            ].map(stat => (
              <div key={stat.label} className="text-center px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                  activeTab === tab.key
                    ? 'bg-purple-50 text-purple-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <KanbanBoard
                assignments={assignments.filter(a => a.estado !== 'CANCELADO')}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'verificaciones' && (
              <VerificationsTab drivers={drivers} onRefresh={loadData} />
            )}
            {activeTab === 'recursos' && (
              <ResourcesTab drivers={drivers} onRefresh={loadData} />
            )}
            {activeTab === 'historial' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Historial de Misiones</h3>
                <p className="text-xs text-slate-500">Misiones completadas: {assignments.filter(a => a.estado === 'COMPLETADO').length}</p>
              </div>
            )}
          </>
        )}
      </div>

      {showAssignModal && (
        <AssignDriverModal
          drivers={drivers}
          onClose={() => setShowAssignModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
