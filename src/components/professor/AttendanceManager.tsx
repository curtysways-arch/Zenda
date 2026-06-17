
"use client";

import { useState } from "react";
import { Check, X, Loader2, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
    enrollmentId: string;
    name: string;
    status: string; // 'present' | 'absent' | 'pending'
}

export default function AttendanceManager({ 
    classId, 
    initialStudents 
}: { 
    classId: string, 
    initialStudents: Student[] 
}) {
    const [students, setStudents] = useState(initialStudents);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const toggleStatus = (id: string, status: 'present' | 'absent') => {
        setStudents(prev => prev.map(s => 
            s.enrollmentId === id 
                ? { ...s, status: s.status === status ? 'pending' : status } 
                : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/profesor/clases/${classId}/asistencia`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attendance: students }),
            });
            if (res.ok) {
                // Success feedback
                alert("Asistencia guardada correctamente");
            } else {
                alert("Error al guardar asistencia");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[3.5rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-2xl shadow-slate-200/40">
                {students.map((student) => (
                    <div key={student.enrollmentId} className="p-6 md:p-8 flex items-center justify-between gap-4 group hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-5">
                            <div className="size-14 rounded-[1.5rem] bg-slate-900 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-slate-900/10">
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <span className="font-black text-slate-950 uppercase tracking-tight text-lg block leading-none">{student.name}</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Alumno Inscrito</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleStatus(student.enrollmentId, 'present')}
                                className={cn(
                                    "size-14 rounded-2xl transition-all duration-300 flex items-center justify-center border-2",
                                    student.status === 'present'
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-110"
                                        : "bg-white border-slate-100 text-slate-200 hover:border-emerald-200"
                                )}
                            >
                                <Check size={24} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => toggleStatus(student.enrollmentId, 'absent')}
                                className={cn(
                                    "size-14 rounded-2xl transition-all duration-300 flex items-center justify-center border-2",
                                    student.status === 'absent'
                                        ? "bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/30 scale-110"
                                        : "bg-white border-slate-100 text-slate-200 hover:border-rose-200"
                                )}
                            >
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                ))}

                {students.length === 0 && (
                    <div className="p-24 text-center flex flex-col items-center gap-6">
                        <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                            <Users size={64} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] italic max-w-xs leading-loose">
                            No hay alumnos inscritos en este curso.
                        </p>
                    </div>
                )}
            </div>

            <div className="sticky bottom-24 md:bottom-8 left-0 right-0 px-4 md:px-0 z-[60]">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-4 bg-slate-900 hover:bg-emerald-600 text-white font-black w-full md:w-fit md:ml-auto px-12 py-6 rounded-[2rem] uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-900/30 active:scale-95 transition-all duration-500 disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            <Save size={20} strokeWidth={2.5} /> 
                            <span>Guardar Asistencia</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
