"use client";

import { useState, useEffect } from 'react';

export default function HeroCarousel({ images, baseClass = "absolute inset-0 w-full h-full object-cover scale-105", opacityActive = "opacity-60" }: { images: string[], baseClass?: string, opacityActive?: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Cambia cada 5 segundos
        return () => clearInterval(interval);
    }, [images]);

    if (!images || images.length === 0) {
        return (
            <img
                src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200"
                alt="Fondo genérico"
                className={`${baseClass} ${opacityActive}`}
            />
        );
    }

    // Single image case - no transition
    if (images.length === 1) {
        return (
            <img
                src={images[0]}
                alt="Fondo"
                className={`${baseClass} ${opacityActive}`}
            />
        );
    }

    return (
        <>
            {images.map((img, index) => (
                <img
                    key={index}
                    src={img}
                    alt={`Fondo ${index + 1}`}
                    className={`${baseClass} transition-[opacity,transform] duration-[2000ms] ease-in-out ${index === currentIndex ? `${opacityActive} z-0` : 'opacity-0 -z-10'
                        }`}
                />
            ))}
        </>
    );
}
