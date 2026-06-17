'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Check, 
    X, 
    Loader2, 
    Landmark, 
    AlertTriangle,
    Eye,
    EyeOff
} from 'lucide-react';

interface Account {
    id: string;
    banco: string;
    numeroCuenta: string;
    nombreCuenta: string;
    logo: string | null;
    activo: boolean;
}

const PRESETS_BANCOS = [
    { name: 'Banco Pichincha', logo: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=100&auto=format&fit=crop&q=60' }, // Pichincha/Fintech fallback
    { name: 'Banco Guayaquil', logo: 'https://images.unsplash.com/photo-1601597111158-2fceff270190?w=100&auto=format&fit=crop&q=60' },
    { name: 'Banco del Pacífico', logo: 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?w=100&auto=format&fit=crop&q=60' },
    { name: 'Produbanco', logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=60' },
    { name: 'DeUna (QR/Celular)', logo: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=100&auto=format&fit=crop&q=60' }
];

export default function SuperAdminCuentasClient() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    
    // Campos del Formulario
    const [banco, setBanco] = useState('');
    const [numeroCuenta, setNumeroCuenta] = useState('');
    const [nombreCuenta, setNombreCuenta] = useState('');
    const [logo, setLogo] = useState('');
    const [activo, setActivo] = useState(true);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/superadmin/cuentas-pago');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const openCreateModal = () => {
        setEditingAccount(null);
        setBanco(PRESETS_BANCOS[0].name);
        setLogo(PRESETS_BANCOS[0].logo);
        setNumeroCuenta('');
        setNombreCuenta('');
        setActivo(true);
        setIsModalOpen(true);
    };

    const openEditModal = (account: Account) => {
        setEditingAccount(account);
        setBanco(account.banco);
        setNumeroCuenta(account.numeroCuenta);
        setNombreCuenta(account.nombreCuenta);
        setLogo(account.logo || '');
        setActivo(account.activo);
        setIsModalOpen(true);
    };

    const handlePresetChange = (presetName: string) => {
        setBanco(presetName);
        const preset = PRESETS_BANCOS.find(p => p.name === presetName);
        if (preset) {
            setLogo(preset.logo);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!banco || !numeroCuenta || !nombreCuenta) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        setActionLoading(true);
        const payload = { banco, numeroCuenta, nombreCuenta, logo, activo };

        try {
            let res;
            if (editingAccount) {
                // Editar
                res = await fetch(`/api/superadmin/cuentas-pago/${editingAccount.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Crear
                res = await fetch('/api/superadmin/cuentas-pago', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                setIsModalOpen(false);
                fetchAccounts();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Ocurrió un error al guardar la cuenta');
            }
        } catch (error) {
            console.error('Error saving account:', error);
            alert('Error de red al guardar la cuenta');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro que deseas eliminar de forma definitiva la cuenta de "${name}"?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/superadmin/cuentas-pago/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchAccounts();
            } else {
                alert('No se pudo eliminar la cuenta');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error de conexión');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleStatus = async (account: Account) => {
        try {
            const res = await fetch(`/api/superadmin/cuentas-pago/${account.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: !account.activo })
            });

            if (res.ok) {
                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, activo: !a.activo } : a));
            }
        } catch (error) {
            console.error('Error toggling account status:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 size={36} className="animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest italic">
                        Cuentas de Recepción
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                        Administra las cuentas bancarias que los negocios verán al realizar transferencias.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                    <Plus size={16} />
                    Agregar Cuenta
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-16 text-center shadow-md flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-white/5 text-slate-400 rounded-full">
                        <Landmark size={36} />
                    </div>
                    <h4 className="text-md font-bold text-slate-200">No hay cuentas bancarias registradas</h4>
                    <p className="text-slate-400 max-w-sm mx-auto text-xs">
                        Agrega tu primera cuenta bancaria para que los negocios puedan realizar sus pagos por transferencia manual.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map(account => (
                        <div 
                            key={account.id} 
                            className={`bg-slate-900 border transition-all duration-300 rounded-[2rem] p-6 flex flex-col justify-between space-y-6 ${
                                account.activo 
                                    ? 'border-white/5 hover:border-emerald-500/20' 
                                    : 'border-white/5 opacity-60 hover:opacity-80'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl bg-white/5 border border-white/5 overflow-hidden flex items-center justify-center relative shadow-inner">
                                        {account.logo ? (
                                            <img 
                                                src={account.logo} 
                                                alt={account.banco} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <Landmark className="text-slate-500" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-md font-black text-white uppercase tracking-tight leading-none mb-1">
                                            {account.banco}
                                        </h4>
                                        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">
                                            {account.nombreCuenta}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleStatus(account)}
                                    title={account.activo ? "Desactivar cuenta" : "Activar cuenta"}
                                    className={`p-2 rounded-xl border transition-colors ${
                                        account.activo
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                                    }`}
                                >
                                    {account.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Número de Cuenta</span>
                                <span className="text-md font-mono font-bold text-white tracking-wider">
                                    {account.numeroCuenta}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                                <button
                                    onClick={() => openEditModal(account)}
                                    disabled={actionLoading}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-1.5 border border-white/5 transition-all active:scale-95"
                                >
                                    <Edit2 size={12} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(account.id, account.banco)}
                                    disabled={actionLoading}
                                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-1.5 border border-rose-500/10 transition-all active:scale-95"
                                >
                                    <Trash2 size={12} />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Formulario Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">
                                    {editingAccount ? 'Editar Cuenta' : 'Agregar Cuenta'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Define los parámetros de cobro del sistema
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            {/* Banco y presets */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Banco de la Cuenta *</label>
                                <select
                                    value={banco}
                                    onChange={e => handlePresetChange(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-emerald-500 transition-colors text-white font-bold uppercase text-xs cursor-pointer"
                                >
                                    {PRESETS_BANCOS.map(preset => (
                                        <option key={preset.name} value={preset.name} className="bg-slate-900 text-white uppercase">
                                            {preset.name}
                                        </option>
                                    ))}
                                    <option value="" className="bg-slate-900 text-white uppercase">-- Banco Personalizado --</option>
                                </select>
                                
                                {/* Entrada libre si selecciona personalizado */}
                                {!PRESETS_BANCOS.some(p => p.name === banco) && (
                                    <input 
                                        type="text"
                                        placeholder="Nombre del banco personalizado"
                                        value={banco}
                                        onChange={e => setBanco(e.target.value)}
                                        required
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-emerald-500 transition-colors text-white font-bold uppercase text-xs mt-2"
                                    />
                                )}
                            </div>

                            {/* Logo */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Logo del Banco (URL o Base64)</label>
                                <input 
                                    type="text"
                                    placeholder="https://ejemplo.com/logo.png o preset cargado"
                                    value={logo}
                                    onChange={e => setLogo(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-emerald-500 transition-colors text-white font-medium text-xs font-mono"
                                />
                            </div>

                            {/* Titular y Tipo */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre/Titular de Cuenta *</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: Ahorros - Zenda App S.A."
                                    value={nombreCuenta}
                                    onChange={e => setNombreCuenta(e.target.value)}
                                    required
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-emerald-500 transition-colors text-white font-bold uppercase text-xs"
                                />
                            </div>

                            {/* Número de Cuenta */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Número de Cuenta *</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: 2200334455"
                                    value={numeroCuenta}
                                    onChange={e => setNumeroCuenta(e.target.value)}
                                    required
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-emerald-500 transition-colors text-white font-mono font-bold text-sm"
                                />
                            </div>

                            {/* Activo / Inactivo */}
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox"
                                    id="activo"
                                    checked={activo}
                                    onChange={e => setActivo(e.target.checked)}
                                    className="size-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="activo" className="text-xs font-bold text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                                    Cuenta Activa y Visible
                                </label>
                            </div>

                            {/* Botón de Enviar */}
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {editingAccount ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
