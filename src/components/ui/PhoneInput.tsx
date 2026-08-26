'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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
    id?: string;
    darkMode?: boolean;
}

export default function PhoneInput({
    value,
    onChange,
    placeholder = "099 123 4567",
    className = "",
    label,
    disabled = false,
    required = false,
    id,
    darkMode = false
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
        <div className={clsx("relative space-y-1.5 group/phone w-full text-left", className)}>
            {label && (
                <span className={clsx("text-[9px] font-black uppercase tracking-[0.2em] ml-1 block", darkMode ? "text-white/40" : "text-slate-400")}>
                    {label}
                </span>
            )}
            
            <div className="flex gap-2 relative h-13 w-full">
                {/* Selector de País */}
                <div className="relative shrink-0">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setIsOpen(!isOpen)}
                        className={clsx(
                            "h-full flex items-center gap-2 px-3.5 rounded-2xl border transition-all shadow-sm active:scale-95 cursor-pointer",
                            darkMode 
                                ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                                : "bg-white border-gray-200 text-slate-900 hover:bg-gray-50"
                        )}
                    >
                        <span className="text-xl shrink-0">{selectedCountry.flag}</span>
                        <span className="text-xs font-black shrink-0">{selectedCountry.code}</span>
                        <ChevronDown size={14} className={clsx("transition-transform shrink-0", darkMode ? "text-white/40" : "text-slate-400", isOpen && "rotate-180")} />
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-[#11141d] border border-white/10 rounded-2xl shadow-2xl z-[9999] max-h-72 overflow-y-auto p-1.5 animate-in zoom-in-95 duration-150">
                            {countries.map((c) => (
                                <button
                                    key={c.iso}
                                    type="button"
                                    onClick={() => handleCountrySelect(c)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                                >
                                    <span className="text-xl">{c.flag}</span>
                                    <div className="flex-1">
                                        <p className="font-black text-white text-xs uppercase italic">{c.name}</p>
                                        <p className="text-slate-400 font-black text-[10px]">{c.code}</p>
                                    </div>
                                    {selectedCountry.iso === c.iso && <Check size={14} className="text-emerald-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input de Número */}
                <label className={clsx(
                    "flex-1 min-w-0 flex items-center pr-4 border rounded-2xl transition-all cursor-text overflow-hidden",
                    darkMode
                        ? "bg-white/5 border-white/10 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20"
                        : "bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-emerald-500/30"
                )}>
                    <input
                        id={id}
                        type="tel"
                        disabled={disabled}
                        required={required}
                        value={localNumber}
                        onChange={handleNumberChange}
                        placeholder={placeholder}
                        className={clsx(
                            "block w-full h-full py-3 bg-transparent border-none shadow-none focus:outline-none focus:ring-0 font-black text-sm px-4 rounded-2xl placeholder:font-normal",
                            darkMode 
                                ? "text-white placeholder:text-white/20 caret-emerald-500" 
                                : "text-slate-900 placeholder:text-slate-400 caret-emerald-500"
                        )}
                    />
                </label>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
