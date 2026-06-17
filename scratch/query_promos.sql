SELECT s.id, s.nombre, p.id as promo_id, p.nombre as promo_nombre, p.precioPromo, p.precioAnterior, p.fechaInicio, p.fechaFin, p.horaInicioValida, p.horaFinValida, p.estado
FROM Service s
JOIN PromotionToService pts ON s.id = pts.serviceId
JOIN Promotion p ON pts.promotionId = p.id
WHERE s.nombre LIKE '%Aromaterapia%' OR s.nombre LIKE '%Descontracturante%';
