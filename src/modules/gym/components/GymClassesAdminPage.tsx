'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Plus, Clock, Users, Flame, Dumbbell, 
  MapPin, User, Edit2, Trash2, CheckCircle2, AlertCircle, 
  Search, Filter, Sparkles, X, ChevronRight, Shield
} from 'lucide-react';

interface GymClassItem {
  id: string;
  name: string;
  description?: string;
  coach: string;
  category: string;
  room: string;
  daysOfWeek: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  color: string;
  active: boolean;
  enrolledToday?: number;
}

const DAYS_LIST = [
  { id: 'LUN', label: 'Lunes' },
  { id: 'MAR', label: 'Martes' },
  { id: 'MIE', label: 'Miércoles' },
  { id: 'JUE', label: 'Jueves' },
  { id: 'VIE', label: 'Viernes' },
  { id: 'SAB', label: 'Sábado' },
  { id: 'DOM', label: 'Domingo' }
];

const CATEGORIES = [
  { id: 'Cardio', label: 'Cardio & Resistencia', color: '#ef4444' },
  { id: 'Fuerza', label: 'Fuerza & Potencia', color: '#ea580c' },
  { id: 'Funcional', label: 'Funcional & HIIT', color: '#f59e0b' },
  { id: 'Mente & Cuerpo', label: 'Mente & Flexibilidad', color: '#10b981' },
  { id: 'Combate', label: 'Box & Artes Marciales', color: '#8b5cf6' },
  { id: 'General', label: 'Entrenamiento General', color: '#3b82f6' }
];

export default function GymClassesAdminPage() {
  const [classes, setClasses] = useState<GymClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClassItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Formulario
  const [name, setName] = useState('');
  const [coach, setCoach] = useState('');
  const [category, setCategory] = useState('Cardio');
  const [room, setRoom] = useState('Sala Principal');
  const [selectedDays, setSelectedDays] = useState<string[]>(['LUN', 'MIE', 'VIE']);
  const [startTime, setStartTime] = useState('07:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [capacity, setCapacity] = useState(20);
  const [color, setColor] = useState('#ea580c');
  const [description, setDescription] = useState('');

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/gym/classes');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.classes) {
          setClasses(data.classes);
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openCreateModal = () => {
    setEditingClass(null);
    setName('');
    setCoach('');
    setCategory('Cardio');
    setRoom('Sala Ciclo Indoor');
    setSelectedDays(['LUN', 'MIE', 'VIE']);
    setStartTime('07:00');
    setDurationMinutes(45);
    setCapacity(20);
    setColor('#ea580c');
    setDescription('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: GymClassItem) => {
    setEditingClass(c);
    setName(c.name);
    setCoach(c.coach);
    setCategory(c.category || 'General');
    setRoom(c.room || 'Sala Principal');
    setSelectedDays(c.daysOfWeek ? c.daysOfWeek.split(',') : ['LUN', 'MIE', 'VIE']);
    setStartTime(c.startTime || '07:00');
    setDurationMinutes(c.durationMinutes || 45);
    setCapacity(c.capacity || 20);
    setColor(c.color || '#ea580c');
    setDescription(c.description || '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleToggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coach.trim() || !startTime.trim()) {
      setErrorMessage('Nombre, coach y hora de inicio son obligatorios');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const payload = {
      name: name.trim(),
      coach: coach.trim(),
      category,
      room,
      daysOfWeek: selectedDays.join(','),
      startTime,
      durationMinutes: Number(durationMinutes),
      capacity: Number(capacity),
      color,
      description: description.trim()
    };

    try {
      const url = editingClass
        ? `/api/admin/gym/classes/${editingClass.id}`
        : '/api/admin/gym/classes';
      const method = editingClass ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar clase');
      }

      setIsModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, className: string) => {
    if (!confirm(`¿Estás seguro de eliminar la clase "${className}"?`)) return;

    try {
      const res = await fetch(`/api/admin/gym/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchClasses();
      }
    } catch (err) {
      console.error('Error deleting class:', err);
    }
  };

  const handleToggleActive = async (c: GymClassItem) => {
    try {
      const res = await fetch(`/api/admin/gym/classes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active })
      });
      if (res.ok) {
        setClasses(prev => prev.map(item => item.id === c.id ? { ...item, active: !item.active } : item));
      }
    } catch (err) {
      console.error('Error toggling active state:', err);
    }
  };

  // Filtrado
  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.coach.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.room.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDay = selectedDay === 'TODOS' || (c.daysOfWeek && c.daysOfWeek.includes(selectedDay));
    const matchesCategory = selectedCategory === 'TODAS' || c.category === selectedCategory;

    return matchesSearch && matchesDay && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* ── CABECERA ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-500">
            <CalendarDays size={16} />
            Programación Operativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
            Clases Grupales & Horarios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Define disciplinas, asigna entrenadores, salas y controla el aforo por horario
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          Nueva Clase Grupal
        </button>
      </div>

      {/* ── FILTROS Y BÚSQUEDA ────────────────────────────────────────────── */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por clase, coach o sala..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="TODAS">Todas las Categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chips de Días de la Semana */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            onClick={() => setSelectedDay('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors shrink-0 ${
              selectedDay === 'TODOS'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos los Días
          </button>
          {DAYS_LIST.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors shrink-0 ${
                selectedDay === d.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTADO DE CLASES ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold uppercase text-slate-400">Cargando clases...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <CalendarDays size={32} />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
              No hay clases grupales registradas
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Comienza programando las actividades de tu gimnasio para que los socios puedan reservar su cupo desde su móvil.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Crear Primera Clase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map(c => {
            const enrolled = c.enrolledToday || 0;
            const occupancyPct = Math.round((enrolled / c.capacity) * 100);

            return (
              <div
                key={c.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  c.active
                    ? 'border-slate-200 dark:border-slate-800 hover:border-orange-500/40'
                    : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color || '#ea580c' }}
                      ></span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {c.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(c)}
                        title={c.active ? 'Desactivar clase' : 'Activar clase'}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          c.active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {c.active ? 'Activa' : 'Pausada'}
                      </button>

                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Editar clase"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar clase"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {c.name}
                  </h3>

                  {c.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  {/* Detalles operativos */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                      <Clock size={15} className="text-orange-500 shrink-0" />
                      <span>{c.startTime} hrs • {c.durationMinutes} minutos</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                      <User size={15} className="text-orange-500 shrink-0" />
                      <span>Coach: {c.coach}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                      <MapPin size={15} className="text-orange-500 shrink-0" />
                      <span>{c.room}</span>
                    </div>
                  </div>

                  {/* Días en que se imparte */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Días Programados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {DAYS_LIST.map(d => {
                        const isScheduled = c.daysOfWeek && c.daysOfWeek.includes(d.id);
                        return (
                          <span
                            key={d.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isScheduled
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            {d.id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Barra de Aforo de la Sala */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[11px] font-black uppercase text-slate-500 mb-1.5">
                    <span>Aforo Sala: {c.capacity} atletas</span>
                    <span className={occupancyPct >= 90 ? 'text-orange-500' : 'text-emerald-500'}>
                      {enrolled} inscritos ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPct >= 90 ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, occupancyPct)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ──────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                  {editingClass ? 'Editar Clase Grupal' : 'Nueva Clase Grupal'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configura los detalles de la sesión y aforo de la sala
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la Clase *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Spinning Power Ride, CrossFit WOD, Yoga Vinyasa..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Coach / Instructor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Sala / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sala Ciclo, Box 1, Tatami..."
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Aforo Máximo (Cupos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Días de la semana */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Días en que se imparte
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_LIST.map(d => {
                    const isChecked = selectedDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDay(d.id)}
                        className={`py-2 rounded-xl text-center font-black text-xs transition-colors ${
                          isChecked
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {d.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horario y Duración */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Duración (Minutos)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={50}>50 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Descripción / Instrucciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Llevar toalla, calzado adecuado. Nivel principiante a avanzado..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingClass ? 'Actualizar Clase' : 'Crear Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
