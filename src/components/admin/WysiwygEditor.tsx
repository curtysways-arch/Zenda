'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { useMemo, useCallback, useRef, useState } from 'react';

// ReactQuill dinámico para evitar errores de SSR
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    const Wrapped = ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
    return Wrapped;
}, {
    ssr: false,
    loading: () => <div className="min-h-[400px] animate-pulse bg-slate-50" />,
});

interface WysiwygEditorProps {
    value: string;
    onChange: (content: string) => void;
    /** Se llama solo cuando la persona edita (no cuando el editor reformatea el HTML al cargar). */
    onUserEdit?: () => void;
    /** Avisos de error (subida de imágenes). Si no se pasa, se usa alert(). */
    onError?: (message: string) => void;
    placeholder?: string;
}

export default function WysiwygEditor({ value, onChange, onUserEdit, onError, placeholder }: WysiwygEditorProps) {
    const quillRef = useRef<any>(null);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const notify = useCallback((msg: string) => (onError ? onError(msg) : alert(msg)), [onError]);

    // Sube la imagen al servidor y la inserta donde estaba el cursor.
    const imageHandler = useCallback(() => {
        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;
        const range = quill.getSelection(true) || { index: quill.getLength() };

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                notify('La imagen pesa más de 10 MB. Usa una más liviana.');
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            setUploading(true);
            try {
                const res = await fetch('/api/admin/pages/upload', { method: 'POST', body: formData });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo subir la imagen.');
                quill.insertEmbed(range.index, 'image', data.url, 'user');
                quill.setSelection(range.index + 1, 0);
            } catch (error: any) {
                notify(error?.message || 'No se pudo subir la imagen. Intenta de nuevo.');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    }, [notify]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['blockquote', 'link', 'image', 'video'],
                ['clean']
            ],
            handlers: { image: imageHandler }
        },
        clipboard: { matchVisual: false },
    }), [imageHandler]);

    const formats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'color', 'background',
        'align', 'indent',
        'list',
        'link', 'image', 'video'
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Visual o código HTML */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setIsCodeMode(false)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${!isCodeMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Editor visual
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCodeMode(true)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isCodeMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        HTML
                    </button>
                </div>
                <span className="text-xs text-slate-500">
                    {uploading ? 'Subiendo imagen…' : isCodeMode ? 'Edita el código directamente' : 'Usa la barra para dar formato'}
                </span>
            </div>

            {isCodeMode ? (
                <div className="p-3 bg-slate-950">
                    <textarea
                        value={value}
                        onChange={(e) => { onChange(e.target.value); onUserEdit?.(); }}
                        placeholder="Escribe o pega aquí tu código HTML…"
                        spellCheck={false}
                        className="w-full min-h-[400px] p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl border border-slate-800 outline-none focus:border-slate-600 leading-relaxed"
                    />
                </div>
            ) : (
                <ReactQuill
                    forwardedRef={quillRef}
                    theme="snow"
                    value={value}
                    onChange={(html: string, _delta: any, source: string) => {
                        onChange(html);
                        if (source === 'user') onUserEdit?.();
                    }}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder || 'Escribe aquí el contenido de tu página…'}
                />
            )}

            <style jsx global>{`
                .ql-container.ql-snow { border: none !important; font-size: 1rem; color: #1e293b; font-family: inherit; }
                .ql-editor { min-height: 400px; padding: 20px 22px; line-height: 1.7; color: #1e293b; background: #fff; }
                .ql-editor h2 { font-size: 1.5rem; font-weight: 700; margin: 1.2em 0 .4em; color: #0f172a; }
                .ql-editor h3 { font-size: 1.2rem; font-weight: 700; margin: 1em 0 .3em; color: #0f172a; }
                .ql-editor p { margin-bottom: .8em; }
                .ql-editor strong { color: #0f172a; }
                .ql-editor.ql-blank::before { color: #94a3b8 !important; font-style: normal; left: 22px; }
                .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #fff; padding: 8px 12px; position: sticky; top: 0; z-index: 5; }
                .ql-editor img { border-radius: 12px; display: block; max-width: 100%; margin: 1.2rem auto; }
                .ql-editor iframe { width: 100%; aspect-ratio: 16/9; height: auto; border-radius: 12px; }
                .ql-snow .ql-tooltip { z-index: 20; }
                .ql-snow .ql-tooltip.ql-editing[data-mode=link]::before { content: "Enlace:"; }
                .ql-snow .ql-tooltip.ql-editing[data-mode=video]::before { content: "Video de YouTube:"; }
                .ql-snow .ql-tooltip.ql-editing a.ql-action::after { content: "Guardar"; }
                .ql-snow .ql-tooltip a.ql-action::after { content: "Editar"; }
                .ql-snow .ql-tooltip a.ql-remove::before { content: "Quitar"; }
                .ql-snow .ql-tooltip::before { content: "Abrir:"; }
            `}</style>
        </div>
    );
}
