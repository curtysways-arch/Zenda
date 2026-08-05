/**
 * Algoritmo Ray-Casting para determinar si un punto (lat, lng)
 * está dentro de un polígono de coordenadas [[lat, lng], [lat, lng], ...]
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>
): boolean {
  if (!polygon || polygon.length < 3) return true; // Si no hay polígono definido, asumir cobertura global

  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Generar un polígono predeterminado tipo octágono alrededor de una coordenada central
 */
export function generateDefaultCoveragePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 5
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const numPoints = 8;

  // Aproximación: 1 grado latitud ~ 111km, 1 grado longitud ~ 111km * cos(lat)
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos((centerLat * Math.PI) / 180.0));

  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const lat = centerLat + latDelta * Math.sin(angle);
    const lng = centerLng + lngDelta * Math.cos(angle);
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  return points;
}
