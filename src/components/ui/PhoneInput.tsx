'use client';

import { useState, useEffect } from 'react';
import { Phone, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Country {
    name: string;
    code: string;
    iso: string;
    flag: string;
}

const countries: Country[] = [
    { code: "+593", iso: "EC", flag: "🇪🇨", name: "Ecuador" },
    { code: "+57", iso: "CO", flag: "🇨🇴", name: "Colombia" },
    { code: "+51", iso: "PE", flag: "🇵🇪", name: "Perú" },
    { code: "+52", iso: "MX", flag: "🇲🇽", name: "México" },
    { code: "+502", iso: "GT", flag: "🇬🇹", name: "Guatemala" },
    { code: "+54", iso: "AR", flag: "🇦🇷", name: "Argentina" },
    { code: "+56", iso: "CL", flag: "🇨🇱", name: "Chile" },
    { code: "+1", iso: "US", flag: "🇺🇸", name: "USA" },
    { code: "+58", iso: "VE", flag: "🇻🇪", name: "Venezuela" },
];

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    disabled?: boolean;
    required?: boolean;
}

export default function PhoneInput({
    value,
    onChange,
    placeholder = "WhatsApp",
    className = "",
    label,
    disabled = false,
    required = false
}: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(countries[0]);

    // Calcular el número local para mostrarlo sin el prefijo
    const getLocalNumber = (fullValue: string) => {
        if (!fullValue) return '';
        const found = countries.find(c => fullValue.startsWith(c.code));
        if (found) {
            return fullValue.slice(found.code.length);
        }
        return fullValue;
    };

    const localNumber = getLocalNumber(value);

    // Sincronizar país si el valor cambia externamente
    useEffect(() => {
        if (value) {
            const found = countries.find(c => value.startsWith(c.code));
            if (found && found.code !== selectedCountry.code) {
                setSelectedCountry(found);
            }
        }
    }, [value]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, '');
        
        // Mejora de UX: Si es Ecuador y empieza con 0, quitarlo automáticamente
        if (selectedCountry.iso === 'EC' && raw.startsWith('0')) {
            raw = raw.substring(1);
        }
        
        onChange(`${selectedCountry.code}${raw}`);
    };

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        onChange(`${country.code}${localNumber}`);
    };

    return (
        <div className={clsx("relative space-y-2 group/phone w-full", className)}>
            {label && (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 block">
                    {label}
                </span>
            )}
            
            <div className="flex gap-2 relative h-20 w-full">
                {/* Selector de País */}
                <div className="relative shrink-0">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setIsOpen(!isOpen)}
                        className="h-full flex items-center gap-3 px-4 bg-white border border-gray-200 rounded-3xl text-black hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                        style={{ color: '#000000' }}
                    >
                        <span className="text-2xl shrink-0">{selectedCountry.flag}</span>
                        <span className="text-lg font-black shrink-0">{selectedCountry.code}</span>
                        <ChevronDown size={18} className={clsx("text-slate-400 transition-transform shrink-0", isOpen && "rotate-180")} />
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 mt-3 w-72 bg-white border border-slate-100 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] z-[9999] max-h-80 overflow-y-auto p-2 animate-in zoom-in-95 duration-200">
                            {countries.map((c) => (
                                <button
                                    key={c.iso}
                                    type="button"
                                    onClick={() => handleCountrySelect(c)}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 rounded-2xl transition-all text-left"
                                >
                                    <span className="text-2xl">{c.flag}</span>
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 text-xs uppercase italic">{c.name}</p>
                                        <p className="text-slate-400 font-black text-[10px]">{c.code}</p>
                                    </div>
                                    {selectedCountry.iso === c.iso && <Check size={14} className="text-emerald-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input de Número */}
                <label className="flex-1 min-w-0 group/input flex items-center pr-4 bg-gray-50 border border-gray-100 rounded-3xl focus-within:bg-white focus-within:border-pink-500/20 outline-none transition-all cursor-text overflow-hidden">
                    <input
                        type="tel"
                        disabled={disabled}
                        required={required}
                        value={localNumber}
                        onChange={handleNumberChange}
                        placeholder={placeholder}
                        className="block w-full h-full py-4 bg-transparent border-none shadow-none focus:outline-none focus:ring-0 font-black text-black placeholder-slate-400 caret-pink-500 text-xl px-4 rounded-2xl"
                        style={{ color: '#000000' }}
                    />
                </label>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
