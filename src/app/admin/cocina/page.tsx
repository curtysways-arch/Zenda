"use client";

import React, { useEffect, useState } from 'react';
import KitchenDashboard from '@/components/restaurant/KitchenDashboard';

export default function AdminCocinaPage() {
  const [slug, setSlug] = useState<string>('demo');

  useEffect(() => {
    fetch('/api/admin/current-business')
      .then(res => res.json())
      .then(data => {
        if (data.negocio?.slug) setSlug(data.negocio.slug);
      })
      .catch(() => {});
  }, []);

  return <KitchenDashboard negocioIdOrSlug={slug} slug={slug} />;
}
