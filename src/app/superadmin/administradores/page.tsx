import prisma from "@/lib/prisma";
import {
    UserPlus,
    Mail,
    Shield,
    ShieldCheck,
    MoreVertical,
    Calendar,
    Search
} from "lucide-react";
import UserActions from "@/components/superadmin/UserActions";

export default async function AdministradoresPage() {
    const usuarios = await prisma.usuario.findMany({
        include: {
            Negocio: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Administradores y Usuarios</h2>
                    <p className="text-slate-500 mt-1">Gestión global de cuentas de usuario y permisos del sistema.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                    <UserPlus size={20} />
                    Invitar Administrador
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o rol..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuario</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rol</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Asignado a</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Registro</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usuarios.map((usuario) => (
                                <tr key={usuario.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${usuario.role === 'SUPERADMIN' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-400'
                                                }`}>
                                                {usuario.nombre ? usuario.nombre.charAt(0) : usuario.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{usuario.nombre || 'Sin nombre'}</div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Mail size={12} />
                                                    {usuario.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {usuario.role === 'SUPERADMIN' ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 italic">
                                                    <ShieldCheck size={14} className="text-indigo-600" />
                                                    Super Admin
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100">
                                                    <Shield size={14} />
                                                    Admin de Negocio
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {usuario.Negocio ? (
                                            <div className="text-sm">
                                                <div className="font-semibold text-slate-700">{usuario.Negocio.nombre}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">ID: {usuario.Negocio.id}</div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Acceso Global</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <Calendar size={14} />
                                            {usuario.createdAt.toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <UserActions usuario={usuario} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
