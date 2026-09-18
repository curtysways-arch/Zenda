'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Dumbbell, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Clock, 
  Trophy, 
  ChevronRight,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  suggestedRestSeconds: number;
  notes?: string;
  completedSets: boolean[];
}

interface Routine {
  id: string;
  name: string;
  category: string;
  level: string;
  durationEstimate: string;
  exercises: Exercise[];
}

const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'push',
    name: 'Empuje: Pecho, Hombros y Tríceps',
    category: 'Hipertrofia',
    level: 'Intermedio',
    durationEstimate: '50 - 60 min',
    exercises: [
      {
        id: 'e1',
        name: 'Press de Banca Plano con Barra',
        muscle: 'Pecho Mayor',
        sets: 4,
        reps: '8 - 10 reps',
        suggestedRestSeconds: 90,
        notes: 'Controla el descenso en 2 segundos y empuja con potencia.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e2',
        name: 'Press Inclinado con Mancuernas',
        muscle: 'Pecho Superior',
        sets: 4,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 75,
        notes: 'Banco a 30 grados, apertura controlada.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e3',
        name: 'Press Militar con Mancuernas',
        muscle: 'Hombro Anterior & Lateral',
        sets: 3,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 60,
        notes: 'Espalda bien apoyada, no bloquear codos arriba.',
        completedSets: [false, false, false]
      },
      {
        id: 'e4',
        name: 'Elevaciones Laterales en Polea o Mancuerna',
        muscle: 'Deltoides Lateral',
        sets: 4,
        reps: '12 - 15 reps',
        suggestedRestSeconds: 60,
        notes: 'Ligera inclinación hacia adelante, concéntrate en los codos.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e5',
        name: 'Fondos en Paralelas o Tríceps en Polea',
        muscle: 'Tríceps',
        sets: 3,
        reps: '12 - 15 reps',
        suggestedRestSeconds: 60,
        notes: 'Extensión completa de brazos contrayendo el tríceps.',
        completedSets: [false, false, false]
      }
    ]
  },
  {
    id: 'pull',
    name: 'Tracción: Espalda y Bíceps',
    category: 'Fuerza',
    level: 'Intermedio',
    durationEstimate: '50 - 60 min',
    exercises: [
      {
        id: 'e6',
        name: 'Jalón al Pecho en Polea Alta',
        muscle: 'Dorsal Ancho',
        sets: 4,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 75,
        notes: 'Lleva la barra a la parte superior del pecho juntando las escápulas.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e7',
        name: 'Remo con Barra o Máquina Hammer',
        muscle: 'Espalda Media y Romboides',
        sets: 4,
        reps: '8 - 10 reps',
        suggestedRestSeconds: 90,
        notes: 'Mantén el core firme y no uses impulso con la cadera.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e8',
        name: 'Remo en Polea Baja con Agarre Estrecho',
        muscle: 'Dorsal y Densidad',
        sets: 3,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 60,
        notes: 'Estira bien los dorsales adelante sin doblar la espalda baja.',
        completedSets: [false, false, false]
      },
      {
        id: 'e9',
        name: 'Curl de Bíceps con Barra Z',
        muscle: 'Bíceps Braquial',
        sets: 4,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 60,
        notes: 'Codos pegados al cuerpo, sin balanceo.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e10',
        name: 'Curl Martillo con Mancuernas',
        muscle: 'Braquial y Antebrazo',
        sets: 3,
        reps: '12 reps',
        suggestedRestSeconds: 60,
        notes: 'Control excéntrico para mayor tensión mecánica.',
        completedSets: [false, false, false]
      }
    ]
  },
  {
    id: 'legs',
    name: 'Pierna Completa & Core',
    category: 'Fuerza & Resistencia',
    level: 'Todos los niveles',
    durationEstimate: '55 - 65 min',
    exercises: [
      {
        id: 'e11',
        name: 'Sentadilla en Prensa o Barra Libre',
        muscle: 'Cuádriceps y Glúteos',
        sets: 4,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 90,
        notes: 'Baja a 90 grados controladamente, empuja con los talones.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e12',
        name: 'Extensión de Cuádriceps en Máquina',
        muscle: 'Aislamiento Cuádriceps',
        sets: 4,
        reps: '12 - 15 reps',
        suggestedRestSeconds: 60,
        notes: 'Aguanta 1 segundo la contracción en la cima.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e13',
        name: 'Curl Femoral Tumbado o Sentado',
        muscle: 'Isquiosurales',
        sets: 4,
        reps: '10 - 12 reps',
        suggestedRestSeconds: 60,
        notes: 'No despegues la pelvis del banco al contraer.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e14',
        name: 'Elevación de Talones para Pantorrillas',
        muscle: 'Gemelos',
        sets: 4,
        reps: '15 - 20 reps',
        suggestedRestSeconds: 45,
        notes: 'Rango completo de movimiento estirando bien abajo.',
        completedSets: [false, false, false, false]
      },
      {
        id: 'e15',
        name: 'Plancha Abdominal Isométrica',
        muscle: 'Core / Abdomen',
        sets: 3,
        reps: '45 - 60 seg',
        suggestedRestSeconds: 45,
        notes: 'Glúteos y abdomen apretados en línea recta.',
        completedSets: [false, false, false]
      }
    ]
  }
];

export default function MiEntrenamientoPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [routines, setRoutines] = useState<Routine[]>(DEFAULT_ROUTINES);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('push');
  
  // Temporizador de descanso
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Feedback auditivo si termina
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate([150, 100, 150]);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const activeRoutine = routines.find(r => r.id === selectedRoutineId) || routines[0];

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setRoutines(prev => prev.map(routine => {
      if (routine.id !== activeRoutine.id) return routine;
      return {
        ...routine,
        exercises: routine.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const updatedSets = [...ex.completedSets];
          const willBeDone = !updatedSets[setIndex];
          updatedSets[setIndex] = willBeDone;
          
          // Si marcó como completada la serie, activar temporizador de descanso sugerido
          if (willBeDone) {
            setTimerSeconds(ex.suggestedRestSeconds || 60);
            setIsTimerRunning(true);
          }
          return { ...ex, completedSets: updatedSets };
        })
      };
    }));
  };

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const totalSets = activeRoutine.exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const completedSets = activeRoutine.exercises.reduce((acc, ex) => acc + ex.completedSets.filter(Boolean).length, 0);
  const progressPercent = Math.round((completedSets / totalSets) * 100);

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 pb-32 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}/mi-gym`}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mi Gym</span>
        </Link>

        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          {activeRoutine.durationEstimate}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-emerald-500" />
          Rutinas & Entrenamiento
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Sigue tu entrenamiento del día serie a serie con cronómetro de descanso integrado.
        </p>
      </div>

      {/* Selector de Rutinas */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {routines.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setSelectedRoutineId(r.id);
              setWorkoutFinished(false);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all border ${
              r.id === activeRoutine.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {r.name.split(':')[0]}
          </button>
        ))}
      </div>

      {/* Barra de Progreso de la Rutina */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm">
              {activeRoutine.name}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {activeRoutine.category} • {activeRoutine.level}
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-emerald-500">{progressPercent}%</span>
            <span className="text-[10px] text-slate-400 block font-semibold">
              {completedSets} / {totalSets} series
            </span>
          </div>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Temporizador de Descanso Flotante / Destacado */}
      <div className="rounded-3xl bg-slate-900 text-white p-4 border border-slate-800 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg ${
            timerSeconds > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {timerSeconds > 0 ? `${timerSeconds}s` : '00s'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Descanso entre series
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {isTimerRunning ? 'Cronómetro en curso...' : 'Selecciona un descanso'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => startTimer(45)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
          >
            45s
          </button>
          <button
            onClick={() => startTimer(60)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
          >
            60s
          </button>
          <button
            onClick={() => startTimer(90)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
          >
            90s
          </button>
          {timerSeconds > 0 && (
            <button
              onClick={() => {
                setTimerSeconds(0);
                setIsTimerRunning(false);
              }}
              className="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30"
              title="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Ejercicios */}
      <div className="space-y-4">
        {activeRoutine.exercises.map((exercise, exIndex) => (
          <div
            key={exercise.id}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                  Ejercicio {exIndex + 1} • {exercise.muscle}
                </span>
                <h4 className="font-black text-base text-slate-900 dark:text-white mt-0.5">
                  {exercise.name}
                </h4>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold shrink-0">
                {exercise.reps}
              </span>
            </div>

            {exercise.notes && (
              <p className="text-xs text-slate-400 italic">
                💡 {exercise.notes}
              </p>
            )}

            {/* Checklist de Series */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Series ({exercise.sets})
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {exercise.completedSets.map((done, setIdx) => (
                  <button
                    key={setIdx}
                    onClick={() => toggleSet(exercise.id, setIdx)}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    )}
                    <span>S{setIdx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón Finalizar Rutina */}
      {workoutFinished ? (
        <div className="rounded-3xl bg-emerald-500/10 border-2 border-emerald-500 p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            ¡Entrenamiento Completado!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Gran esfuerzo hoy. Tu constancia es la clave para alcanzar tus objetivos deportivos.
          </p>
          <div className="pt-2">
            <Link
              href={`/${slug}/mi-gym`}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-2"
            >
              <span>Volver a Mi Gym</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <button
            onClick={() => setWorkoutFinished(true)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finalizar Rutina del Día</span>
          </button>
        </div>
      )}
    </div>
  );
}
