'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Pencil, EyeOff, Loader2 } from 'lucide-react';
import { BadgeMode } from './InheritanceBadge';

interface InheritanceToggleProps {
    mode: BadgeMode;
    resourceType: string;
    resourceId: string;
    onModeChange: (newMode: BadgeMode) => void;
    disabled?: boolean;
}

const OPTIONS: { value: BadgeMode; label: string; Icon: React.ElementType; description: string }[] = [
    {
        value: 'INHERITED',
        label: 'Usar configuración Citiox',
        Icon: Globe,
        description: 'Usa la configuración oficial sin modificaciones',
    },
    {
        value: 'CUSTOMIZED',
        label: 'Personalizar',
        Icon: Pencil,
        description: 'Crea tu propia versión del recurso',
    },
    {
        value: 'DISABLED',
        label: 'Desactivar',
        Icon: EyeOff,
        description: 'Ocultar este recurso para tus clientes',
    },
];

const ENDPOINT_MAP: Record<BadgeMode, string> = {
    INHERITED: '/api/admin/club/use-global',
    CUSTOMIZED: '/api/admin/club/customize',
    DISABLED: '/api/admin/club/disable',
};

export function InheritanceToggle({ mode, resourceType, resourceId, onModeChange, disabled }: InheritanceToggleProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    async function handleSelect(newMode: BadgeMode) {
        if (newMode === mode) { setOpen(false); return; }
        setOpen(false);
        setLoading(true);
        try {
            const endpoint = ENDPOINT_MAP[newMode];
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceType, resourceId }),
            });
            if (res.ok) {
                onModeChange(newMode);
            } else {
                const err = await res.json();
                console.error('[InheritanceToggle] Error:', err);
                alert('Error al cambiar la configuración: ' + (err.error ?? 'Inténtalo de nuevo'));
            }
        } catch (e) {
            console.error('[InheritanceToggle] Network error:', e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => !disabled && !loading && setOpen(o => !o)}
                disabled={disabled || loading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                {loading ? (
                    <Loader2 size={13} className="animate-spin" />
                ) : (
                    <>
                        <span>Cambiar</span>
                        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </>
                )}
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        zIndex: 50,
                        minWidth: '220px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: '#1e293b',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        padding: '6px',
                    }}
                >
                    {OPTIONS.map(opt => {
                        const { Icon } = opt;
                        const isActive = mode === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <Icon
                                    size={16}
                                    style={{
                                        marginTop: '1px',
                                        color: isActive ? '#6366f1' : '#64748b',
                                        flexShrink: 0,
                                    }}
                                />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#e2e8f0' : '#94a3b8' }}>
                                        {opt.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        {opt.description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default InheritanceToggle;
