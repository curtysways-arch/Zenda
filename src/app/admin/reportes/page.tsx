'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, Users, DollarSign, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReportesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('month');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reportes?range=${range}`);
            if (res.ok) {
                const d = await res.json();
                setData(d);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [range]);

    const exportToCSV = () => {
        if (!data || !data.chartData) return;

        const headers = ['Fecha', 'Ingresos'];
        const rows = data.chartData.map((item: any) => [item.date, item.total]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map((e: any) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ingresos_${range}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Generando Reporte...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reportes y Estadísticas</h1>
                    <p className="text-gray-500 text-sm font-medium">Analiza el rendimiento financiero y ocupación de tu complejo.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    {['today', 'week', 'month'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${range === r ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cartas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />
                    <DollarSign className="text-emerald-500 mb-4" size={24} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                    <h2 className="text-3xl font-black text-gray-900">${data?.summary.totalIngresos.toLocaleString() || 0}</h2>
                    <div className="mt-4 flex items-center gap-1 text-emerald-600">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-black uppercase">Confirmados</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />
                    <FileText className="text-blue-500 mb-4" size={24} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Reservas</p>
                    <h2 className="text-3xl font-black text-gray-900">{data?.summary.totalReservas || 0}</h2>
                    <p className="text-[10px] font-bold text-gray-400 mt-4 uppercase">Partidos jugados</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />
                    <Users className="text-purple-500 mb-4" size={24} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Promedio / Reserva</p>
                    <h2 className="text-3xl font-black text-gray-900">
                        ${data?.summary.totalReservas > 0 ? (data.summary.totalIngresos / data.summary.totalReservas).toFixed(0) : 0}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 mt-4 uppercase">Ticket promedio</p>
                </div>
            </div>

            {/* Gráfico Visual (Simulado con CSS y div bars por simplicidad sin librerías externas pesadas) */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/30 p-10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Flujo de Ingresos</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Distribución diaria en el rango seleccionado</p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-gray-50 text-gray-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition"
                    >
                        <Download size={16} />
                        Exportar Excel
                    </button>
                </div>

                <div className="h-64 flex items-end gap-2 md:gap-4 px-4 border-b border-gray-100">
                    {data?.chartData.length > 0 ? data.chartData.map((item: any, i: number) => {
                        const max = Math.max(...data.chartData.map((d: any) => d.total));
                        const height = (item.total / max) * 100;
                        return (
                            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative pb-2">
                                <div
                                    className="w-full max-w-[4rem] bg-emerald-500/10 group-hover:bg-emerald-500 rounded-t-xl transition-all duration-500 ease-out cursor-pointer relative"
                                    style={{ height: `${height}%`, minHeight: '4px' }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded-lg text-[9px] font-black opacity-0 group-hover:opacity-100 transition shadow-xl z-10 pointer-events-none">
                                        ${item.total}
                                    </div>
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 mt-2 rotate-45 md:rotate-0">
                                    {item.date.split('-').slice(2).join('/')}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                            <BarChart3 size={48} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin datos en este rango</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
