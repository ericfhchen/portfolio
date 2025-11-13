import { useEffect, useMemo, useRef, useState } from "react";

import type { WorkSlide } from "@/lib/content";

type SlideImageProps = {
  slide: Extract<WorkSlide, { kind: "image" }>;
  index: number;
  activeIndex: number;
  loaded: boolean;
  onLoaded: () => void;
};

export function SlideImage({ slide, index, activeIndex, loaded, onLoaded }: SlideImageProps) {
  const isActive = activeIndex === index;
  const defaultVariant = useMemo(() => {
    return slide.variants.display ?? slide.variants.large ?? slide.variants.original;
  }, [slide]);

  const [currentVariant, setCurrentVariant] = useState(defaultVariant);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentVariant(defaultVariant);
  }, [defaultVariant]);
  
  // Check if image is already loaded when variant changes
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight !== 0) {
      // Image already loaded from cache
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [currentVariant.src]);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const original = slide.variants.original;
    const large = slide.variants.large;
    const display = slide.variants.display;
    // Use physical screen width only, not multiplied by devicePixelRatio
    // This ensures mobile devices load appropriately-sized images
    const deviceWidth = window.innerWidth;

    // For mobile devices (< 768px), prefer display or large variants over original
    const isMobile = deviceWidth < 768;

    if (isMobile) {
      // On mobile, use display or large variant instead of original
      const mobileVariant = display ?? large ?? original;
      if (currentVariant !== mobileVariant) {
        setCurrentVariant(mobileVariant);
      }
      return () => {
        cancelled = true;
      };
    }

    // Desktop logic: progressively load higher quality based on screen width
    if (original && deviceWidth >= (original.width ?? slide.width)) {
      if (currentVariant !== original) {
        const img = new window.Image();
        img.src = original.src;
        
        // Add timeout to fallback to smaller variant if loading takes too long
        timeoutId = setTimeout(() => {
          if (!cancelled && currentVariant !== original) {
            console.warn(`Image loading timeout for ${original.src}, keeping current variant`);
          }
        }, 10000);
        
        img.onload = () => {
          if (!cancelled) {
            if (timeoutId) clearTimeout(timeoutId);
            setCurrentVariant(original);
          }
        };
        
        img.onerror = () => {
          if (!cancelled) {
            if (timeoutId) clearTimeout(timeoutId);
            console.error(`Failed to load original variant for slide ${slide.id}`);
            // Keep current variant on error
          }
        };
        
        return () => {
          cancelled = true;
          if (timeoutId) clearTimeout(timeoutId);
        };
      }
      return () => {
        cancelled = true;
      };
    }

    if (large && deviceWidth >= (large.width ?? slide.width) && currentVariant !== large) {
      setCurrentVariant(large);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentVariant, isActive, slide]);

  return (
    <div
      className={`${isActive ? "flex" : "hidden"} w-full flex-col items-center`}
      aria-hidden={!isActive}
      style={{ 
        pointerEvents: isActive ? "none" : "none", // Images shouldn't block carousel events
      }}
    >
      <div className="relative flex w-full max-h-[85vh] items-center justify-center overflow-hidden">
        {slide.placeholder ? (
          <div
            aria-hidden="true"
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-100 ${
              isLoaded ? "opacity-0" : activeIndex === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.placeholder.src}
              className="h-auto w-full max-h-[85vh] object-contain"
              style={{
                filter: "blur(12px)",
              }}
            />
          </div>
        ) : null}
        <img
          ref={imgRef}
          src={currentVariant.src}
          alt={slide.alt}
          width={currentVariant.width}
          height={currentVariant.height}
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isActive ? "high" : "auto"}
          onLoad={() => {
            setIsLoaded(true);
            if (!loaded) {
              onLoaded();
            }
          }}
          className={`relative z-10 h-auto w-full max-h-[85vh] object-contain transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

