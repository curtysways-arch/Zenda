import React, { useState } from 'react';
import { 
    Wallet, Building2, User, CreditCard, Hash, FileText, 
    UploadCloud, ShieldCheck, Send, Lock, Copy, Check, Loader2, Info, AlertCircle 
} from 'lucide-react';

interface Step5Props {
    order: any;
    bankConfig: any;
    uploading: boolean;
    uploadError: string | null;
    onUploadEvidence: (file: File) => void;
}

export default function Step5PinchoPayment({
    order,
    bankConfig,
    uploading,
    uploadError,
    onUploadEvidence
}: Step5Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    const friendlyCode = order.friendlyCode || `PIN-${(250000 + (order.numeroPedido || 1))}`;

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            alert('Por favor selecciona la imagen o PDF de tu comprobante de pago.');
            return;
        }
        onUploadEvidence(selectedFile);
    };

    return (
        <div className="max-w-xl mx-auto space-y-5">
            {/* Tarjeta 1: Código de Pago y Monto Exacto */}
            <div className="bg-gradient-to-r from-orange-50/90 via-orange-50/50 to-orange-50/90 border border-orange-200/80 rounded-3xl p-5 flex items-center justify-between shadow-2xs">
                <div className="space-y-0.5 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-900/70 block">Código del Pedido</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-black text-orange-700 tracking-wider">
                            {friendlyCode}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(friendlyCode);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="p-1.5 text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Copiar código"
                        >
                            {copiedCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                        </button>
                    </div>
                </div>

                <div className="h-10 w-px bg-orange-200/70 mx-1" />

                <div className="flex items-center gap-3 text-right">
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-900/70 block">Monto a Transferir</span>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">${order.total.toFixed(2)}</span>
                    </div>
                    <div className="size-11 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
                        <Wallet className="size-6" />
                    </div>
                </div>
            </div>

            {/* Tarjeta 2: Datos para la Transferencia */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black shadow-xs shrink-0">
                            <Building2 className="size-5" />
                        </div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Datos para la Transferencia</span>
                    </div>
                    <span className="text-xs font-black text-orange-700 uppercase tracking-wider bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
                        {bankConfig?.banco || 'BANCO PICHINCHA'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-xl flex items-center justify-center shrink-0">
                            <User className="size-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TITULAR</span>
                            <span className="text-xs font-black text-slate-900">{bankConfig?.titular || 'Poleth Caicedo'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-xl flex items-center justify-center shrink-0">
                            <CreditCard className="size-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TIPO CUENTA</span>
                            <span className="text-xs font-black text-slate-900">{bankConfig?.tipoCuenta || 'Ahorros'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-xl flex items-center justify-center shrink-0">
                            <Hash className="size-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">NÚMERO DE CUENTA</span>
                            <span className="text-xs font-mono font-black text-slate-900 select-all">{bankConfig?.numeroCuenta || '2213913435'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="size-4" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">RUC / CÉDULA</span>
                            <span className="text-xs font-mono font-black text-slate-900">{bankConfig?.identificacion || '1792345678001'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta Informativa: Mensaje de Confianza */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-3xl p-5 border border-amber-200/80 text-left space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-black text-amber-950 text-xs uppercase tracking-wider">
                    <Info className="size-4 text-amber-700 shrink-0" />
                    <span>¿Por qué solicitamos el pago antes de preparar tu pedido?</span>
                </div>
                <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
                    Nuestros pinchos son preparados bajo pedido utilizando ingredientes frescos, marinados y empacados al vacío. Para garantizar la calidad del producto y evitar desperdicios, iniciamos la producción únicamente cuando el pago ha sido verificado.
                </p>
            </div>

            {/* Formulario de Carga de Comprobante */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        SUBIR COMPROBANTE DE PAGO (JPG, PNG, PDF) *
                    </label>

                    <div 
                        onClick={() => document.getElementById('pincho-evidence-file-input')?.click()}
                        className="border-2 border-dashed border-orange-300/80 hover:border-orange-500 bg-orange-50/30 hover:bg-orange-50/60 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer"
                    >
                        <div className="size-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                            <UploadCloud className="size-5" />
                        </div>
                        
                        <button
                            type="button"
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                        >
                            Seleccionar archivo
                        </button>

                        <span className="text-xs font-semibold text-slate-500 truncate flex-1">
                            {selectedFile ? selectedFile.name : 'Sin archivo seleccionado'}
                        </span>

                        <input
                            id="pincho-evidence-file-input"
                            type="file"
                            required
                            accept="image/png, image/jpeg, image/webp, application/pdf"
                            onChange={e => {
                                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                            }}
                            className="hidden"
                        />
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3.5 flex items-start gap-3 border border-slate-200/60">
                        <ShieldCheck className="size-5 text-orange-600 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                            <strong className="text-slate-800 block">Tu comprobante es 100% seguro.</strong>
                            Solo se utiliza para validar tu pago e iniciar la producción.
                        </div>
                    </div>
                </div>

                {uploadError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold text-center">
                        {uploadError}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="size-5 animate-spin" />
                            Subiendo comprobante...
                        </>
                    ) : (
                        <>
                            <Send className="size-4" />
                            <span>ENVIAR COMPROBANTE Y FINALIZAR</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
