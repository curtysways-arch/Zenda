import { NextRequest, NextResponse } from 'next/server';

interface GeocodeMatch {
  id: string;
  mainText: string;
  secondaryText: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const isReverse = searchParams.get('reverse') === '1' || searchParams.get('reverse') === 'true';
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const lat = latStr ? parseFloat(latStr) : undefined;
    const lng = lngStr ? parseFloat(lngStr) : undefined;

    // Caso 1: Reverse Geocoding (Coordenadas -> Dirección)
    if (isReverse && !isNaN(lat!) && !isNaN(lng!)) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'ZendaDelivery/1.0 (contact: info@citiox.com)',
              'Accept-Language': 'es-ES,es;q=0.9',
            },
            next: { revalidate: 3600 },
          }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          const addr = nomData.address || {};
          const road = addr.road || addr.pedestrian || addr.street || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || '';
          const city = addr.city || addr.town || addr.village || addr.county || '';
          
          let short = [road, suburb, city].filter(Boolean).join(', ');
          if (!short && nomData.display_name) {
            short = nomData.display_name.split(',').slice(0, 3).join(', ').trim();
          }

          return NextResponse.json({
            success: true,
            address: short || nomData.display_name || 'Ubicación seleccionada',
            fullAddress: nomData.display_name || '',
          });
        }
      } catch (err) {
        console.warn('Error en reverse geocoding con Nominatim:', err);
      }

      return NextResponse.json({
        success: true,
        address: `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`,
        fullAddress: '',
      });
    }

    // Caso 2: Búsqueda / Autocompletado por Texto
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results: GeocodeMatch[] = [];

    // Intento 1: Photon API (rápido, diseñado para autocompletado OSM)
    try {
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=es`;
      if (!isNaN(lat!) && !isNaN(lng!)) {
        photonUrl += `&lat=${lat}&lon=${lng}`;
      }

      const pRes = await fetch(photonUrl, {
        headers: { 'Accept-Language': 'es' },
        next: { revalidate: 1800 },
      });

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.features && Array.isArray(pData.features)) {
          pData.features.forEach((f: any, idx: number) => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [];
            const rLng = coords[0];
            const rLat = coords[1];

            if (typeof rLat === 'number' && typeof rLng === 'number') {
              const name = props.name || props.street || q;
              const secondaryParts = [
                props.district,
                props.city || props.town || props.county,
                props.state,
                props.country,
              ].filter(Boolean);

              const secondary = Array.from(new Set(secondaryParts)).join(', ');

              results.push({
                id: `photon-${idx}-${rLat}-${rLng}`,
                mainText: name,
                secondaryText: secondary,
                fullAddress: secondary ? `${name}, ${secondary}` : name,
                lat: rLat,
                lng: rLng,
              });
            }
          });
        }
      }
    } catch (errPhoton) {
      console.warn('Error consultando Photon:', errPhoton);
    }

    // Si Photon devolvió resultados suficientes, retornamos de inmediato
    if (results.length > 0) {
      return NextResponse.json({ success: true, results });
    }

    // Intento 2: Fallback con Nominatim OpenStreetMap
    try {
      let nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
      if (!isNaN(lat!) && !isNaN(lng!)) {
        const delta = 0.45;
        nomUrl += `&viewbox=${lng! - delta},${lat! + delta},${lng! + delta},${lat! - delta}`;
      }

      const nomRes = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'ZendaDelivery/1.0 (contact: info@citiox.com)',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        next: { revalidate: 1800 },
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          nomData.forEach((item: any, idx: number) => {
            const rLat = parseFloat(item.lat);
            const rLng = parseFloat(item.lon);
            if (!isNaN(rLat) && !isNaN(rLng)) {
              const parts = (item.display_name || '').split(',');
              const main = parts[0]?.trim() || q;
              const sec = parts.slice(1, 4).map((p: string) => p.trim()).join(', ');

              results.push({
                id: `nom-${item.place_id || idx}`,
                mainText: main,
                secondaryText: sec,
                fullAddress: item.display_name,
                lat: rLat,
                lng: rLng,
              });
            }
          });
        }
      }
    } catch (errNom) {
      console.warn('Error consultando Nominatim:', errNom);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error general en geocode route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al buscar' }, { status: 500 });
  }
}
