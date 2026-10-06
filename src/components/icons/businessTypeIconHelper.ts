import { LucideIcon, Scissors, Sparkles, Stethoscope, Dumbbell, Trophy } from 'lucide-react';
import { ToothIcon } from './ToothIcon';

export function getBusinessTypeServiceIcon({
    tipoNegocio = '',
    slug = '',
    nombre = ''
}: {
    tipoNegocio?: string;
    slug?: string;
    nombre?: string;
}): LucideIcon {
    const t = (tipoNegocio || '').toUpperCase();
    const s = (slug || '').toLowerCase();
    const n = (nombre || '').toLowerCase();

    // 1. DENTISTA / ODONTOLOGÍA
    if (
        t === 'ODONTOLOGIA' ||
        t === 'DENTISTA' ||
        t === 'CLINICA_DENTAL' ||
        t === 'DENTAL' ||
        s.includes('dental') ||
        s.includes('dentar') ||
        s.includes('odontolog') ||
        n.includes('dental') ||
        n.includes('odontol') ||
        n.includes('dentista') ||
        n.includes('diente')
    ) {
        return ToothIcon as unknown as LucideIcon;
    }

    // 2. SALUD / CLÍNICA / MEDICINA
    if (
        t === 'SALUD' ||
        t === 'MEDICINA' ||
        t === 'CONSULTORIO' ||
        t === 'CLINICA' ||
        s.includes('clinica') ||
        s.includes('medico') ||
        s.includes('salud')
    ) {
        return Stethoscope;
    }

    // 3. BARBERÍA / PELUQUERÍA / SALÓN DE CORTE
    if (
        t === 'BARBERIA' ||
        t === 'PELUQUERIA' ||
        t === 'BARBER' ||
        s.includes('barber') ||
        s.includes('peluquer') ||
        s.includes('corte') ||
        n.includes('barber') ||
        n.includes('corte')
    ) {
        return Scissors;
    }

    // 4. FITNESS / GIMNASIO
    if (
        t === 'GIMNASIO' ||
        t === 'GYM' ||
        t === 'FITNESS' ||
        s.includes('gym') ||
        s.includes('fitness')
    ) {
        return Dumbbell;
    }

    // 5. DEPORTES / CANCHAS
    if (
        t === 'CANCHA' ||
        t === 'SPORTS_COURTS' ||
        t === 'PADEL' ||
        t === 'FUTBOL'
    ) {
        return Trophy;
    }

    // 6. SPA / ESTÉTICA / BELLEZA
    if (
        t === 'SPA' ||
        t === 'ESTETICA' ||
        t === 'BELLEZA' ||
        s.includes('spa') ||
        s.includes('beauty') ||
        s.includes('estetica')
    ) {
        return Sparkles;
    }

    // Default para servicios
    return Sparkles;
}
