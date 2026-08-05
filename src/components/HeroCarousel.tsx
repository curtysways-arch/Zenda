"use client";

import { useState, useEffect } from 'react';

interface HeroCarouselProps {
    images: string[];
    baseClass?: string;
    opacityActive?: string;
    activeIndex?: number;
}

export default function HeroCarousel({
    images,
    baseClass = "absolute inset-0 w-full h-full object-cover",
    opacityActive = "opacity-60",
    activeIndex
}: HeroCarouselProps) {
    const [internalIndex, setInternalIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(0);

    const currentIndex = activeIndex !== undefined ? activeIndex : internalIndex;

    useEffect(() => {
        if (currentIndex !== prevIndex) {
            const timer = setTimeout(() => {
                setPrevIndex(currentIndex);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, prevIndex]);

    useEffect(() => {
        if (activeIndex !== undefined || !images || images.length <= 1) return;
        const interval = setInterval(() => {
            setInternalIndex((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [images, activeIndex]);

    if (!images || images.length === 0) {
        return (
            <img
                src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200"
                alt="Fondo genérico"
                className={`${baseClass} ${opacityActive}`}
            />
        );
    }

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
        <div className="absolute inset-0 w-full h-full overflow-hidden">
            {images.map((img, index) => {
                const isActive = index === currentIndex;
                const isPrevious = index === prevIndex;

                if (!isActive && !isPrevious) return null;

                return (
                    <img
                        key={img + index}
                        src={img}
                        alt={`Fondo ${index + 1}`}
                        className={`${baseClass} ${opacityActive} transition-opacity duration-1000 ease-in-out ${
                            isActive ? 'z-10 opacity-100 scale-105' : 'z-0 opacity-100 scale-100'
                        }`}
                    />
                );
            })}
        </div>
    );
}
