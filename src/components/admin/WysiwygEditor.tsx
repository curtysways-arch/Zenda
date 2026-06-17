'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { useMemo, useCallback, useRef } from 'react';

// ReactQuill dinámico para evitar errores de SSR
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
}, { ssr: false });

interface WysiwygEditorProps {
    value: string;
    onChange: (content: string) => void;
}

export default function WysiwygEditor({ value, onChange }: WysiwygEditorProps) {
    const quillRef = useRef<any>(null);

    // El handler de imagen personalizado para subir al servidor
    const imageHandler = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        // Guardar la selección actual antes de abrir el explorador de archivos
        const range = quill.getSelection(true);

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const res = await fetch('/api/admin/pages/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();

                    if (data.url) {
                        // Insertar imagen en el editor usando la URL devuelta por el servidor
                        quill.insertEmbed(range.index, 'image', data.url);
                        // Mover el cursor después de la imagen
                        quill.setSelection(range.index + 1);
                    } else if (data.error) {
                        alert("Error de subida: " + data.error);
                    }
                } catch (error) {
                    console.error("Error uploading image from editor", error);
                    alert("No se pudo subir la imagen. Intenta de nuevo.");
                }
            }
        };
    }, []);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }, { 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
    }), [imageHandler]);

    const formats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'color', 'background',
        'align',
        'list', 'bullet',
        'link', 'image'
    ];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <ReactQuill
                forwardedRef={quillRef}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                className="min-h-[400px]"
            />
            <style jsx global>{`
                /* Forzar el color del texto a oscuro para que sea visible por defecto */
                .ql-container.ql-snow {
                    border: none !important;
                    min-height: 400px;
                    font-size: 0.95rem;
                    color: #1e293b; 
                }
                .ql-editor {
                    min-height: 400px;
                    padding: 24px;
                    line-height: 1.6;
                    color: #1e293b;
                    background-color: #ffffff;
                }
                /* Soporte para alineación de texto */
                .ql-align-center { text-align: center !important; }
                .ql-align-right { text-align: right !important; }
                .ql-align-justify { text-align: justify !important; }
                
                /* Asegurar que las imágenes respeten la alineación */
                .ql-align-center img { margin: 2rem auto !important; }
                .ql-align-right img { margin: 2rem 0 2rem auto !important; }

                /* Asegurar que los títulos también se vean oscuros por defecto */
                .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor strong {
                    color: #0f172a;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8 !important;
                    font-style: normal;
                }
                .ql-toolbar.ql-snow {
                    border: none !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    background: #f8fafc;
                    padding: 12px 16px;
                }
                .ql-editor p { margin-bottom: 1em; color: inherit; }
                .ql-editor img { 
                    border-radius: 1.5rem; 
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); 
                    display: block; 
                    max-width: 100%; 
                    margin: 2rem auto; 
                }
            `}</style>
        </div>
    );
}
