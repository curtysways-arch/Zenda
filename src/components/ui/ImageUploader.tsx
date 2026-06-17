'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Check, Loader2, AlertCircle } from 'lucide-react';

interface MediaResult {
  id: string;
  url: string;
  mediumUrl: string;
  thumbUrl: string;
}

interface ImageUploaderProps {
  /** Categoría de la imagen: logo, banner, service, staff, promotion, page */
  category: string;
  /** URL inicial (para mostrar imagen existente) */
  currentUrl?: string;
  /** Callback cuando la imagen se sube con éxito */
  onUploadSuccess?: (media: MediaResult) => void;
  /** Callback cuando se elimina la imagen */
  onRemove?: () => void;
  /** Texto descriptivo que se muestra en el uploader */
  label?: string;
  /** Relación de aspecto del preview: "square" | "landscape" | "auto" */
  aspect?: 'square' | 'landscape' | 'auto';
  /** Desactivar el uploader */
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export default function ImageUploader({
  category,
  currentUrl,
  onUploadSuccess,
  onRemove,
  label = 'Subir imagen',
  aspect = 'square',
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  // Sincronizar cuando currentUrl cambia (datos cargan asincrónicamente)
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(false);

      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Formato no permitido. Usa JPG, PNG o WEBP.');
        return;
      }

      // Validar tamaño
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`El archivo supera el límite de ${MAX_SIZE_MB}MB.`);
        return;
      }

      // Preview local inmediato
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload real al servidor
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al subir la imagen');
        }

        const media: MediaResult = await res.json();
        setPreviewUrl(media.url);
        setSuccess(true);
        onUploadSuccess?.(media);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || 'Error al subir la imagen');
        setPreviewUrl(currentUrl || null);
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [category, currentUrl, onUploadSuccess]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    onRemove?.();
  };

  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === 'landscape'
      ? 'aspect-video'
      : '';

  return (
    <div className="image-uploader-container">
      <div
        className={`image-uploader-dropzone ${aspectClass} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${isUploading ? 'uploading' : ''}`}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Preview de la imagen */}
        {previewUrl ? (
          <div className="image-uploader-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="image-uploader-img"
            />
            {/* Overlay con acciones */}
            {!isUploading && !disabled && (
              <div className="image-uploader-overlay">
                <div className="image-uploader-overlay-actions">
                  <button
                    type="button"
                    className="image-uploader-btn-change"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    <Upload size={14} />
                    Cambiar
                  </button>
                  <button
                    type="button"
                    className="image-uploader-btn-remove"
                    onClick={handleRemove}
                  >
                    <X size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Estado vacío */
          <div className="image-uploader-empty">
            <div className="image-uploader-icon-wrap">
              <ImageIcon size={28} className="image-uploader-icon" />
            </div>
            <p className="image-uploader-label">{label}</p>
            <p className="image-uploader-hint">
              JPG, PNG, WEBP · Máx. {MAX_SIZE_MB}MB
            </p>
            <p className="image-uploader-drag-hint">
              Arrastra o haz clic para seleccionar
            </p>
          </div>
        )}

        {/* Loader */}
        {isUploading && (
          <div className="image-uploader-loading">
            <Loader2 size={28} className="image-uploader-spinner" />
            <p>Procesando imagen…</p>
          </div>
        )}

        {/* Badge de éxito */}
        {success && !isUploading && (
          <div className="image-uploader-success-badge">
            <Check size={14} />
            Guardada
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="image-uploader-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="image-uploader-input-hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      <style jsx>{`
        .image-uploader-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .image-uploader-dropzone {
          position: relative;
          border: 2px dashed #e2e8f0;
          border-radius: 16px;
          background: #f8fafc;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s ease;
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-uploader-dropzone:not(.disabled):not(.uploading):hover {
          border-color: var(--primary-color, #1dc95c);
          background: rgba(29, 201, 92, 0.04);
        }

        .image-uploader-dropzone.dragging {
          border-color: var(--primary-color, #1dc95c);
          background: rgba(29, 201, 92, 0.08);
          transform: scale(1.01);
        }

        .image-uploader-dropzone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .image-uploader-dropzone.uploading {
          cursor: wait;
        }

        .image-uploader-preview {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .image-uploader-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .image-uploader-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .image-uploader-preview:hover .image-uploader-overlay {
          opacity: 1;
        }

        .image-uploader-overlay-actions {
          display: flex;
          gap: 8px;
        }

        .image-uploader-btn-change,
        .image-uploader-btn-remove {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 13px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .image-uploader-btn-change {
          background: var(--primary-color, #1dc95c);
          color: #000;
        }

        .image-uploader-btn-change:hover {
          filter: brightness(1.1);
          transform: scale(1.04);
        }

        .image-uploader-btn-remove {
          background: rgba(255, 80, 80, 0.9);
          color: #fff;
        }

        .image-uploader-btn-remove:hover {
          background: #ff3333;
          transform: scale(1.04);
        }

        .image-uploader-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 24px;
          text-align: center;
          color: #94a3b8;
        }

        .image-uploader-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .image-uploader-icon {
          color: #94a3b8;
        }

        .image-uploader-label {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          margin: 0;
        }

        .image-uploader-hint {
          font-size: 11px;
          color: #94a3b8;
          margin: 0;
        }

        .image-uploader-drag-hint {
          font-size: 11px;
          color: #cbd5e1;
          margin: 0;
        }

        .image-uploader-loading {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          font-weight: 600;
          z-index: 10;
        }

        .image-uploader-spinner {
          animation: spin 1s linear infinite;
          color: var(--primary-color, #1dc95c);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .image-uploader-success-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--primary-color, #1dc95c);
          color: #000;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
          animation: fadeInDown 0.25s ease;
          z-index: 10;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .image-uploader-error {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ff6b6b;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          background: rgba(255, 80, 80, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 80, 80, 0.2);
        }

        .image-uploader-input-hidden {
          display: none;
        }
      `}</style>
    </div>
  );
}
