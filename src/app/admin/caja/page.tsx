'use client';

// src/app/admin/caja/page.tsx
// Dashboard Financiero Diario & Arqueo de Caja (10/10 Definitivo)
// Visualiza: Ventas del día, Ingresos manuales, Gastos, Total esperado, Dinero contado, Diferencias.
// Filtros: Día, Semana, Mes, Personalizado, Cajero.

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    DollarSign, Calendar, ArrowLeft, TrendingUp, TrendingDown,
    PlusCircle, MinusCircle, CheckCircle2, AlertTriangle,
    Loader2, Lock, Filter, RefreshCw, User, ShieldCheck, Wallet,
    Users, Printer, RotateCcw, Key, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function CajaDashboardPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [filter, setFilter] = useState<'day' | 'week' | 'month' | 'custom'>('day');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [cashier, setCashier] = useState('');

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Arqueo de Caja State
    const [dineroContado, setDineroContado] = useState<string>('');
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    // Sesión de Caja Activa & Relevo de Turno
    const [cashSession, setCashSession] = useState<any>(null);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);

    const [openAmount, setOpenAmount] = useState('0');
    const [openNotes, setOpenNotes] = useState('');
    const [closeCounted, setCloseCounted] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [closeReport, setCloseReport] = useState<any>(null);

    const [handoverCounted, setHandoverCounted] = useState('');
    const [incomingUserId, setIncomingUserId] = useState('');
    const [handoverNewStart, setHandoverNewStart] = useState('');
    const [handoverNotes, setHandoverNotes] = useState('');
    const [submittingSession, setSubmittingSession] = useState(false);

    // Modal Form States
    const [cantidadForm, setCantidadForm] = useState<string>('1');
    const [precioUnitarioForm, setPrecioUnitarioForm] = useState<string>('');
    const [montoForm, setMontoForm] = useState('');
    const [conceptoForm, setConceptoForm] = useState('');
    const [metodoForm, setMetodoForm] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');
    const [submittingForm, setSubmittingForm] = useState(false);

    const fetchCashSession = async () => {
        try {
            const res = await fetch('/api/admin/cash/session');
            if (res.ok) {
                const d = await res.json();
                if (d.success) {
                    setCashSession(d.session);
                }
            }
        } catch (e) {
            console.error('Error cargando sesión de caja:', e);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/admin/usuarios');
            if (res.ok) {
                const d = await res.json();
                const list = Array.isArray(d) ? d : (d.users || []);
                setStaffList(list);
            }
        } catch (e) {}
    };

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/finance?filter=${filter}`;
            if (filter === 'custom' && startDate && endDate) {
                url += `&startDate=${startDate}&endDate=${endDate}`;
            }
            if (cashier) {
                url += `&cashier=${encodeURIComponent(cashier)}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const d = await res.json();
                setData(d);
            }
        } catch (e) {
            console.error('Error cargando finanzas de caja:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
        fetchCashSession();
        fetchStaff();
    }, [filter, startDate, endDate, cashier]);

    const handleOpenSession = async () => {
        setSubmittingSession(true);
        try {
            const res = await fetch('/api/admin/cash/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    openingCash: parseFloat(openAmount) || 0,
                    notes: openNotes
                })
            });
            const d = await res.json();
            if (d.success) {
                setShowOpenModal(false);
                setOpenAmount('0');
                setOpenNotes('');
                fetchCashSession();
                fetchFinanceData();
            } else {
                alert(d.error || 'Error abriendo sesión de caja');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setSubmittingSession(false);
        }
    };

    const handleCloseSession = async () => {
        if (!cashSession) return;
        const counted = parseFloat(closeCounted);
        if (isNaN(counted) || counted < 0) {
            alert('Por favor ingresa un monto de efectivo contado válido.');
            return;
        }

        setSubmittingSession(true);
        try {
            const res = await fetch('/api/admin/cash/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: cashSession.id,
                    cashCounted: counted,
                    notes: closeNotes
                })
            });
            const d = await res.json();
            if (d.success) {
                setCloseReport(d.summary);
                fetchCashSession();
                fetchFinanceData();
            } else {
                alert(d.error || 'Error cerrando turno de caja');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setSubmittingSession(false);
        }
    };

    const handleHandoverSession = async () => {
        if (!cashSession) return;
        if (!incomingUserId) {
            alert('Selecciona al cajero que recibe el turno.');
            return;
        }
        const counted = parseFloat(handoverCounted);
        if (isNaN(counted) || counted < 0) {
            alert('Ingresa el efectivo contado que entrega el cajero saliente.');
            return;
        }

        setSubmittingSession(true);
        try {
            const res = await fetch('/api/admin/cash/handover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: cashSession.id,
                    outgoingCashCounted: counted,
                    incomingUserId,
                    startingCashDeclared: parseFloat(handoverNewStart) || counted,
                    notes: handoverNotes
                })
            });
            const d = await res.json();
            if (d.success) {
                alert('✅ Relevo de cajero completado exitosamente.');
                setShowHandoverModal(false);
                setHandoverCounted('');
                setIncomingUserId('');
                setHandoverNewStart('');
                setHandoverNotes('');
                fetchCashSession();
                fetchFinanceData();
            } else {
                alert(d.error || 'Error en relevo de caja');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setSubmittingSession(false);
        }
    };

    const handleCreateMovement = async (action: 'ADD_INCOME' | 'ADD_EXPENSE') => {
        const qty = parseFloat(cantidadForm) || 1;
        const price = parseFloat(precioUnitarioForm) || parseFloat(montoForm) || 0;
        const totalAmount = qty * price;

        if (totalAmount <= 0) {
            alert('Ingresa una cantidad y precio unitario válidos mayores a 0');
            return;
        }

        if (!conceptoForm.trim()) {
            alert('Ingresa una descripción del movimiento');
            return;
        }

        setSubmittingForm(true);
        try {
            const res = await fetch('/api/admin/finance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    monto: totalAmount,
                    concepto: `${conceptoForm.trim()} (${qty} uds x $${price.toFixed(2)})`,
                    metodo: metodoForm
                })
            });

            if (res.ok) {
                setShowIncomeModal(false);
                setShowExpenseModal(false);
                setCantidadForm('1');
                setPrecioUnitarioForm('');
                setMontoForm('');
                setConceptoForm('');
                fetchFinanceData();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Error registrando movimiento');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setSubmittingForm(false);
        }
    };

    const metrics = data?.metrics || {};
    const totalEsperado = Number(metrics.totalEsperadoEfectivo) || 0;
    const contadoNum = parseFloat(dineroContado) || 0;
    const diferencia = dineroContado !== '' ? contadoNum - totalEsperado : 0;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 text-slate-900 animate-in fade-in duration-300">
            {/* Header Sticky */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide leading-none block mb-0.5">
                            Módulo de Caja Financiera
                        </span>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Dashboard Financiero & Arqueo
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchFinanceData}
                        className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-100 cursor-pointer shadow-sm"
                    >
                        <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Actualizar
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Panel de Sesión Monetaria Activa (Apertura, Cierre Z, Relevo) */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "size-12 rounded-2xl flex items-center justify-center font-bold",
                                cashSession ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}>
                                <Wallet className="size-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Terminal / Caja Principal</span>
                                    {cashSession ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase animate-pulse">
                                            ● Turno Activo
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                            Sin Sesión Abierta
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                    {cashSession ? `Cajero: ${cashSession.user?.name || cashSession.user?.email || 'Operador'} (Desde ${format(new Date(cashSession.openedAt), 'HH:mm dd/MM', { locale: es })})` : 'Caja Cerrada'}
                                </h2>
                                {cashSession && (
                                    <p className="text-xs text-slate-500 font-medium">
                                        Fondo Inicial: <strong className="text-slate-900">${cashSession.openingCash.toFixed(2)}</strong> • Efectivo Esperado: <strong className="text-emerald-700">${Number(cashSession.cashExpected || 0).toFixed(2)}</strong>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {!cashSession ? (
                                <button
                                    onClick={() => setShowOpenModal(true)}
                                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <PlusCircle className="size-4" /> Abrir Sesión de Caja
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowHandoverModal(true)}
                                        className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <RotateCcw className="size-4" /> Relevo de Cajero
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCloseCounted(Number(cashSession.cashExpected || 0).toFixed(2));
                                            setShowCloseModal(true);
                                        }}
                                        className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Lock className="size-4" /> Cierre Z (Cerrar Turno)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {/* Banner ÚNICO de Acciones Directas de Caja */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
                    <div>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide block">Operaciones Diarias de Caja</span>
                        <h2 className="text-lg font-bold tracking-tight">Gestión Inmediata de Ingresos & Gastos</h2>
                        <p className="text-xs text-slate-300 font-medium">Registra entradas manuales de dinero o salidas por egresos/compras en segundos.</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                        <button
                            onClick={() => setShowIncomeModal(true)}
                            className="flex-1 sm:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
                        >
                            <PlusCircle className="size-4" /> <span>➕ Registrar Ingreso</span>
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="flex-1 sm:flex-none px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
                        >
                            <MinusCircle className="size-4" /> <span>➖ Registrar Gasto</span>
                        </button>
                    </div>
                </div>

                {/* Selector de Filtros de Fecha */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-slate-200/80 shadow-sm">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                        {(['day', 'week', 'month', 'custom'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                                    filter === f ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {f === 'day' ? '📅 Hoy' : f === 'week' ? '🗓️ Semana' : f === 'month' ? '📊 Mes' : '⚙️ Personalizado'}
                            </button>
                        ))}
                    </div>

                    {filter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 outline-none"
                            />
                            <span className="text-xs font-bold text-slate-400">a</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Grid de Métricas Principales de Caja */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    {/* Ventas del Día */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wide">Ventas del Período</span>
                            <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${(metrics.totalVentas || 0).toFixed(2)}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase">POS, Meseros & Pedidos Landing</p>
                    </div>

                    {/* Ingresos Manuales */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Ingresos Manuales</span>
                            <div className="size-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-700 tracking-tight">
                            +${(metrics.ingresosManuales || 0).toFixed(2)}
                        </p>
                        <p className="text-xs font-bold text-emerald-600 uppercase">Entradas manuales registradas</p>
                    </div>

                    {/* Gastos / Egresos */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wide text-rose-700">Gastos / Egresos</span>
                            <div className="size-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                <TrendingDown size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-rose-700 tracking-tight">
                            -${(metrics.gastos || 0).toFixed(2)}
                        </p>
                        <p className="text-xs font-bold text-rose-600 uppercase">Salidas / Compras de caja</p>
                    </div>

                    {/* Total Esperado en Caja */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-white/50">
                            <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">Total Esperado (Efectivo)</span>
                            <div className="size-10 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold">
                                <Wallet size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">
                            ${totalEsperado.toFixed(2)}
                        </p>
                        <p className="text-xs font-bold text-white/60 uppercase">Calculado automáticamente</p>
                    </div>
                </div>

                {/* Panel de Arqueo y Cuadre de Caja */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <ShieldCheck className="text-emerald-600 size-5" /> Arqueo de Caja & Cuadre Diario
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold">Ingresa el dinero físico contado en gaveta para validar diferencias.</p>
                        </div>

                        {dineroContado !== '' && (
                            <div className={cn(
                                "px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 border",
                                diferencia === 0
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : diferencia > 0
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : "bg-rose-50 text-rose-800 border-rose-300"
                            )}>
                                {diferencia === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                {diferencia === 0
                                    ? "✅ Caja Cuadrada (Diferencia: $0.00)"
                                    : diferencia > 0
                                    ? `🔷 Sobrante en Caja: +$${diferencia.toFixed(2)}`
                                    : `⚠️ Faltante en Caja: -$${Math.abs(diferencia).toFixed(2)}`}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        <div className="w-full sm:w-80">
                            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">
                                Dinero Físico Contado ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Ej. 150.00"
                                value={dineroContado}
                                onChange={e => setDineroContado(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-lg font-bold bg-slate-50 outline-none focus:border-slate-900 transition-all"
                            />
                        </div>

                        <div className="flex-1 text-xs text-slate-500 font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <p className="font-bold text-slate-900 mb-1">Fórmula de Arqueo:</p>
                            <p>Esperado en Caja = Ventas Efectivo (${(metrics.ventasEfectivo || 0).toFixed(2)}) + Ingresos (${(metrics.ingresosManuales || 0).toFixed(2)}) - Gastos (${(metrics.gastos || 0).toFixed(2)})</p>
                        </div>
                    </div>
                </div>

                {/* Desglose por Método de Pago */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider ">Desglose por Métodos de Pago</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                            <p className="text-xs font-bold text-emerald-800 uppercase">💵 Efectivo</p>
                            <p className="text-xl font-bold text-emerald-950 mt-1">${(metrics.ventasEfectivo || 0).toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                            <p className="text-xs font-bold text-blue-800 uppercase">💳 Tarjeta</p>
                            <p className="text-xl font-bold text-blue-950 mt-1">${(metrics.ventasTarjeta || 0).toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl">
                            <p className="text-xs font-bold text-purple-800 uppercase">🏦 Transferencia</p>
                            <p className="text-xl font-bold text-purple-950 mt-1">${(metrics.ventasTransferencia || 0).toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                            <p className="text-xs font-bold text-amber-800 uppercase">🔀 Otros / Mixto</p>
                            <p className="text-xl font-bold text-amber-950 mt-1">${(metrics.ventasOtros || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Sección Única de Órdenes Pendientes de Cobro (estadoFinanciero === PENDIENTE) */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 ">
                                <Wallet className="text-amber-600 size-5" /> Órdenes Pendientes de Cobro
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold">Órdenes abiertas o entregadas que requieren cobro en Caja (POS, Mesas, Delivery contra entrega)</p>
                        </div>
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                            Filtro Financiero: PENDIENTE
                        </span>
                    </div>

                    {/* Pending Collection List */}
                    <PendingCollectionOrdersList onCollectionSuccess={fetchFinanceData} />
                </div>

                {/* Lista de Transacciones & Movimientos de Caja */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider ">Historial de Transacciones del Período</h3>
                        <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                            {data?.payments?.length || 0} Registros
                        </span>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {data?.payments?.map((pago: any) => {
                            const isGasto = pago.referencia?.startsWith('GASTO');
                            const isIngreso = pago.referencia?.startsWith('INGRESO_MANUAL');
                            return (
                                <div
                                    key={pago.id}
                                    className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between text-xs"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "size-10 rounded-xl flex items-center justify-center font-bold text-sm",
                                            isGasto ? "bg-rose-100 text-rose-700" : isIngreso ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {isGasto ? '↓' : isIngreso ? '↑' : '$'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 uppercase">{pago.clienteNombre}</p>
                                            <p className="text-xs font-semibold text-slate-400">{pago.servicioNombre} • {pago.referencia || 'Venta de contado'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-bold text-sm",
                                            isGasto ? "text-rose-600" : "text-slate-900"
                                        )}>
                                            {isGasto ? '-' : '+'}${Number(pago.monto).toFixed(2)}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">{pago.metodo} • {format(new Date(pago.fecha), 'dd MMM HH:mm', { locale: es })}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Modal para Registrar Ingreso Manual */}
            {mounted && showIncomeModal && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-xs font-bold uppercase text-emerald-600 tracking-wide block">Operación de Caja</span>
                                <h3 className="font-bold text-lg text-slate-900 ">Registrar Ingreso Manual</h3>
                            </div>
                            <button 
                                onClick={() => setShowIncomeModal(false)} 
                                className="size-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Descripción / Concepto</label>
                                <input
                                    type="text"
                                    value={conceptoForm}
                                    onChange={e => setConceptoForm(e.target.value)}
                                    placeholder="Ej. Inyección de base / Fondo inicial"
                                    className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 transition-all shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={cantidadForm}
                                        onChange={e => setCantidadForm(e.target.value)}
                                        placeholder="1"
                                        className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-base bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 transition-all text-center shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Precio Unit. ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={precioUnitarioForm}
                                        onChange={e => setPrecioUnitarioForm(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-base bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 transition-all text-center shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Total a Ingresar:</span>
                                <span className="text-2xl font-bold text-emerald-700">
                                    ${((parseFloat(cantidadForm) || 1) * (parseFloat(precioUnitarioForm) || 0)).toFixed(2)}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Método de Pago</label>
                                <select
                                    value={metodoForm}
                                    onChange={e => setMetodoForm(e.target.value as any)}
                                    className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-xs bg-white text-slate-900 outline-none cursor-pointer focus:border-emerald-600 shadow-sm"
                                >
                                    <option value="EFECTIVO" className="text-slate-900 bg-white">💵 Efectivo (Gaveta de Caja)</option>
                                    <option value="TRANSFERENCIA" className="text-slate-900 bg-white">🏦 Transferencia Bancaria</option>
                                    <option value="TARJETA" className="text-slate-900 bg-white">💳 Tarjeta / POS</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowIncomeModal(false)}
                                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCreateMovement('ADD_INCOME')}
                                disabled={submittingForm}
                                className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl cursor-pointer transition-all disabled:opacity-50"
                            >
                                {submittingForm ? 'Guardando...' : '➕ Confirmar Ingreso'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal para Registrar Egreso / Gasto */}
            {mounted && showExpenseModal && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-xs font-bold uppercase text-rose-600 tracking-wide block">Operación de Caja</span>
                                <h3 className="font-bold text-lg text-slate-900 ">Registrar Gasto / Egreso</h3>
                            </div>
                            <button 
                                onClick={() => setShowExpenseModal(false)} 
                                className="size-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Descripción / Detalle del Gasto</label>
                                <input
                                    type="text"
                                    value={conceptoForm}
                                    onChange={e => setConceptoForm(e.target.value)}
                                    placeholder="Ej. Compra de bolsas de hielo / Insumos"
                                    className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-600 transition-all shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={cantidadForm}
                                        onChange={e => setCantidadForm(e.target.value)}
                                        placeholder="1"
                                        className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-base bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-600 transition-all text-center shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Precio Unit. ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={precioUnitarioForm}
                                        onChange={e => setPrecioUnitarioForm(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-base bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-600 transition-all text-center shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">Total de Egreso:</span>
                                <span className="text-2xl font-bold text-rose-700">
                                    -${((parseFloat(cantidadForm) || 1) * (parseFloat(precioUnitarioForm) || 0)).toFixed(2)}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Método de Salida de Dinero</label>
                                <select
                                    value={metodoForm}
                                    onChange={e => setMetodoForm(e.target.value as any)}
                                    className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-xs bg-white text-slate-900 outline-none cursor-pointer focus:border-rose-600 shadow-sm"
                                >
                                    <option value="EFECTIVO" className="text-slate-900 bg-white">💵 Efectivo (Gaveta de Caja)</option>
                                    <option value="TRANSFERENCIA" className="text-slate-900 bg-white">🏦 Transferencia Bancaria</option>
                                    <option value="TARJETA" className="text-slate-900 bg-white">💳 Tarjeta / Débito</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowExpenseModal(false)}
                                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCreateMovement('ADD_EXPENSE')}
                                disabled={submittingForm}
                                className="w-2/3 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl cursor-pointer transition-all disabled:opacity-50"
                            >
                                {submittingForm ? 'Guardando...' : '➖ Confirmar Gasto'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Apertura de Caja */}
            {mounted && showOpenModal && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div className="size-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <PlusCircle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base uppercase">Apertura de Sesión de Caja</h3>
                                <p className="text-xs text-slate-500 font-medium">Inicia el turno monetario para ventas POS</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Fondo Inicial de Caja (Base en Efectivo $)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={openAmount}
                                    onChange={e => setOpenAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:border-emerald-600 transition-all bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Observaciones / Terminal
                                </label>
                                <textarea
                                    value={openNotes}
                                    onChange={e => setOpenNotes(e.target.value)}
                                    placeholder="Ej. Terminal Principal. Billetes y monedas verificados."
                                    rows={2}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-slate-900 bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowOpenModal(false)}
                                className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenSession}
                                disabled={submittingSession}
                                className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
                            >
                                {submittingSession ? 'Abriendo...' : '💵 Confirmar Apertura'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Cierre Z de Caja */}
            {mounted && showCloseModal && cashSession && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div className="size-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base uppercase">Cierre Z & Cuadre Definitivo</h3>
                                <p className="text-xs text-slate-500 font-medium">Cierre formal de turno del cajero {cashSession.user?.name || ''}</p>
                            </div>
                        </div>

                        {/* Desglose Esperado */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-slate-600">
                                <span>Fondo Inicial:</span>
                                <span>${cashSession.openingCash.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-600">
                                <span>Efectivo Esperado en Gaveta:</span>
                                <span className="font-bold text-slate-900">${Number(cashSession.cashExpected || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-xs">
                                <span>Tarjeta / Electrónico (No físico):</span>
                                <span>${Number(cashSession.cardExpected || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Dinero Físico Contado por Cajero ($) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={closeCounted}
                                    onChange={e => setCloseCounted(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-3.5 border-2 border-slate-900 rounded-2xl font-bold text-2xl text-center outline-none bg-slate-50 text-slate-900"
                                />
                            </div>

                            {closeCounted !== '' && (
                                <div className={cn(
                                    "p-3 rounded-xl text-xs font-bold flex items-center justify-between border",
                                    parseFloat(closeCounted) - cashSession.cashExpected === 0
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : parseFloat(closeCounted) - cashSession.cashExpected > 0
                                        ? "bg-blue-50 text-blue-800 border-blue-300"
                                        : "bg-rose-50 text-rose-800 border-rose-300"
                                )}>
                                    <span>Diferencia Calculada:</span>
                                    <span>
                                        {parseFloat(closeCounted) - cashSession.cashExpected === 0
                                            ? '✅ Cuadre Exacto ($0.00)'
                                            : (parseFloat(closeCounted) - cashSession.cashExpected > 0 ? '+Sobrante: $' : '-Faltante: $') +
                                              Math.abs(parseFloat(closeCounted) - cashSession.cashExpected).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Notas y Justificaciones del Cierre
                                </label>
                                <textarea
                                    value={closeNotes}
                                    onChange={e => setCloseNotes(e.target.value)}
                                    placeholder="Indica motivos de faltante/sobrante si aplica..."
                                    rows={2}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowCloseModal(false)}
                                className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseSession}
                                disabled={submittingSession}
                                className="w-2/3 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
                            >
                                {submittingSession ? 'Cerrando Turno...' : '🔒 Confirmar Cierre Z'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Relevo de Turno / Cambio de Cajero */}
            {mounted && showHandoverModal && cashSession && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div className="size-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base uppercase">Relevo de Turno / Cajero</h3>
                                <p className="text-xs text-slate-500 font-medium">Entrega de caja auditable entre cajeros</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Cajero Saliente (Actual)
                                </label>
                                <p className="p-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-800">
                                    {cashSession.user?.name || cashSession.user?.email}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Efectivo Contado Entregado por Saliente ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={handoverCounted}
                                    onChange={e => {
                                        setHandoverCounted(e.target.value);
                                        if (!handoverNewStart) setHandoverNewStart(e.target.value);
                                    }}
                                    placeholder="0.00"
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-base text-center outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Cajero Entrante (Receptor)
                                </label>
                                <select
                                    value={incomingUserId}
                                    onChange={e => setIncomingUserId(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:border-slate-900"
                                >
                                    <option value="">Selecciona al nuevo cajero...</option>
                                    {staffList
                                        .filter(s => s.id !== cashSession.userId)
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name || s.email} ({s.role})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Fondo Inicial Declarado para Nuevo Turno ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={handoverNewStart}
                                    onChange={e => setHandoverNewStart(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-base text-center outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                    Notas del Relevo
                                </label>
                                <textarea
                                    value={handoverNotes}
                                    onChange={e => setHandoverNotes(e.target.value)}
                                    placeholder="Observaciones de entrega de llaves, monedas, etc."
                                    rows={2}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowHandoverModal(false)}
                                className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleHandoverSession}
                                disabled={submittingSession}
                                className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
                            >
                                {submittingSession ? 'Procesando Relevo...' : '🤝 Confirmar Relevo'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Comprobante Arqueo Z Imprimible */}
            {mounted && closeReport && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 font-mono text-xs">
                        <div className="text-center border-b border-dashed border-slate-300 pb-4">
                            <p className="font-bold text-base uppercase">Reporte de cierre z</p>
                            <p className="text-xs text-slate-500">Citiox POS - control monetario</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleString()}</p>
                        </div>

                        <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                            <div className="flex justify-between">
                                <span>Fondo Inicial:</span>
                                <span className="font-bold">${closeReport.openingCash?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Ventas Efectivo:</span>
                                <span className="font-bold">${closeReport.cashSales?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Ventas Tarjeta:</span>
                                <span className="font-bold">${closeReport.cardSales?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Ingresos Manuales:</span>
                                <span className="font-bold">+${closeReport.manualIncomes?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Gastos de Caja:</span>
                                <span className="font-bold">-${closeReport.manualExpenses?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 font-bold">
                            <div className="flex justify-between text-slate-900">
                                <span>Total esperado en caja:</span>
                                <span>${closeReport.cashExpected?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-900">
                                <span>Efectivo contado:</span>
                                <span>${closeReport.cashCounted?.toFixed(2)}</span>
                            </div>
                            <div className={cn(
                                "flex justify-between text-sm font-bold",
                                closeReport.difference === 0 ? "text-emerald-700" : closeReport.difference > 0 ? "text-blue-700" : "text-rose-700"
                            )}>
                                <span>Diferencia:</span>
                                <span>${closeReport.difference?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-sans font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Printer size={16} /> Imprimir Comprobante
                            </button>
                            <button
                                onClick={() => setCloseReport(null)}
                                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-sans font-bold text-xs uppercase cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function PendingCollectionOrdersList({ onCollectionSuccess }: { onCollectionSuccess: () => void }) {
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/pedidos');
            if (res.ok) {
                const data = await res.json();
                // Regla de Caja: Filtrar ÚNICAMENTE órdenes que NO estén pagadas ni finalizadas
                const pending = (Array.isArray(data) ? data : []).filter((p: any) => {
                    let extra: any = {};
                    if (typeof p.extraInfo === 'string') {
                        try { extra = JSON.parse(p.extraInfo); } catch {}
                    } else if (p.extraInfo && typeof p.extraInfo === 'object') {
                        extra = p.extraInfo;
                    }

                    const pStatus = (p.paymentStatus || extra.paymentStatus || '').toUpperCase();
                    const payEstado = (p.payment?.estado || p.payment?.status || '').toUpperCase();
                    const orderEstado = (p.estado || '').toUpperCase();
                    const saldoPendiente = extra.saldoPendiente !== undefined ? Number(extra.saldoPendiente) : null;
                    const montoPagado = Number(extra.montoPagadoAcumulado || 0);
                    const total = Number(p.total || 0);

                    const isPaid = (
                        pStatus === 'PAGADO' ||
                        pStatus === 'CONFIRMADO' ||
                        payEstado === 'CONFIRMADO' ||
                        payEstado === 'PAGADO' ||
                        payEstado === 'PAID' ||
                        orderEstado === 'FINALIZADO' ||
                        orderEstado === 'COMPLETADO' ||
                        (saldoPendiente !== null && saldoPendiente <= 0) ||
                        (montoPagado >= total && total > 0)
                    );

                    return !isPaid && orderEstado !== 'CANCELADO' && orderEstado !== 'CANCELLED';
                });
                setPendingOrders(pending);
            }
        } catch (e) {
            console.error('Error cargando órdenes pendientes en caja:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const handleCollectOrder = async (orderId: string) => {
        setProcessingId(orderId);
        try {
            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: orderId,
                    action: 'MARCAR_PAGADO',
                    paymentStatus: 'PAGADO',
                    metodoPago: selectedMethod
                })
            });
            if (res.ok) {
                setPendingOrders(prev => prev.filter(o => o.id !== orderId));
                onCollectionSuccess();
            } else {
                alert('Error registrando cobro en Caja');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs font-bold gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Cargando órdenes pendientes de cobrar...
            </div>
        );
    }

    if (pendingOrders.length === 0) {
        return (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400">
                ✅ No hay órdenes pendientes de cobro en este momento. Todas las ventas están al día.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendingOrders.map(order => (
                <div
                    key={order.id}
                    className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col justify-between space-y-3"
                >
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <div>
                            <span className="font-bold text-xs text-slate-900">
                                #{order.codigo || order.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold ml-2">
                                ({order.mesaCode || order.tipoEntrega || 'Venta POS'})
                            </span>
                        </div>
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                            {order.estado}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-extrabold text-xs text-slate-900">{order.nombreCliente || 'Cliente'}</p>
                            <p className="text-xs text-slate-400 font-semibold">{order.items?.length || 0} productos</p>
                        </div>
                        <p className="text-base font-bold text-emerald-700">${(Number(order.total) || 0).toFixed(2)}</p>
                    </div>

                    {/* Selector de Método de Pago & Botón Cobrar */}
                    <div className="pt-2 border-t border-amber-100 flex items-center gap-2">
                        <select
                            value={selectedMethod}
                            onChange={e => setSelectedMethod(e.target.value as any)}
                            className="text-xs font-bold bg-white border border-amber-200 rounded-lg px-1.5 py-1 text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="EFECTIVO">💵 Efectivo</option>
                            <option value="TRANSFERENCIA">🏦 Transferencia</option>
                            <option value="TARJETA">💳 Tarjeta</option>
                        </select>

                        <button
                            onClick={() => handleCollectOrder(order.id)}
                            disabled={processingId === order.id}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                        >
                            {processingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                '💵 Cobrar en Caja'
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

