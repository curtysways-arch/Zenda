import { getImageUrl } from './utils';

// Elegant curated spa and beauty Unsplash placeholder
const SERVICE_PLACEHOLDER = 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=600';

/**
 * Obtiene la imagen de portada principal de un servicio de forma centralizada y optimizada.
 * 
 * @param service Objeto del servicio
 * @param size Tamaño deseado: 'thumb' | 'medium' | 'original'
 * @returns URL de la imagen principal o placeholder elegante
 */
export function getServicePrimaryImage(
  service: any,
  size: 'thumb' | 'medium' | 'original' = 'original'
): string {
  if (!service) return SERVICE_PLACEHOLDER;

  // 1. Priorizar nuevo sistema de Media (imageMedia)
  if (service.imageMedia) {
    return getImageUrl(service.imageMedia, size);
  }

  // 2. Fallback a imagenes de la galería (legacy)
  if (service.imagenes && service.imagenes.length > 0) {
    // Si hay un orden definido y el primer elemento según orden existe
    const order = service.extraInfo?.galleryOrder;
    if (Array.isArray(order) && order.length > 0) {
      const firstImageId = order[0];
      const found = service.imagenes.find((img: any) => img.id === firstImageId);
      if (found) {
        return getImageUrl(found.url, size);
      }
    }
    // Si no, usar la primera imagen del array por defecto
    return getImageUrl(service.imagenes[0].url, size);
  }

  // 3. Fallback a placeholder premium
  return SERVICE_PLACEHOLDER;
}

/**
 * Obtiene todas las imágenes de la galería de un servicio ordenadas.
 * 
 * @param service Objeto del servicio
 * @param size Tamaño deseado para las imágenes
 * @returns Array de URLs de las imágenes
 */
export function getServiceGalleryImages(
  service: any,
  size: 'thumb' | 'medium' | 'original' = 'original'
): string[] {
  if (!service) return [];

  const rawImages = service.imagenes || [];
  if (rawImages.length === 0) {
    // Si no hay galería pero sí hay portada principal
    if (service.imageMedia) {
      return [getImageUrl(service.imageMedia, size)];
    }
    return [];
  }

  // Ordenar imágenes de acuerdo con extraInfo.galleryOrder si existe
  const order = service.extraInfo?.galleryOrder;
  let orderedImages = [...rawImages];
  
  if (Array.isArray(order) && order.length > 0) {
    orderedImages.sort((a: any, b: any) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      
      // Si ambos están en el orden, comparar índices
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // Si solo A está en el orden, va primero
      if (idxA !== -1) return -1;
      // Si solo B está en el orden, va primero
      if (idxB !== -1) return 1;
      // Si ninguno, mantener orden original
      return 0;
    });
  }

  // Mapear a URLs usando getImageUrl
  const imageUrls = orderedImages.map((img: any) => getImageUrl(img.url, size));
  
  // Agregar la portada principal al inicio si no está ya en la galería
  if (service.imageMedia) {
    const mainUrl = getImageUrl(service.imageMedia, size);
    if (!imageUrls.includes(mainUrl)) {
      imageUrls.unshift(mainUrl);
    }
  }

  return imageUrls;
}
