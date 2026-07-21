'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Trophy, Calendar, Target, Gift, Tag, RefreshCw,
    Award, Star, Zap, Crown, Shield, Loader2, AlertCircle,
    ChevronRight, Clock, Users
} from 'lucide-react';
import InheritanceBadge, { BadgeMode } from '@/components/admin/club/InheritanceBadge';
import InheritanceToggle from '@/components/admin/club/InheritanceToggle';
import { Pencil, X } from 'lucide-react';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface ResolvedResource {
    source: 'GLOBAL' | 'LOCAL';
    mode: BadgeMode;
    resourceId: string;
    data: Record<string, any>;
}

interface ClubData {
    season: ResolvedResource | null;
    levels: ResolvedResource[];
    missions: ResolvedResource[];
    rewards: ResolvedResource[];
    coupons: ResolvedResource[];
}

type TabKey = 'temporada' | 'niveles' | 'misiones' | 'premios' | 'cupones';

const TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    { key: 'misiones', label: 'Misiones', Icon: Target },
    { key: 'premios', label: 'Premios', Icon: Gift },
    { key: 'cupones', label: 'Cupones', Icon: Tag },
    { key: 'temporada', label: 'Temporada', Icon: Calendar },
    { key: 'niveles', label: 'Niveles', Icon: Trophy },
];

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ClubPage() {
    const [tab, setTab] = useState<TabKey>('misiones');
    const [data, setData] = useState<ClubData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Edit states
    const [editingResource, setEditingResource] = useState<{
        resourceType: string;
        resourceId: string;
        data: any;
    } | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/club');
            if (!res.ok) throw new Error('Error al cargar el Club');
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    function handleModeChange(
        collection: keyof ClubData,
        resourceId: string,
        newMode: BadgeMode
    ) {
        setData(prev => {
            if (!prev) return prev;
            const field = prev[collection];
            if (Array.isArray(field)) {
                return {
                    ...prev,
                    [collection]: (field as ResolvedResource[]).map(r =>
                        r.resourceId === resourceId ? { ...r, mode: newMode, source: newMode === 'INHERITED' ? 'GLOBAL' : 'LOCAL' } : r
                    ),
                };
            }
            if (field && (field as ResolvedResource).resourceId === resourceId) {
                return { ...prev, [collection]: { ...field, mode: newMode, source: newMode === 'INHERITED' ? 'GLOBAL' : 'LOCAL' } };
            }
            return prev;
        });
    }

    const openEditModal = (resourceType: string, resourceId: string, resourceData: any) => {
        setEditingResource({ resourceType, resourceId, data: resourceData });
        // Preparar datos para el formulario según el recurso
        const config = resourceData.config || {};
        if (resourceType === 'GLOBAL_SEASON') {
            setEditFormData({
                duracionMeses: resourceData.duracionMeses ?? config.duracionMeses ?? 3,
                descuentoDiamantes: resourceData.descuentoDiamantes ?? config.descuentoDiamantes ?? 0
            });
        } else if (resourceType === 'GLOBAL_LEVEL') {
            setEditFormData({
                nombre: resourceData.nombre ?? resourceData.titulo ?? '',
                diamantesRequeridos: resourceData.diamantesRequeridos ?? 0,
                color: resourceData.color ?? '#4f46e5',
                multiplicador: resourceData.multiplicador ?? 1.0
            });
        } else if (resourceType === 'REWARD') {
            setEditFormData({
                nombre: resourceData.nombre ?? '',
                descripcion: resourceData.descripcion ?? '',
                costoPuntos: resourceData.costoPuntos ?? 0
            });
        } else if (resourceType === 'COUPON_TEMPLATE') {
            setEditFormData({
                nombre: resourceData.nombre ?? '',
                descripcion: resourceData.descripcion ?? '',
                tipo: config.tipo ?? resourceData.tipo ?? 'PORCENTAJE',
                valor: config.valor ?? resourceData.descuento ?? 0
            });
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResource) return;
        try {
            setSaving(true);
            const res = await fetch('/api/admin/club/customize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resourceType: editingResource.resourceType,
                    resourceId: editingResource.resourceId,
                    customData: editFormData
                })
            });
            if (res.ok) {
                setEditingResource(null);
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error al guardar cambios: ${err.error || 'Inténtalo de nuevo'}`);
            }
        } catch (err) {
            console.error('Error saving customization:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* Header */}
            <div style={{ padding: '32px 32px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
                        }}>
                            <Crown size={24} color="white" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>
                                Club Citiox
                            </h1>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                Gestiona los recursos globales de tu programa de fidelización
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.10)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
                        }}
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Actualizar
                    </button>
                </div>

                {/* Banner informativo */}
                <div style={{
                    marginTop: '20px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.20)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                    <Shield size={18} color="#6366f1" />
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                        Los recursos marcados como <strong style={{ color: '#10b981' }}>Oficial Citiox</strong> se actualizan
                        automáticamente cuando Citiox hace cambios. Puedes{' '}
                        <strong style={{ color: '#f59e0b' }}>personalizar</strong> cualquier recurso o{' '}
                        <strong style={{ color: '#6b7280' }}>desactivarlo</strong> para tu negocio.
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {TABS.map(t => {
                        const { Icon } = t;
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 18px',
                                    borderRadius: '10px 10px 0 0',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                    background: isActive ? 'rgba(99,102,241,0.10)' : 'transparent',
                                    color: isActive ? '#a5b4fc' : '#64748b',
                                    fontSize: '13px', fontWeight: isActive ? 600 : 400,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}
                            >
                                <Icon size={15} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenido */}
            <div style={{ padding: '24px 32px 40px' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>Cargando Club Citiox…</p>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '20px', borderRadius: '12px',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
                        display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171',
                    }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: '14px' }}>{error}</span>
                    </div>
                )}

                 {!loading && !error && data && (
                    <>
                        {tab === 'temporada' && (
                            <SeasonTab data={data} />
                        )}
                        {tab === 'niveles' && (
                            <LevelsTab data={data} />
                        )}
                        {tab === 'misiones' && <MissionsTab data={data} />}
                        {tab === 'premios' && (
                            <RewardsTab 
                                data={data} 
                                onModeChange={handleModeChange} 
                                onEdit={(r: any) => openEditModal('REWARD', r.resourceId, r.data)} 
                            />
                        )}
                        {tab === 'cupones' && (
                            <CouponsTab 
                                data={data} 
                                onModeChange={handleModeChange} 
                                onEdit={(r: any) => openEditModal('COUPON_TEMPLATE', r.resourceId, r.data)} 
                            />
                        )}
                    </>
                )}

                {/* MODAL DE EDICIÓN */}
                {editingResource && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        padding: '16px'
                    }}>
                        <form onSubmit={handleSaveEdit} style={{
                            width: '100%', maxWidth: '480px',
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
                                    Editar Recurso Personalizado
                                </h3>
                                <button type="button" onClick={() => setEditingResource(null)} style={{
                                    border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer'
                                }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {editingResource.resourceType === 'GLOBAL_SEASON' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Duración de la Temporada (Meses)</label>
                                            <input 
                                                type="number"
                                                value={editFormData.duracionMeses || 3}
                                                onChange={e => setEditFormData({ ...editFormData, duracionMeses: parseInt(e.target.value) })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Descuento en Diamantes (%)</label>
                                            <input 
                                                type="number"
                                                value={editFormData.descuentoDiamantes || 0}
                                                onChange={e => setEditFormData({ ...editFormData, descuentoDiamantes: parseInt(e.target.value) })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {editingResource.resourceType === 'GLOBAL_LEVEL' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Nombre del Nivel</label>
                                            <input 
                                                type="text"
                                                value={editFormData.nombre || ''}
                                                onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Diamantes Requeridos</label>
                                            <input 
                                                type="number"
                                                value={editFormData.diamantesRequeridos || 0}
                                                onChange={e => setEditFormData({ ...editFormData, diamantesRequeridos: parseInt(e.target.value) })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Color Identificador (Hex)</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input 
                                                    type="color"
                                                    value={editFormData.color || '#4f46e5'}
                                                    onChange={e => setEditFormData({ ...editFormData, color: e.target.value })}
                                                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                />
                                                <input 
                                                    type="text"
                                                    value={editFormData.color || ''}
                                                    onChange={e => setEditFormData({ ...editFormData, color: e.target.value })}
                                                    style={{
                                                        flex: 1, padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                        border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Multiplicador de Diamantes</label>
                                            <input 
                                                type="number"
                                                step="0.1"
                                                value={editFormData.multiplicador || 1.0}
                                                onChange={e => setEditFormData({ ...editFormData, multiplicador: parseFloat(e.target.value) })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {editingResource.resourceType === 'REWARD' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Nombre del Premio</label>
                                            <input 
                                                type="text"
                                                value={editFormData.nombre || ''}
                                                onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Descripción del Beneficio</label>
                                            <textarea 
                                                value={editFormData.descripcion || ''}
                                                onChange={e => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px',
                                                    height: '80px', resize: 'none'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Costo en Puntos</label>
                                            <input 
                                                type="number"
                                                value={editFormData.costoPuntos || 0}
                                                onChange={e => setEditFormData({ ...editFormData, costoPuntos: parseInt(e.target.value) })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {editingResource.resourceType === 'COUPON_TEMPLATE' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Nombre del Cupón</label>
                                            <input 
                                                type="text"
                                                value={editFormData.nombre || ''}
                                                onChange={e => setEditFormData({ ...editFormData, nombre: e.target.value })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                }}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Descripción del Beneficio</label>
                                            <textarea 
                                                value={editFormData.descripcion || ''}
                                                onChange={e => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px',
                                                    height: '80px', resize: 'none'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Tipo Descuento</label>
                                                <select
                                                    value={editFormData.tipo || 'PORCENTAJE'}
                                                    onChange={e => setEditFormData({ ...editFormData, tipo: e.target.value })}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                        border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                    }}
                                                >
                                                    <option value="PORCENTAJE">Porcentaje (%)</option>
                                                    <option value="FIJO">Fijo ($)</option>
                                                </select>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', uppercase: 'true' } as any}>Monto / Valor</label>
                                                <input 
                                                    type="number"
                                                    value={editFormData.valor || 0}
                                                    onChange={e => setEditFormData({ ...editFormData, valor: parseFloat(e.target.value) })}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: '10px', background: '#0f172a',
                                                        border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', gap: '10px', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
                            }}>
                                <button type="button" onClick={() => setEditingResource(null)} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer'
                                }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── TAB: TEMPORADA ───────────────────────────────────────────────────────────

function SeasonTab({ data }: { data: ClubData }) {
    const season = data.season;

    if (!season) {
        return (
            <EmptyState
                Icon={Calendar}
                title="No hay temporada activa"
                description="El equipo de Citiox no ha activado ninguna temporada global todavía."
            />
        );
    }

    const d = season.data;

    return (
        <div style={{ maxWidth: '640px' }}>
            <div
                style={{
                    borderRadius: '14px',
                    border: '1px solid rgba(99,102,241,0.20)',
                    background: 'linear-gradient(135deg, rgba(30,27,75,0.4) 0%, rgba(15,23,42,0.6) 100%)',
                    padding: '24px 28px',
                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'rgba(99,102,241,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Calendar size={20} color="#818cf8" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '16px' }}>
                            {d.nombre ?? d.codigo ?? 'Temporada de Bienestar'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#818cf8', marginTop: '2px', fontWeight: 600 }}>
                            🟢 Temporada Oficial de Citiox (Activa)
                        </div>
                    </div>
                </div>
                
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                    {d.descripcion || 'Esta temporada competitiva corre a nivel nacional. Los clientes acumulan XP por sus reservas y compiten en el Club de Fidelización.'}
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {d.fechaInicio && (
                        <InfoPill Icon={Clock} label="Fecha de Inicio" value={formatDate(d.fechaInicio)} />
                    )}
                    {d.fechaFin && (
                        <InfoPill Icon={Clock} label="Fecha de Término" value={formatDate(d.fechaFin)} />
                    )}
                    {d.duracionMeses && (
                        <InfoPill Icon={Calendar} label="Duración" value={`${d.duracionMeses} meses`} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── TAB: NIVELES ─────────────────────────────────────────────────────────────

function LevelsTab({ data }: { data: ClubData }) {
    if (data.levels.length === 0) {
        return (
            <EmptyState
                Icon={Trophy}
                title="No hay niveles configurados"
                description="El equipo de Citiox no ha configurado niveles globales todavía."
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' }}>
            {data.levels.map((level, idx) => {
                const d = level.data;
                const color = d.color ?? d.Presentation?.color ?? '#6366f1';

                return (
                    <div
                        key={level.resourceId}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '11px',
                                    background: `${color}20`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Crown size={18} color={color} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>
                                        {d.titulo ?? d.nombre ?? `Nivel ${idx + 1}`}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        Nivel Oficial de Citiox
                                    </div>
                                </div>
                            </div>
                            <InheritanceBadge mode="INHERITED" />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {d.xpRequerida !== undefined && (
                                <InfoPill Icon={Star} label="XP requerida" value={`${d.xpRequerida.toLocaleString()} XP`} />
                            )}
                            {d.diamantesRequeridos !== undefined && (
                                <InfoPill Icon={Star} label="Diamantes" value={`${d.diamantesRequeridos.toLocaleString()}`} />
                            )}
                            {d.orden !== undefined && (
                                <InfoPill Icon={ChevronRight} label="Orden" value={`#${d.orden}`} />
                            )}
                            {d.multiplicador !== undefined && (
                                <InfoPill Icon={Zap} label="Multiplicador Puntos" value={`${d.multiplicador}x`} />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── TAB: MISIONES ────────────────────────────────────────────────────────────

function MissionsTab({ data }: { data: ClubData }) {
    if (data.missions.length === 0) {
        return (
            <EmptyState
                Icon={Target}
                title="No hay misiones activas"
                description="Ve al panel de Misiones para configurar las misiones de tu negocio."
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' }}>
            {data.missions.map(m => {
                const d = m.data;
                return (
                    <div
                        key={m.resourceId}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '16px 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px',
                                background: 'rgba(99,102,241,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Target size={18} color="#818cf8" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>
                                    {d.nombre}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    {d.descripcion}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <InheritanceBadge mode="INHERITED" />
                            <span style={{ fontSize: '12px', color: d.status === 'ACTIVE' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                                {d.status === 'ACTIVE' ? 'Activa' : d.status}
                            </span>
                        </div>
                    </div>
                );
            })}
            <p style={{ fontSize: '12px', color: '#475569', marginTop: '8px' }}>
                * Las misiones se gestionan desde el panel de <a href="/admin/misiones" style={{ color: '#818cf8' }}>Misiones</a>.
            </p>
        </div>
    );
}

// ─── TAB: PREMIOS ─────────────────────────────────────────────────────────────

function RewardsTab({ data, onModeChange, onEdit }: { data: ClubData; onModeChange: Function; onEdit: Function }) {
    if (data.rewards.length === 0) {
        return (
            <EmptyState
                Icon={Gift}
                title="No hay premios configurados"
                description="El catálogo de Citiox no tiene premios activos todavía."
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' }}>
            {data.rewards.map(reward => {
                const d = reward.data;
                return (
                    <ResourceCard
                        key={reward.resourceId}
                        title={d.nombre}
                        subtitle={d.descripcion ?? d.tipo ?? ''}
                        mode={reward.mode}
                        resourceType="REWARD"
                        resourceId={reward.resourceId}
                        onModeChange={(m: BadgeMode) => onModeChange('rewards', reward.resourceId, m)}
                        onEdit={() => onEdit(reward)}
                        Icon={Gift}
                        iconColor="#f59e0b"
                    >
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {d.tipo && <InfoPill Icon={Tag} label="Tipo" value={d.tipo} />}
                            {d.diamantesRequeridos !== undefined && (
                                <InfoPill Icon={Star} label="Diamantes" value={`${d.diamantesRequeridos.toLocaleString()}`} />
                            )}
                        </div>
                    </ResourceCard>
                );
            })}
        </div>
    );
}

// ─── TAB: CUPONES ─────────────────────────────────────────────────────────────

function CouponsTab({ data, onModeChange, onEdit }: { data: ClubData; onModeChange: Function; onEdit: Function }) {
    if (data.coupons.length === 0) {
        return (
            <EmptyState
                Icon={Tag}
                title="No hay cupones configurados"
                description="El catálogo de cupones de Citiox está vacío. Crea cupones locales desde el panel de Beneficios."
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' }}>
            {data.coupons.map(coupon => {
                const d = coupon.data;
                const config = d.config ?? {};
                return (
                    <ResourceCard
                        key={coupon.resourceId}
                        title={d.nombre}
                        subtitle={d.descripcion ?? ''}
                        mode={coupon.mode}
                        resourceType="COUPON_TEMPLATE"
                        resourceId={coupon.resourceId}
                        onModeChange={(m: BadgeMode) => onModeChange('coupons', coupon.resourceId, m)}
                        onEdit={() => onEdit(coupon)}
                        Icon={Tag}
                        iconColor="#10b981"
                    >
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {(config.tipo ?? d.tipo) && <InfoPill Icon={Tag} label="Tipo" value={config.tipo ?? d.tipo} />}
                            {(config.valor ?? d.descuento) !== undefined && (
                                <InfoPill
                                    Icon={Star}
                                    label="Descuento"
                                    value={`${config.valor ?? d.descuento}${config.tipo === 'PORCENTAJE' ? '%' : ''}`}
                                />
                            )}
                        </div>
                    </ResourceCard>
                );
            })}
        </div>
    );
}

// ─── COMPONENTES DE UI REUTILIZABLES ─────────────────────────────────────────

function ResourceCard({
    title, subtitle, mode, resourceType, resourceId, onModeChange, onEdit, Icon, iconColor, children
}: {
    title: string;
    subtitle: string;
    mode: BadgeMode;
    resourceType: string;
    resourceId: string;
    onModeChange: (m: BadgeMode) => void;
    onEdit?: () => void;
    Icon: React.ElementType;
    iconColor: string;
    children?: React.ReactNode;
}) {
    const isDisabled = mode === 'DISABLED';

    return (
        <div
            style={{
                borderRadius: '14px',
                border: `1px solid ${isDisabled ? 'rgba(107,114,128,0.15)' : 'rgba(255,255,255,0.08)'}`,
                background: isDisabled ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.03)',
                padding: '16px 20px',
                opacity: isDisabled ? 0.6 : 1,
                transition: 'all 0.2s',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                        background: `${iconColor}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={18} color={iconColor} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {mode === 'CUSTOMIZED' && onEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(245,158,11,0.3)',
                                background: 'rgba(245,158,11,0.1)',
                                color: '#f59e0b',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            <Pencil size={12} />
                            Editar
                        </button>
                    )}
                    <InheritanceBadge mode={mode} />
                    <InheritanceToggle
                        mode={mode}
                        resourceType={resourceType}
                        resourceId={resourceId}
                        onModeChange={onModeChange}
                    />
                </div>
            </div>
            {children}
        </div>
    );
}

function InfoPill({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <Icon size={11} color="#64748b" />
            <span style={{ fontSize: '11px', color: '#64748b' }}>{label}:</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{value}</span>
        </div>
    );
}

function EmptyState({ Icon, title, description }: { Icon: React.ElementType; title: string; description: string }) {
    return (
        <div style={{
            textAlign: 'center', padding: '60px 20px',
            borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
        }}>
            <Icon size={40} color="#334155" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#475569' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
                {description}
            </p>
        </div>
    );
}
