"use client";

import { useState } from "react";
import { Trash2, Edit, Loader2, X, Save, User, Mail, Phone, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserActionsProps {
    usuario: any;
}

export default function UserActions({ usuario }: UserActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [nombre, setNombre] = useState(usuario.nombre || '');
    const [email, setEmail] = useState(usuario.email || '');
    const [phone, setPhone] = useState(usuario.phone || '');
    const [role, setRole] = useState(usuario.role || 'ADMIN');
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState('');

    const deleteUser = async () => {
        if (!confirm(`¿Estás seguro de eliminar a "${usuario.nombre || usuario.email}"?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/usuarios/${usuario.id}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Error al eliminar el usuario");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/superadmin/usuarios/${usuario.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, phone, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al guardar cambios');
                return;
            }

            setShowModal(false);
            router.refresh();
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-end gap-2">
                {loading ? (
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                ) : (
                    <>
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Editar Perfil"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={deleteUser}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Eliminar Cuenta"
                        >
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
            </div>

            {/* Modal de Edición */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900">Editar Usuario</h3>
                                <p className="text-sm text-slate-400 mt-0.5">Modifica los datos del administrador</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Avatar */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                                {nombre ? nombre.charAt(0).toUpperCase() : '?'}
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm rounded-r-xl">
                                {error}
                            </div>
                        )}

                        <form onSubmit={saveUser} className="space-y-4">
                            {/* Nombre */}
                            <div className="flex items-center w-full border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all overflow-hidden">
                                <div className="pl-4 pr-3 text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nombre completo"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full py-3 pr-4 bg-transparent !text-slate-900 font-medium placeholder-slate-300 focus:outline-none text-sm"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex items-center w-full border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all overflow-hidden">
                                <div className="pl-4 pr-3 text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-3 pr-4 bg-transparent !text-slate-900 font-medium placeholder-slate-300 focus:outline-none text-sm"
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="flex items-center w-full border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all overflow-hidden">
                                <div className="pl-4 pr-3 text-slate-400">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="Teléfono / WhatsApp"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full py-3 pr-4 bg-transparent !text-slate-900 font-medium placeholder-slate-300 focus:outline-none text-sm"
                                />
                            </div>

                            {/* Rol */}
                            <div className="flex items-center w-full border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all overflow-hidden">
                                <div className="pl-4 pr-3 text-slate-400">
                                    <Shield size={18} />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full py-3 pr-4 bg-transparent !text-slate-900 font-medium focus:outline-none text-sm appearance-none cursor-pointer"
                                >
                                    <option value="ADMIN">Admin de Negocio</option>
                                    <option value="SUPERADMIN">Super Admin</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="PROFESOR">Profesor</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveLoading}
                                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
