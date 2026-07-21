'use client';

import React from 'react';
import { CheckCircle, Edit3, XCircle } from 'lucide-react';

export type BadgeMode = 'INHERITED' | 'CUSTOMIZED' | 'DISABLED';

interface InheritanceBadgeProps {
    mode: BadgeMode;
    source?: 'GLOBAL' | 'LOCAL';
    className?: string;
}

const BADGE_CONFIG: Record<BadgeMode, {
    label: string;
    color: string;
    bg: string;
    border: string;
    Icon: React.ElementType;
}> = {
    INHERITED: {
        label: 'Oficial Citiox',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.10)',
        border: 'rgba(16,185,129,0.30)',
        Icon: CheckCircle,
    },
    CUSTOMIZED: {
        label: 'Personalizado',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.10)',
        border: 'rgba(245,158,11,0.30)',
        Icon: Edit3,
    },
    DISABLED: {
        label: 'Desactivado',
        color: '#6b7280',
        bg: 'rgba(107,114,128,0.10)',
        border: 'rgba(107,114,128,0.30)',
        Icon: XCircle,
    },
};

export function InheritanceBadge({ mode, className }: InheritanceBadgeProps) {
    const cfg = BADGE_CONFIG[mode];
    const { Icon } = cfg;

    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                color: cfg.color,
                backgroundColor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                letterSpacing: '0.02em',
                lineHeight: 1.6,
                whiteSpace: 'nowrap',
            }}
        >
            <Icon size={11} strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

export default InheritanceBadge;
