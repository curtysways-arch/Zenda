'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Users, Phone, Calendar, Clock, Heart, AlertCircle, 
  Save, Plus, FileText, Smile, Activity, Folder, CheckCircle2, 
  Upload, Sparkles, Loader2, Stethoscope, AlertTriangle, ShieldCheck, 
  Edit3, ExternalLink, X, UserCheck
} from 'lucide-react';
import DentalOdontogram from '@/modules/dental/components/DentalOdontogram';
import { ToothData } from '@/modules/dental/utils/dentalHelper';

type TabKey = 'resumen' | 'historia' | 'odontograma' | 'consultas' | 'tratamientos' | 'documentos' | 'citas';

export default function PacienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clienteId } = use(params);

  const [cliente, setCliente] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [savingRecord, setSavingRecord] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Formulario Historia Clínica
  const [grupoSanguineo, setGrupoSanguineo] = useState('');
  const [antecedentes, setAntecedentes] = useState<Record<string, boolean>>({});
  const [alergias, setAlergias] = useState<Record<string, boolean>>({});
  const [alergiasDetalle, setAlergiasDetalle] = useState('');
  const [medicacionActual, setMedicacionActual] = useState('');
  const [habitos, setHabitos] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');

  // Modal Nueva Consulta
  const [isNewEncounterOpen, setIsNewEncounterOpen] = useState(false);
  const [encMotivo, setEncMotivo] = useState('');
  const [encProblema, setEncProblema] = useState('');
  const [encPresionArt, setEncPresionArt] = useState('');
  const [encFrecCard, setEncFrecCard] = useState('');
  const [encFrecResp, setEncFrecResp] = useState('');
  const [encTemp, setEncTemp] = useState('');
  const [encExamen, setEncExamen] = useState('');
  const [encDiagnostico, setEncDiagnostico] = useState('');
  const [encCIE, setEncCIE] = useState('');
  const [encProcedimiento, setEncProcedimiento] = useState('');
  const [encPrescripcion, setEncPrescripcion] = useState('');
  const [encIndicaciones, setEncIndicaciones] = useState('');
  const [encProximaCita, setEncProximaCita] = useState('');
  const [savingEncounter, setSavingEncounter] = useState(false);

  // Modal Nuevo Tratamiento
  const [isNewTreatmentOpen, setIsNewTreatmentOpen] = useState(false);
  const [trDiente, setTrDiente] = useState('');
  const [trSuperficies, setTrSuperficies] = useState('');
  const [trDescripcion, setTrDescripcion] = useState('');
  const [trCosto, setTrCosto] = useState('');
  const [trPrioridad, setTrPrioridad] = useState('MEDIA');
  const [savingTreatment, setSavingTreatment] = useState(false);

  // Carga de Documentos
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTipo, setDocTipo] = useState('RADIOGRAFIA');
  const [docTitulo, setDocTitulo] = useState('');

  // Citas del paciente
  const [citas, setCitas] = useState<any[]>([]);

  // Modal Agendar Cita Odontológica
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingServices, setBookingServices] = useState<any[]>([]);
  const [bookingStaff, setBookingStaff] = useState<any[]>([]);
  const [bkServiceId, setBkServiceId] = useState('');
  const [bkStaffId, setBkStaffId] = useState('');
  const [bkFecha, setBkFecha] = useState(new Date().toISOString().split('T')[0]);
  const [bkHora, setBkHora] = useState('09:00');
  const [bkDuracion, setBkDuracion] = useState('45');
  const [bkNotas, setBkNotas] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Cargar servicios y doctores para el agendamiento
  const loadBookingOptions = async () => {
    try {
      const [resS, resSt] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/staff')
      ]);
      if (resS.ok) {
        const s = await resS.json();
        const safeS = Array.isArray(s) ? s : [];
        setBookingServices(safeS);
        if (safeS.length > 0 && !bkServiceId) setBkServiceId(safeS[0].id);
      }
      if (resSt.ok) {
        const st = await resSt.json();
        const safeSt = Array.isArray(st) ? st : [];
        setBookingStaff(safeSt);
        if (safeSt.length > 0 && !bkStaffId) setBkStaffId(safeSt[0].id);
      }
    } catch (e) {
      console.error('Error cargando opciones de agendamiento:', e);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkServiceId || !bkFecha || !bkHora) return;

    setBookingLoading(true);
    try {
      const res = await fetch('/api/admin/dental/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          serviceId: bkServiceId,
          staffId: bkStaffId || undefined,
          fecha: bkFecha,
          horaInicio: bkHora,
          duracionMinutos: Number(bkDuracion) || 45,
          comentarios: bkNotas || 'Cita odontológica agendada desde ficha médica'
        })
      });

      if (res.ok) {
        setBookingSuccess(true);
        await loadData();
        setTimeout(() => {
          setBookingSuccess(false);
          setIsBookingModalOpen(false);
          setActiveTab('citas');
        }, 1200);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al agendar cita');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al agendar la cita');
    } finally {
      setBookingLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar datos del cliente
      const resCli = await fetch(`/api/clientes/${clienteId}`);
      if (resCli.ok) {
        const cData = await resCli.json();
        setCliente(cData);
        if (cData.Appointment) {
          setCitas(cData.Appointment);
        }
      }

      // 2. Cargar citas actualizadas desde endpoint dental
      const resCitas = await fetch(`/api/admin/dental/appointments?clienteId=${clienteId}`);
      if (resCitas.ok) {
        const cData = await resCitas.json();
        if (Array.isArray(cData.appointments)) {
          setCitas(cData.appointments);
        }
      }

      // 3. Cargar ficha clínica
      const resRec = await fetch(`/api/admin/dental/records?clienteId=${clienteId}`);
      if (resRec.ok) {
        const rData = await resRec.json();
        if (rData.record) {
          const rec = rData.record;
          setRecord(rec);
          if (rec.Cliente) {
            setCliente((prev: any) => ({ ...rec.Cliente, ...prev }));
          }
          setGrupoSanguineo(rec.grupoSanguineo || '');
          setAntecedentes(rec.antecedentesMedicos || {});
          const alg = rec.alergias || {};
          setAlergias(alg);
          setAlergiasDetalle(alg.detalle || '');
          setMedicacionActual(rec.medicacionActual || '');
          setHabitos(rec.habitos || {});
          setObservaciones(rec.observaciones || '');
        }
      }
    } catch (err) {
      console.error('Error cargando ficha del paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clienteId]);

  // Guardar Historia Clínica
  const handleSaveHistoria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingRecord(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/dental/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          grupoSanguineo,
          antecedentesMedicos: antecedentes,
          alergias: {
            ...alergias,
            detalle: alergiasDetalle
          },
          medicacionActual,
          habitos,
          observaciones
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRecord(false);
    }
  };

  // Guardar Snapshot Odontograma
  const handleSaveOdontogramSnapshot = async (piezas: Record<string, ToothData>, titulo?: string) => {
    // Si no hay record aún, inicializarlo primero
    let recId = record?.id;
    if (!recId) {
      const resRec = await fetch('/api/admin/dental/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      });
      if (resRec.ok) {
        const r = await resRec.json();
        recId = r.record?.id;
      }
    }

    if (!recId) return;

    await fetch('/api/admin/dental/odontograms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicalRecordId: recId,
        titulo: titulo || 'Control Odontológico',
        piezas
      })
    });

    await loadData();
  };

  // Crear Consulta / Evolución
  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    let recId = record?.id;
    if (!recId) {
      const resRec = await fetch('/api/admin/dental/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      });
      if (resRec.ok) {
        const r = await resRec.json();
        recId = r.record?.id;
      }
    }

    if (!recId || !encMotivo) return;

    setSavingEncounter(true);
    try {
      const res = await fetch('/api/admin/dental/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalRecordId: recId,
          motivoConsulta: encMotivo,
          problemaActual: { descripcion: encProblema },
          signosVitales: {
            presionArterial: encPresionArt,
            frecuenciaCardiaca: encFrecCard,
            frecuenciaRespiratoria: encFrecResp,
            temperatura: encTemp
          },
          examenFisico: encExamen,
          diagnostico: encDiagnostico,
          codigoCIE: encCIE,
          procedimientoRealizado: encProcedimiento,
          prescripcion: encPrescripcion,
          indicaciones: encIndicaciones,
          proximaCita: encProximaCita || undefined
        })
      });
      if (res.ok) {
        setIsNewEncounterOpen(false);
        setEncMotivo('');
        setEncProblema('');
        setEncExamen('');
        setEncDiagnostico('');
        setEncCIE('');
        setEncProcedimiento('');
        setEncPrescripcion('');
        setEncIndicaciones('');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEncounter(false);
    }
  };

  // Crear Tratamiento
  const handleCreateTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    let recId = record?.id;
    if (!recId) {
      const resRec = await fetch('/api/admin/dental/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      });
      if (resRec.ok) {
        const r = await resRec.json();
        recId = r.record?.id;
      }
    }

    if (!recId || !trDescripcion) return;

    setSavingTreatment(true);
    try {
      const res = await fetch('/api/admin/dental/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalRecordId: recId,
          diente: trDiente || undefined,
          superficies: trSuperficies || undefined,
          descripcion: trDescripcion,
          costoEstimado: trCosto ? Number(trCosto) : undefined,
          prioridad: trPrioridad
        })
      });
      if (res.ok) {
        setIsNewTreatmentOpen(false);
        setTrDiente('');
        setTrSuperficies('');
        setTrDescripcion('');
        setTrCosto('');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTreatment(false);
    }
  };

  // Cambiar estado de tratamiento
  const handleUpdateTreatmentStatus = async (treatmentId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/dental/treatments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: treatmentId, estado: newStatus })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subir Documento Clínico / Radiografía
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let recId = record?.id;
    if (!recId) {
      const resRec = await fetch('/api/admin/dental/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      });
      if (resRec.ok) {
        const r = await resRec.json();
        recId = r.record?.id;
      }
    }

    if (!recId) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'dental_document');

      const resUp = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (resUp.ok) {
        const upData = await resUp.json();
        await fetch('/api/admin/dental/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicalRecordId: recId,
            mediaId: upData.id || undefined,
            tipo: docTipo,
            titulo: docTitulo || file.name,
            archivoUrl: upData.url,
            mimeType: file.type,
            tamanoBytes: file.size
          })
        });
        setDocTitulo('');
        await loadData();
      }
    } catch (err) {
      console.error('Error subiendo documento:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Calcular edad
  const calcularEdad = (fechaNac?: string | Date) => {
    if (!fechaNac) return null;
    const diff = Date.now() - new Date(fechaNac).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const edad = calcularEdad(cliente?.fechaNacimiento);

  // Determinar alertas médicas importantes
  const tieneAlergias = Object.entries(alergias).some(([k, v]) => k !== 'detalle' && Boolean(v));
  const tieneEnfermedadSistemica = Boolean(
    antecedentes.diabetes || antecedentes.hipertension || antecedentes.cardiopatia || antecedentes.coagulacion
  );

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-sky-600 mb-3" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Cargando Ficha Clínica...
        </p>
      </div>
    );
  }

  const latestOdontogram = record?.odontograms?.[0];
  const initialPiezasOdontograma = latestOdontogram?.piezas 
    ? (typeof latestOdontogram.piezas === 'string' ? JSON.parse(latestOdontogram.piezas) : latestOdontogram.piezas)
    : {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* ─── BOTÓN VOLVER Y HEADER DEL PACIENTE ─────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/pacientes"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600">
            Ficha Odontológica #{record?.numeroHistoria || 'HC-NUEVA'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {cliente?.nombre || 'Paciente'}
          </h1>
        </div>
      </div>

      {/* ─── TARJETA PRINCIPAL DEL PACIENTE CON ALERTAS MÉDICAS ──────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 font-black text-2xl flex items-center justify-center shrink-0 shadow-inner">
              {cliente?.nombre?.charAt(0) || 'P'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-800">
                  {edad != null ? `${edad} años` : 'Edad no especificada'}
                </span>
                {grupoSanguineo && (
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold">
                    Grupo: {grupoSanguineo}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {cliente?.telefono || 'Sin teléfono'}
                </span>
                {cliente?.email && (
                  <span className="font-medium text-slate-400">
                    ✉ {cliente.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Banderas de alerta clínica inmediata */}
          <div className="flex flex-wrap items-center gap-2">
            {tieneAlergias && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ALERGIA REGISTRADA</span>
              </div>
            )}
            {tieneEnfermedadSistemica && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>CONDICIÓN MÉDICA</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                loadBookingOptions();
                setIsBookingModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar Cita</span>
            </button>
          </div>
        </div>

        {/* ─── PESTAÑAS DE NAVEGACIÓN CLÍNICA ───────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 mt-6 pt-4 text-xs font-bold">
          {[
            { id: 'resumen', label: 'Resumen Clínico', icon: Sparkles },
            { id: 'historia', label: 'Historia Clínica', icon: FileText },
            { id: 'odontograma', label: 'Odontograma', icon: Smile },
            { id: 'consultas', label: 'Consultas & Evolución', icon: Stethoscope },
            { id: 'tratamientos', label: 'Plan de Tratamiento', icon: Activity },
            { id: 'documentos', label: 'Radiografías & Archivos', icon: Folder },
            { id: 'citas', label: 'Historial Citas', icon: Calendar },
          ].map((t) => {
            const IconComp = t.icon;
            const isAct = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as TabKey)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                  isAct
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB: RESUMEN CLÍNICO ───────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Alertas de antecedentes */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                <span>Condiciones Clínicas & Antecedentes</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className={`p-3 rounded-2xl border ${antecedentes.diabetes ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Diabetes: {antecedentes.diabetes ? 'SÍ' : 'No'}
                </div>
                <div className={`p-3 rounded-2xl border ${antecedentes.hipertension ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Hipertensión: {antecedentes.hipertension ? 'SÍ' : 'No'}
                </div>
                <div className={`p-3 rounded-2xl border ${antecedentes.cardiopatia ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Cardiopatía: {antecedentes.cardiopatia ? 'SÍ' : 'No'}
                </div>
                <div className={`p-3 rounded-2xl border ${antecedentes.coagulacion ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Coagulación: {antecedentes.coagulacion ? 'SÍ' : 'No'}
                </div>
                <div className={`p-3 rounded-2xl border ${antecedentes.asma ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Asma: {antecedentes.asma ? 'SÍ' : 'No'}
                </div>
                <div className={`p-3 rounded-2xl border ${alergias.medicamentos || alergias.anestesia ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  Alergias: {alergiasDetalle || (alergias.medicamentos ? 'Medicamentos' : 'Ninguna')}
                </div>
              </div>

              {medicacionActual && (
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs text-slate-700">
                  <strong className="text-sky-900">Medicación Actual:</strong> {medicacionActual}
                </div>
              )}
            </div>

            {/* Última evolución registrada */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-sky-600" />
                  <span>Última Consulta Odontológica</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewEncounterOpen(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva Consulta
                </button>
              </div>

              {record?.encounters && record.encounters.length > 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500 font-medium">
                    <span>{new Date(record.encounters[0].fecha).toLocaleDateString('es-ES')}</span>
                    <span>Dr: {record.encounters[0].Staff?.name || 'De turno'}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    Motivo: {record.encounters[0].motivoConsulta}
                  </p>
                  {record.encounters[0].diagnostico && (
                    <p className="text-slate-600">
                      <strong>Diagnóstico:</strong> {record.encounters[0].diagnostico}
                    </p>
                  )}
                  {record.encounters[0].procedimientoRealizado && (
                    <p className="text-slate-600">
                      <strong>Procedimiento:</strong> {record.encounters[0].procedimientoRealizado}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Sin consultas registradas aún.
                </div>
              )}
            </div>

          </div>

          {/* Columna derecha: Tratamientos activos */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Tratamientos en Curso</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewTreatmentOpen(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>

              {record?.treatments && record.treatments.filter((t: any) => t.estado !== 'REALIZADO' && t.estado !== 'CANCELADO').length > 0 ? (
                <div className="space-y-2.5">
                  {record.treatments
                    .filter((t: any) => t.estado !== 'REALIZADO' && t.estado !== 'CANCELADO')
                    .map((tr: any) => (
                      <div key={tr.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 font-black text-slate-900">
                            {tr.diente && (
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px]">
                                Pieza #{tr.diente}
                              </span>
                            )}
                            <span>{tr.descripcion}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-purple-700 block mt-1">
                            Estado: {tr.estado}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateTreatmentStatus(tr.id, 'REALIZADO')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold shrink-0"
                        >
                          Realizado ✓
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  No hay tratamientos pendientes en el plan.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: HISTORIA CLÍNICA ODONTOLÓGICA ─────────────────────── */}
      {activeTab === 'historia' && (
        <form onSubmit={handleSaveHistoria} className="space-y-6">
          
          {/* Antecedentes Médicos */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <span>Antecedentes Médicos Sistémicos</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'diabetes', label: 'Diabetes' },
                { id: 'hipertension', label: 'Hipertensión' },
                { id: 'cardiopatia', label: 'Cardiopatía' },
                { id: 'asma', label: 'Asma' },
                { id: 'tuberculosis', label: 'Tuberculosis' },
                { id: 'vih', label: 'VIH / SIDA' },
                { id: 'coagulacion', label: 'Problemas Coagulación' },
                { id: 'hepatitis', label: 'Hepatitis' },
              ].map((ant) => (
                <label
                  key={ant.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    antecedentes[ant.id]
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(antecedentes[ant.id])}
                    onChange={(e) => setAntecedentes(prev => ({ ...prev, [ant.id]: e.target.checked }))}
                    className="w-4 h-4 text-sky-600 rounded-sm"
                  />
                  <span className="text-xs">{ant.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Alergias & Medicación */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Alergias & Farmacología</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'medicamentos', label: 'Medicamentos' },
                { id: 'anestesia', label: 'Anestesia Dental' },
                { id: 'latex', label: 'Látex' },
                { id: 'alimentos', label: 'Alimentos' },
              ].map((alg) => (
                <label
                  key={alg.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    alergias[alg.id]
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(alergias[alg.id])}
                    onChange={(e) => setAlergias(prev => ({ ...prev, [alg.id]: e.target.checked }))}
                    className="w-4 h-4 text-sky-600 rounded-sm"
                  />
                  <span className="text-xs">{alg.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Detalle Específico de Alergias
                </label>
                <input
                  type="text"
                  value={alergiasDetalle}
                  onChange={(e) => setAlergiasDetalle(e.target.value)}
                  placeholder="Ej: Alérgico a la Penicilina y AINES..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Medicación Actual que Consume
                </label>
                <input
                  type="text"
                  value={medicacionActual}
                  onChange={(e) => setMedicacionActual(e.target.value)}
                  placeholder="Ej: Losartán 50mg diario, Metformina..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Grupo Sanguíneo & Hábitos */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-600" />
              <span>Grupo Sanguíneo & Hábitos</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Grupo Sanguíneo / Factor Rh
                </label>
                <select
                  value={grupoSanguineo}
                  onChange={(e) => setGrupoSanguineo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">No especificado</option>
                  <option value="O+">O Positivo (O+)</option>
                  <option value="O-">O Negativo (O-)</option>
                  <option value="A+">A Positivo (A+)</option>
                  <option value="A-">A Negativo (A-)</option>
                  <option value="B+">B Positivo (B+)</option>
                  <option value="B-">B Negativo (B-)</option>
                  <option value="AB+">AB Positivo (AB+)</option>
                  <option value="AB-">AB Negativo (AB-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Bruxismo / Rechinamiento
                </label>
                <select
                  value={habitos.bruxismo ? 'SI' : 'NO'}
                  onChange={(e) => setHabitos(prev => ({ ...prev, bruxismo: e.target.value === 'SI' }))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="NO">No presenta</option>
                  <option value="SI">Sí, presenta bruxismo nocturno/diurno</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hábito de Fumar (Tabaco)
                </label>
                <select
                  value={habitos.tabaco ? 'SI' : 'NO'}
                  onChange={(e) => setHabitos(prev => ({ ...prev, tabaco: e.target.value === 'SI' }))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="NO">No fuma</option>
                  <option value="SI">Sí fuma</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Observaciones Generales de la Historia
              </label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Anotaciones clínicas relevantes de interés para el odontólogo..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Historia clínica guardada exitosamente
              </span>
            )}
            <button
              type="submit"
              disabled={savingRecord}
              className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm shadow-md active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingRecord ? 'Guardando...' : 'Guardar Cambios de Historia Clínica'}</span>
            </button>
          </div>

        </form>
      )}

      {/* ─── TAB: ODONTOGRAMA INTERACTIVO ───────────────────────────── */}
      {activeTab === 'odontograma' && (
        <DentalOdontogram
          initialPiezas={initialPiezasOdontograma}
          snapshots={record?.odontograms || []}
          onSaveSnapshot={handleSaveOdontogramSnapshot}
          patientName={cliente?.nombre}
        />
      )}

      {/* ─── TAB: CONSULTAS & EVOLUCIÓN CLÍNICA ─────────────────────── */}
      {activeTab === 'consultas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Evoluciones y Consultas Médicas</h3>
              <p className="text-xs text-slate-500">Historial cronológico inmutable de atenciones odontológicas.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewEncounterOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white font-extrabold text-xs shadow-md hover:bg-sky-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nueva Consulta</span>
            </button>
          </div>

          {record?.encounters && record.encounters.length > 0 ? (
            <div className="space-y-4">
              {record.encounters.map((enc: any) => (
                <div key={enc.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div>
                      <span className="text-xs font-bold text-sky-600">
                        Fecha: {new Date(enc.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                        Motivo: {enc.motivoConsulta}
                      </h4>
                    </div>
                    {enc.Staff && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        Dr: {enc.Staff.name}
                      </span>
                    )}
                  </div>

                  {/* Signos Vitales si existen */}
                  {enc.signosVitales && Object.values(enc.signosVitales).some(Boolean) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {enc.signosVitales.presionArterial && (
                        <span><strong>P.A.:</strong> {enc.signosVitales.presionArterial} mmHg</span>
                      )}
                      {enc.signosVitales.frecuenciaCardiaca && (
                        <span><strong>F.C.:</strong> {enc.signosVitales.frecuenciaCardiaca} lpm</span>
                      )}
                      {enc.signosVitales.temperatura && (
                        <span><strong>Temp:</strong> {enc.signosVitales.temperatura} °C</span>
                      )}
                      {enc.signosVitales.frecuenciaRespiratoria && (
                        <span><strong>F.R.:</strong> {enc.signosVitales.frecuenciaRespiratoria} rpm</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {enc.diagnostico && (
                      <div>
                        <strong className="text-slate-900 block mb-0.5">Diagnóstico Clínico:</strong>
                        <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {enc.diagnostico} {enc.codigoCIE ? `(CIE: ${enc.codigoCIE})` : ''}
                        </p>
                      </div>
                    )}

                    {enc.procedimientoRealizado && (
                      <div>
                        <strong className="text-slate-900 block mb-0.5">Procedimiento Realizado:</strong>
                        <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {enc.procedimientoRealizado}
                        </p>
                      </div>
                    )}
                  </div>

                  {enc.prescripcion && (
                    <div className="text-xs pt-2 border-t border-slate-100">
                      <strong className="text-slate-900 block mb-0.5">Receta Médica / Prescripción:</strong>
                      <p className="text-slate-700 bg-sky-50/50 p-3 rounded-xl border border-sky-100 font-mono whitespace-pre-line">
                        {enc.prescripcion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-700">Sin consultas registradas</h4>
              <p className="text-xs text-slate-400 mt-1">Registra la primera evolución de este paciente.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PLAN DE TRATAMIENTO ──────────────────────────────── */}
      {activeTab === 'tratamientos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Plan de Tratamiento Odontológico</h3>
              <p className="text-xs text-slate-500">Procedimientos planificados por pieza dental y presupuesto.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewTreatmentOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white font-extrabold text-xs shadow-md hover:bg-sky-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Procedimiento</span>
            </button>
          </div>

          {record?.treatments && record.treatments.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {record.treatments.map((tr: any) => {
                  const isDone = tr.estado === 'REALIZADO';
                  return (
                    <div key={tr.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {tr.diente && (
                            <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-black text-xs">
                              Pieza #{tr.diente} {tr.superficies ? `(${tr.superficies})` : ''}
                            </span>
                          )}
                          <h4 className={`text-sm font-extrabold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {tr.descripcion}
                          </h4>
                        </div>
                        {tr.costoEstimado != null && (
                          <span className="text-xs font-bold text-slate-500 block">
                            Costo estimado: ${Number(tr.costoEstimado).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={tr.estado}
                          onChange={(e) => handleUpdateTreatmentStatus(tr.id, e.target.value)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border ${
                            isDone 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : tr.estado === 'EN_PROCESO'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="PLANIFICADO">Planificado</option>
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_PROCESO">En Proceso</option>
                          <option value="REALIZADO">Realizado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-700">Sin tratamientos registrados</h4>
              <p className="text-xs text-slate-400 mt-1">Crea el plan de tratamiento indicando las piezas dentales.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: DOCUMENTOS & RADIOGRAFÍAS ─────────────────────────── */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Radiografías & Archivos Clínicos</h3>
              <p className="text-xs text-slate-500">Panorámicas, periapicales, fotografías y consentimientos informados.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="RADIOGRAFIA">Radiografía</option>
                <option value="FOTO_CLINICA">Foto Clínica</option>
                <option value="EXAMEN">Examen de Laboratorio</option>
                <option value="CONSENTIMIENTO">Consentimiento Firmado</option>
                <option value="OTRO">Otro Documento</option>
              </select>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white font-extrabold text-xs shadow-md hover:bg-sky-700 cursor-pointer active:scale-95 transition-all">
                <Upload className="w-4 h-4" />
                <span>{uploadingDoc ? 'Subiendo...' : 'Subir Archivo'}</span>
                <input
                  type="file"
                  onChange={handleUploadDocument}
                  disabled={uploadingDoc}
                  className="hidden"
                  accept="image/*,.pdf"
                />
              </label>
            </div>
          </div>

          {record?.documents && record.documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {record.documents.map((doc: any) => (
                <div key={doc.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 uppercase">
                      {doc.tipo}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-2 mb-1 truncate">
                      {doc.titulo}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={doc.archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Documento</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Folder className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-700">Sin archivos adjuntos</h4>
              <p className="text-xs text-slate-400 mt-1">Sube radiografías panorámicas o consentimientos para este paciente.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: CITAS ─────────────────────────────────────────────── */}
      {activeTab === 'citas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Historial de Citas Odontológicas</h3>
              <p className="text-xs text-slate-500 font-medium">Registro de atenciones, controles y turnos del paciente</p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadBookingOptions();
                setIsBookingModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Programar Cita</span>
            </button>
          </div>

          {citas.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {citas.map((c: any) => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {new Date(c.fecha).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-100 text-sky-800 text-[11px] font-extrabold">
                        {c.horaInicio} - {c.horaFin || 'Fin'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        c.estado === 'confirmed' || c.estado === 'CONFIRMADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.estado === 'pending' || c.estado === 'PENDIENTE'
                          ? 'bg-amber-100 text-amber-800'
                          : c.estado === 'completed' || c.estado === 'COMPLETADA'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.estado}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium text-xs pt-1">
                      {c.service?.nombre && (
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-sky-600" />
                          {c.service.nombre}
                        </span>
                      )}
                      {c.staff?.name && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {c.staff.name}
                        </span>
                      )}
                      {c.comentarios && (
                        <span className="text-slate-400 italic">
                          "{c.comentarios}"
                        </span>
                      )}
                    </div>
                  </div>
                  {c.total > 0 && (
                    <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                      <span className="text-base font-black text-slate-900">${c.total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 mb-1">No hay citas registradas para este paciente</p>
              <p className="text-xs text-slate-400 mb-5">Programa la primera consulta o tratamiento dental para mantener el seguimiento clínico.</p>
              <button
                type="button"
                onClick={() => {
                  loadBookingOptions();
                  setIsBookingModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Agendar Cita Ahora</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL NUEVA CONSULTA / EVOLUCIÓN ───────────────────────── */}
      {isNewEncounterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsNewEncounterOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-sky-600" />
              <span>Nueva Consulta Odontológica</span>
            </h3>

            <form onSubmit={handleCreateEncounter} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo de Consulta *
                </label>
                <input
                  type="text"
                  required
                  value={encMotivo}
                  onChange={(e) => setEncMotivo(e.target.value)}
                  placeholder="Ej: Dolor agudo en molar superior derecho..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Signos Vitales */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Signos Vitales
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={encPresionArt}
                    onChange={(e) => setEncPresionArt(e.target.value)}
                    placeholder="P.A. (120/80)"
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={encFrecCard}
                    onChange={(e) => setEncFrecCard(e.target.value)}
                    placeholder="F.C. (75 lpm)"
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={encTemp}
                    onChange={(e) => setEncTemp(e.target.value)}
                    placeholder="Temp (36.5 °C)"
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={encFrecResp}
                    onChange={(e) => setEncFrecResp(e.target.value)}
                    placeholder="F.R. (18 rpm)"
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Problema Actual / Examen Clínico
                </label>
                <textarea
                  rows={2}
                  value={encProblema}
                  onChange={(e) => setEncProblema(e.target.value)}
                  placeholder="Descripción de síntomas, duración, localización del dolor..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Diagnóstico Odontológico
                  </label>
                  <input
                    type="text"
                    value={encDiagnostico}
                    onChange={(e) => setEncDiagnostico(e.target.value)}
                    placeholder="Ej: Pulpitis irreversible pieza 16"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Código CIE (Opcional)
                  </label>
                  <input
                    type="text"
                    value={encCIE}
                    onChange={(e) => setEncCIE(e.target.value)}
                    placeholder="Ej: K04.0"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Procedimiento Realizado
                </label>
                <input
                  type="text"
                  value={encProcedimiento}
                  onChange={(e) => setEncProcedimiento(e.target.value)}
                  placeholder="Ej: Apertura cameral, pulpectomía, medicación intraconducto..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Prescripción / Medicación Recetada
                </label>
                <textarea
                  rows={2}
                  value={encPrescripcion}
                  onChange={(e) => setEncPrescripcion(e.target.value)}
                  placeholder="Ej: Amoxicilina 500mg cada 8 horas por 7 días..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEncounterOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEncounter}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {savingEncounter ? 'Guardando...' : 'Guardar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVO TRATAMIENTO ─────────────────────────────────── */}
      {isNewTreatmentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsNewTreatmentOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span>Agregar a Plan de Tratamiento</span>
            </h3>

            <form onSubmit={handleCreateTreatment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pieza Dental FDI
                  </label>
                  <input
                    type="text"
                    value={trDiente}
                    onChange={(e) => setTrDiente(e.target.value)}
                    placeholder="Ej: 16"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Superficies
                  </label>
                  <input
                    type="text"
                    value={trSuperficies}
                    onChange={(e) => setTrSuperficies(e.target.value)}
                    placeholder="Ej: O, M"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descripción del Procedimiento *
                </label>
                <input
                  type="text"
                  required
                  value={trDescripcion}
                  onChange={(e) => setTrDescripcion(e.target.value)}
                  placeholder="Ej: Restauración con resina compuesta"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Costo Estimado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trCosto}
                    onChange={(e) => setTrCosto(e.target.value)}
                    placeholder="Ej: 45.00"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prioridad
                  </label>
                  <select
                    value={trPrioridad}
                    onChange={(e) => setTrPrioridad(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTreatmentOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTreatment}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {savingTreatment ? 'Guardando...' : 'Guardar Tratamiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL AGENDAR CITA ODONTOLÓGICA ───────────────────────── */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Agendar Cita Odontológica</h3>
                <p className="text-xs text-slate-500 font-medium">Programa un turno clínico directamente para este paciente</p>
              </div>
            </div>

            {/* Chip resumen del paciente */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-black text-slate-900 block">{cliente?.nombre || 'Paciente'}</span>
                <span className="text-[11px] text-slate-500 font-medium">{cliente?.telefono || 'Sin teléfono'} • {record?.numeroHistoria || 'HC Nueva'}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-[10px] uppercase">
                Paciente Activo
              </span>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h4 className="text-base font-black text-slate-900">¡Cita Agendada Exitosamente!</h4>
                <p className="text-xs text-slate-500">El turno ha sido guardado y registrado en el historial del paciente.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                {/* Selección de Servicio Odontológico */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tratamiento / Servicio Odontológico *
                  </label>
                  {bookingServices.length > 0 ? (
                    <select
                      required
                      value={bkServiceId}
                      onChange={(e) => {
                        setBkServiceId(e.target.value);
                        const selected = bookingServices.find(s => s.id === e.target.value);
                        if (selected?.duracion) {
                          setBkDuracion(String(selected.duracion));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium bg-white"
                    >
                      {bookingServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} - ${Number(s.precio || 0).toFixed(2)} ({s.duracion || 45} min)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Cargando servicios o sin servicios disponibles...
                    </p>
                  )}
                </div>

                {/* Selección de Especialista / Odontólogo */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Especialista / Odontólogo Tratante
                  </label>
                  <select
                    value={bkStaffId}
                    onChange={(e) => setBkStaffId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium bg-white"
                  >
                    <option value="">Cualquier odontólogo disponible</option>
                    {bookingStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role || 'Especialista'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Fecha de la Cita *
                    </label>
                    <input
                      type="date"
                      required
                      value={bkFecha}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setBkFecha(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Hora de Inicio *
                    </label>
                    <select
                      value={bkHora}
                      onChange={(e) => setBkHora(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium bg-white"
                    >
                      {[
                        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                        '11:00', '11:30', '12:00', '12:30', '13:00', '14:00',
                        '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
                        '17:30', '18:00', '18:30', '19:00', '19:30'
                      ].map(h => (
                        <option key={h} value={h}>{h} hrs</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duración */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Duración Estimada
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: '30', label: '30 min' },
                      { val: '45', label: '45 min' },
                      { val: '60', label: '1 hora' },
                      { val: '90', label: '1.5 hrs' },
                    ].map(d => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => setBkDuracion(d.val)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          bkDuracion === d.val
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notas adicionales */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Motivo / Notas de la Cita
                  </label>
                  <textarea
                    rows={2}
                    value={bkNotas}
                    onChange={(e) => setBkNotas(e.target.value)}
                    placeholder="Ej: Control post-curación, dolor en molar superior derecho..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/admin/citas/nueva?clienteNombre=${encodeURIComponent(cliente?.nombre || '')}&clienteTelefono=${encodeURIComponent(cliente?.telefono || '')}`}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                  >
                    <span>Formulario avanzado</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading || bookingServices.length === 0}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
                    >
                      {bookingLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Agendando...</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Confirmar Cita</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
