'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface ImageZoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: { url: string; label?: string }[];
    initialIndex?: number;
    title?: string;
}

export default function ImageZoomModal({
    isOpen,
    onClose,
    images = [],
    initialIndex = 0,
    title = ''
}: ImageZoomModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoomScale, setZoomScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setZoomScale(1);
            setPanOffset({ x: 0, y: 0 });
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialIndex]);

    const handleResetZoom = useCallback(() => {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    const handleNextImage = useCallback(() => {
        if (images.length <= 1) return;
        handleResetZoom();
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length, handleResetZoom]);

    const handlePrevImage = useCallback(() => {
        if (images.length <= 1) return;
        handleResetZoom();
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length, handleResetZoom]);

    const handleZoomIn = () => {
        setZoomScale(prev => Math.min(prev + 0.5, 3.5));
    };

    const handleZoomOut = () => {
        setZoomScale(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setPanOffset({ x: 0, y: 0 });
            return next;
        });
    };

    // Keyboard Shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') handleNextImage();
            else if (e.key === 'ArrowLeft') handlePrevImage();
            else if (e.key === '+' || e.key === '=') handleZoomIn();
            else if (e.key === '-') handleZoomOut();
            else if (e.key === '0') handleResetZoom();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleNextImage, handlePrevImage, handleResetZoom]);

    // Double Tap / Double Click Toggle Zoom
    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (zoomScale > 1) {
                handleResetZoom();
            } else {
                setZoomScale(2);
            }
        }
        lastTapRef.current = now;
    };

    // Mouse / Touch Dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomScale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || zoomScale <= 1) return;
        setPanOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        handleDoubleTap();
        if (e.touches.length === 1 && zoomScale > 1) {
            setIsDragging(true);
            const touch = e.touches[0];
            setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || zoomScale <= 1 || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPanOffset({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    if (!isOpen || images.length === 0) return null;

    const currentItem = images[currentIndex] || { url: '' };

    return (
        <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200">
            {/* Top Toolbar */}
            <div className="relative z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <div className="flex items-center gap-3 text-white">
                    <button
                        onClick={onClose}
                        className="size-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all border border-white/10"
                        title="Cerrar (Esc)"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex flex-col">
                        {title && <span className="text-xs font-black uppercase tracking-wider text-white/90 truncate max-w-[200px] xs:max-w-[300px]">{title}</span>}
                        <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                            {currentItem.label ? currentItem.label : `${currentIndex + 1} / ${images.length}`}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <button
                        onClick={handleZoomOut}
                        disabled={zoomScale <= 1}
                        className="p-1.5 text-white hover:text-white/80 disabled:opacity-30 disabled:hover:text-white transition-opacity"
                        title="Alejar (-)"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-[10px] font-black text-white px-2 tracking-widest w-12 text-center">
                        {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        disabled={zoomScale >= 3.5}
                        className="p-1.5 text-white hover:text-white/80 disabled:opacity-30 disabled:hover:text-white transition-opacity"
                        title="Acercar (+)"
                    >
                        <ZoomIn size={16} />
                    </button>
                    {zoomScale > 1 && (
                        <button
                            onClick={handleResetZoom}
                            className="p-1.5 text-rose-400 hover:text-rose-300 ml-1 border-l border-white/20 pl-2 transition-colors"
                            title="Restablecer (0)"
                        >
                            <RotateCcw size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Central Media Viewer */}
            <div
                ref={containerRef}
                className="relative flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleTap}
            >
                {/* Image Container with Zoom & Pan */}
                <div
                    className="relative flex items-center justify-center transition-transform duration-100 ease-out max-w-full max-h-full"
                    style={{
                        transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <img
                        src={currentItem.url}
                        alt={currentItem.label || 'Imagen'}
                        className="max-w-[92vw] max-h-[78vh] object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
                    />
                </div>

                {/* Left Arrow */}
                {images.length > 1 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevImage();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl active:scale-95 transition-all z-40"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Right Arrow */}
                {images.length > 1 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNextImage();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl active:scale-95 transition-all z-40"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="relative z-50 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white/70 text-[11px] font-semibold tracking-wide">
                <span className="truncate max-w-[70%]">
                    {currentItem.label && images.length > 1 ? `${currentItem.label} • ` : ''}
                    Doble clic o pellizcar para hacer zoom
                </span>
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                    {currentIndex + 1} de {images.length}
                </span>
            </div>
        </div>
    );
}
