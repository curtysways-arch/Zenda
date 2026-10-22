'use client';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * fetch con manejo de errores uniforme: siempre lanza un Error con un mensaje
 * entendible (el que manda el servidor o uno genérico), nunca falla en silencio.
 */
export async function api<T = any>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...(headers || {}) } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Sin conexión. Revisa tu internet e inténtalo de nuevo.', 0, null);
  }

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.success === false)) {
    const fallback =
      res.status === 401 ? 'Tu sesión terminó. Vuelve a iniciar sesión.'
        : res.status === 403 ? 'No tienes permiso para esta acción.'
          : res.status === 404 ? 'No se encontró lo que buscabas.'
            : 'Algo salió mal. Inténtalo de nuevo.';
    throw new ApiError(data?.error || fallback, res.status, data);
  }
  return data as T;
}

export async function uploadClinicalFile(file: File): Promise<{ url: string; mimeType: string; size: number }> {
  const form = new FormData();
  form.append('file', file);
  return api('/api/admin/dental/upload', { method: 'POST', body: form });
}
