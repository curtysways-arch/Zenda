'use client';

import { useState, useEffect, useRef } from 'react';

interface CountdownResult {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isNegative: boolean; // true = la hora ya pasó (el cliente llega tarde)
}

export function useCountdown(targetDate: Date | null): CountdownResult {
    const getValues = (): CountdownResult => {
        if (!targetDate) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isNegative: false };

        const diff = targetDate.getTime() - Date.now();
        const isNegative = diff < 0;
        const abs = Math.abs(diff);
        const totalSeconds = Math.floor(abs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return { hours, minutes, seconds, totalSeconds, isNegative };
    };

    const [value, setValue] = useState<CountdownResult>(getValues);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!targetDate) return;
        setValue(getValues());
        intervalRef.current = setInterval(() => setValue(getValues()), 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [targetDate?.getTime()]);

    return value;
}
