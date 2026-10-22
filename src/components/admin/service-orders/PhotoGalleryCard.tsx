'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, Video, Play, Image as ImageIcon, Plus, Lock, Trash2, Eye, 
  Share2, MessageCircle, CheckCircle2, AlertCircle, Loader2, 
  X, ChevronLeft, ChevronRight, Download, Sparkles, ShieldCheck,
  Copy, Check
} from 'lucide-react';

interface PhotoGalleryCardProps {
  orderId?: string;
  numeroPedido?: number | string;
  clienteNombre?: string;
  clienteTelefono?: string;
  storeSlug?: string;
  isPlanFree?: boolean;
  fotos: {
    recepcion?: string[];
    proceso?: string[];
    entrega?: string[];
  };
  onChangeFotos: (fotos: { recepcion: string[]; proceso: string[]; entrega: string[] }) => void;
}

export function PhotoGalleryCard({
  orderId,
  numeroPedido,
  clienteNombre,
  clienteTelefono,
  storeSlug = 'lavado',
  isPlanFree = false,
  fotos,
  onChangeFotos,
}: PhotoGalleryCardProps) {
  const [tab, setTab] = useState<'recepcion' | 'proceso' | 'entrega'>('recepcion');
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const list = fotos[tab] || [];

  const isVideoMedia = (url?: string) => {
    if (!url) return false;
    return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/video/') || url.includes('type=video');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Convertir URL a absoluta para compartir
  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://citiox.com';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Copiar imagen o enlace de video al portapapeles para WhatsApp (Ctrl + V)
  const handleCopyImageToClipboard = async (url: string) => {
    try {
      const fullUrl = getAbsoluteUrl(url);
      setCopiedUrl(url);

      if (isVideoMedia(url)) {
        await navigator.clipboard.writeText(fullUrl);
        showToast('✓ Enlace del video copiado al portapapeles.');
        setTimeout(() => setCopiedUrl(null), 3000);
        return;
      }

      // Usar un elemento Image y Canvas para exportar como PNG compatible con ClipboardItem
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = fullUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar la imagen para copiar'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Error al preparar canvas');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('No se pudo convertir la imagen al portapapeles.', 'error');
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('✓ ¡Foto copiada! Ve a WhatsApp y presiona Ctrl + V para enviarla adjunta.');
        } catch (clipErr) {
          // Si el navegador bloquea escritura binaria directa, copiar el link
          await navigator.clipboard.writeText(fullUrl);
          showToast('✓ Enlace de la foto copiado al portapapeles.');
        }
      }, 'image/png');

      setTimeout(() => setCopiedUrl(null), 3000);
    } catch (err: any) {
      console.error(err);
      // Fallback: copiar la URL al portapapeles
      try {
        await navigator.clipboard.writeText(getAbsoluteUrl(url));
        showToast('✓ Enlace directo de la foto copiado al portapapeles.');
      } catch {
        showToast('No se pudo copiar la foto.', 'error');
      }
      setTimeout(() => setCopiedUrl(null), 3000);
    }
  };

  // Subir archivo al backend
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let currentFotosState = {
        recepcion: [...(fotos.recepcion || [])],
        proceso: [...(fotos.proceso || [])],
        entrega: [...(fotos.entrega || [])],
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
        const maxMb = isVideo ? 60 : 20;

        if (file.size > maxMb * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} supera el límite permitido (${maxMb}MB)`);
        }
        
        if (orderId) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('stage', tab);

          const res = await fetch(`/api/shoe-care/orders/${orderId}/photos`, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Error subiendo archivo');
          }

          const data = await res.json();
          if (data.fotos) {
            currentFotosState = data.fotos;
            onChangeFotos(data.fotos);
          }
        } else {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'order-inspection');

          const res = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Error al subir archivo');
          const data = await res.json();
          
          currentFotosState[tab].push(data.url);
          onChangeFotos(currentFotosState);
        }
      }

      showToast(`✓ ${files.length > 1 ? `${files.length} archivos subidos` : 'Archivo guardado'} exitosamente.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al procesar el archivo', 'error');
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Eliminar foto
  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('¿Deseas eliminar esta fotografía de auditoría?')) return;

    setDeletingUrl(photoUrl);
    try {
      if (orderId) {
        const res = await fetch(`/api/shoe-care/orders/${orderId}/photos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl, stage: tab }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al eliminar foto');
        }

        const data = await res.json();
        if (data.fotos) {
          onChangeFotos(data.fotos);
        }
      } else {
        const updated = {
          ...fotos,
          [tab]: (fotos[tab] || []).filter(u => u !== photoUrl),
        };
        onChangeFotos(updated as any);
      }
      showToast('Fotografía eliminada.');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error eliminando foto', 'error');
    } finally {
      setDeletingUrl(null);
    }
  };

  // Generar link y mensaje de WhatsApp (con foto adjunta o enlace de foto directo)
  const handleShareWhatsApp = (specificPhotoUrl?: string) => {
    if (isPlanFree) {
      alert('La comunicación por WhatsApp está reservada para el Plan Pro.');
      return;
    }
    const isEntrega = tab === 'entrega';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://citiox.com';
    const trackingUrl = orderId ? `${baseUrl}/${storeSlug}/pedidos/${orderId}` : '';
    
    // Foto a destacar
    const targetPhoto = specificPhotoUrl || list[0] || '';
    const fullPhotoUrl = targetPhoto ? getAbsoluteUrl(targetPhoto) : '';

    let text = '';
    if (isEntrega) {
      text = `¡Hola ${clienteNombre || 'Cliente'}! ✨ Te informamos que tu pedido #${numeroPedido || ''} en ${storeSlug.toUpperCase()} ya está LISTO y con un acabado impecable. 🧼👟`;
      if (fullPhotoUrl) {
        text += `\n\n📸 Foto del resultado final:\n${fullPhotoUrl}`;
      }
      text += `\n\n🔍 Ver reporte completo e interactivo:\n${trackingUrl}\n\n¡Gracias por tu confianza!`;
    } else {
      text = `¡Hola ${clienteNombre || 'Cliente'}! 📋 Confirmamos la recepción e ingreso de tus prendas/calzados para tu pedido #${numeroPedido || ''}.`;
      if (fullPhotoUrl) {
        text += `\n\n📸 Foto de inspección inicial (Antes):\n${fullPhotoUrl}`;
      }
      text += `\n\n🔍 Ver reporte de auditoría y seguimiento en vivo:\n${trackingUrl}\n\nTe mantendremos al tanto del progreso.`;
    }

    if (clienteTelefono) {
      const cleanPhone = clienteTelefono.replace(/\D/g, '');
      const waNumber = cleanPhone.startsWith('593') ? cleanPhone : `593${cleanPhone.replace(/^0/, '')}`;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    } else {
      navigator.clipboard.writeText(text);
      alert('Mensaje copiado al portapapeles. Pégalo en WhatsApp para enviarlo al cliente.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
      {/* Inputs ocultos para Cámara, Video y Archivos */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleUploadFiles(e.target.files)}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={e => handleUploadFiles(e.target.files)}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => handleUploadFiles(e.target.files)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-600" /> 
            Auditoría Multimedia (Fotos & Videos)
          </h3>
          <p className="text-xs text-slate-500">
            Respaldo de ingreso, video de inspección y evidencia de entrega final.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Blindaje & Transparencia
          </span>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all shadow-sm ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            {feedback.message}
          </span>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selector de Etapa (Tabs) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-bold">
        {[
          { key: 'recepcion', label: '1. Recepción (Antes)', count: (fotos.recepcion || []).length, icon: '📸' },
          { key: 'proceso', label: '2. Proceso', count: (fotos.proceso || []).length, icon: '⚙️' },
          { key: 'entrega', label: '3. Entrega (Después)', count: (fotos.entrega || []).length, icon: '✨' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
 tab === t.key 
 ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold' 
 : 'text-slate-500 hover:text-slate-800'
 }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
 t.count > 0 
 ? (tab === t.key ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700')
 : 'opacity-40'
 }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Banner de Ayuda por Etapa */}
      <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 text-xs text-slate-600 flex items-start gap-2.5">
        {tab === 'recepcion' && (
          <>
            <span className="text-base leading-none">🔍</span>
            <div>
              <strong className="text-slate-900 font-bold">Etapa de Recepción (Antes):</strong> Captura fotos o graba un video de manchas, raspaduras, suelas o roturas al momento de recibir el calzado o prenda. Esto blinda al negocio ante cualquier reclamo.
            </div>
          </>
        )}
        {tab === 'proceso' && (
          <>
            <span className="text-base leading-none">🧼</span>
            <div>
              <strong className="text-slate-900 font-bold">Etapa de Proceso:</strong> Fotografías o videos intermedios de limpieza profunda, desmanchado, pegado o costura de taller.
            </div>
          </>
        )}
        {tab === 'entrega' && (
          <>
            <span className="text-base leading-none">✨</span>
            <div>
              <strong className="text-slate-900 font-bold">Etapa de Entrega (Resultado Final):</strong> Fotos y videos de alta calidad de los calzados o prendas limpias, perfumadas y empaquetadas para generar el efecto WOW al cliente.
            </div>
          </>
        )}
      </div>

      {/* Botones de Captura Rápida y Acciones */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 min-w-[130px] py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Tomar Foto
            </>
          )}
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
          className="flex-1 min-w-[130px] py-2.5 px-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Video className="w-4 h-4" /> Grabar Video
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => galleryInputRef.current?.click()}
          className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-slate-500" /> Subir Archivo
        </button>

        {list.length > 0 && (
          isPlanFree ? (
            <div
              className="py-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed shadow-inner"
              title="Compartir por WhatsApp disponible en Plan Pro"
            >
              <Lock className="w-4 h-4 text-slate-400" /> WhatsApp (Plan Pro)
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleShareWhatsApp()}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              title="Compartir enlace de fotos por WhatsApp con el cliente"
            >
              <MessageCircle className="w-4 h-4" /> Compartir por WhatsApp
            </button>
          )
        )}
      </div>

      {/* Grid de Imágenes y Videos Reales con Acciones de Adjuntar/Copiar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {list.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">
              No hay fotografías o videos en <span className="capitalize">{tab}</span>
            </p>
            <p className="text-xs text-slate-400">
              Usa los botones para tomar foto o grabar video del estado de las prendas.
            </p>
          </div>
        ) : (
          list.map((url, idx) => {
            const isVid = isVideoMedia(url);
            return (
              <div 
                key={url + idx} 
                className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group shadow-sm hover:shadow-md transition-all"
              >
                {/* Elemento visual real (Foto o Video) */}
                {isVid ? (
                  <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg backdrop-blur-sm">
                        <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Foto ${tab} #${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}

                {/* Tag con número e icono de tipo */}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg pointer-events-none flex items-center gap-1">
                  {isVid ? <Video className="w-3 h-3 text-purple-300" /> : null}
                  #{idx + 1}
                </span>

                {/* Botones flotantes al pasar el cursor o presionar */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  {/* Parte superior: botón copiar foto para WhatsApp */}
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyImageToClipboard(url);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow text-xs font-bold flex items-center gap-1 active:scale-95"
                      title={isVid ? 'Copiar enlace del video para WhatsApp' : 'Copiar imagen para pegar con Ctrl+V en WhatsApp'}
                    >
                      {copiedUrl === url ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{copiedUrl === url ? '¡Copiado!' : isVid ? 'Copiar Link' : 'Copiar Foto'}</span>
                    </button>
                  </div>

                  {/* Parte inferior: Ver grande, Compartir y Eliminar */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      title="Ver en pantalla completa"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(url)}
                      className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingUrl === url}
                      onClick={() => handleDeletePhoto(url)}
                      className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                      title="Eliminar archivo"
                    >
                      {deletingUrl === url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Lightbox para visualización HD */}
      {lightboxIndex !== null && list[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase bg-white/20 px-2.5 py-1 rounded-md">
                {tab.toUpperCase()} • {isVideoMedia(list[lightboxIndex]) ? 'VIDEO' : 'FOTO'} {lightboxIndex + 1} DE {list.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyImageToClipboard(list[lightboxIndex])}
                className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Copiar para WhatsApp"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar para WhatsApp
              </button>
              <a
                href={list[lightboxIndex]}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                title="Abrir / Descargar original"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                title="Cerrar visor"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
            {isVideoMedia(list[lightboxIndex]) ? (
              <video
                src={list[lightboxIndex]}
                controls
                autoPlay
                className="max-w-full max-h-[78vh] rounded-xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={list[lightboxIndex]}
                alt={`Foto ampliada ${lightboxIndex + 1}`}
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
              />
            )}

            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors"
                title="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {lightboxIndex < list.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors"
                title="Foto siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
