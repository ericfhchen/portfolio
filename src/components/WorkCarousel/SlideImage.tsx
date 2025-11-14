import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [isUpgrading, setIsUpgrading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentVariant(defaultVariant);
  }, [defaultVariant]);
  
  // Check if image is already loaded when variant changes
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight !== 0) {
      // Image already loaded from cache
      setIsLoaded(true);
    } else if (!isUpgrading) {
      // Only reset if not upgrading - keep image visible during upgrade
      setIsLoaded(false);
    }
  }, [currentVariant.src, isUpgrading]);

  // Function to determine the best variant for current viewport
  // Uses viewport width thresholds instead of variant widths since Arena may not provide different widths for each variant
  const getBestVariant = useCallback((deviceWidth: number) => {
    const original = slide.variants.original;
    const large = slide.variants.large;
    const display = slide.variants.display;

    // Mobile: use smaller variants
    if (deviceWidth < 768) {
      return display ?? large ?? original;
    }

    // Large desktop: use original quality
    if (deviceWidth >= 1920 && original) {
      return original;
    }

    // Desktop: use large variant
    if (deviceWidth >= 1024 && large) {
      return large;
    }

    // Small desktop/tablet: use display
    return display ?? large ?? original;
  }, [slide.variants]);

  // Check if ANY variant is an SVG - check both flag and fallback to URL/contentType check
  const isSvgSlide = useMemo(() => {
    // First check the flags
    const hasSvgFlag = (
      slide.variants.original?.isSvg === true ||
      slide.variants.large?.isSvg === true ||
      slide.variants.display?.isSvg === true ||
      slide.variants.thumb?.isSvg === true
    );
    
    if (hasSvgFlag) return true;
    
    // Fallback: check contentType and URL directly
    const original = slide.variants.original;
    if (original) {
      const contentTypeSvg = original.contentType === "image/svg+xml" ||
                             original.contentType?.startsWith("image/svg");
      const urlSvg = original.src.toLowerCase().includes('svg');
      return contentTypeSvg || urlSvg;
    }
    
    return false;
  }, [slide.variants]);

  // Add effect to check content-type from API response
  useEffect(() => {
    if (!isActive || isSvgSlide) return;
    
    // Check if the current variant is actually an SVG by fetching headers
    const checkContentType = async () => {
      try {
        const response = await fetch(currentVariant.src, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        if (contentType === "image/svg+xml" || contentType?.startsWith("image/svg")) {
          // Force original variant for SVG
          if (currentVariant.src !== slide.variants.original.src) {
            setCurrentVariant(slide.variants.original);
          }
        }
      } catch (error) {
        // Silently fail
      }
    };
    
    checkContentType();
  }, [isActive, currentVariant.src, slide.variants.original.src, isSvgSlide]);

  // Detect if current variant is an SVG - check both flag and fallback
  const isSvg = useMemo(() => {
    if (currentVariant.isSvg === true) return true;
    
    // Fallback checks
    if (currentVariant.contentType === "image/svg+xml") return true;
    if (currentVariant.src.toLowerCase().includes('svg') || 
        currentVariant.src.toLowerCase().endsWith('.svg')) return true;
    
    // If this is an SVG slide, always treat current variant as SVG
    if (isSvgSlide) return true;
    
    return false;
  }, [currentVariant, isSvgSlide]);

  useEffect(() => {
    if (!isActive) return;
    
    // For SVGs, always use original and skip variant switching
    if (isSvgSlide) {
      // Force original variant for SVG slides
      if (currentVariant.src !== slide.variants.original.src) {
        setCurrentVariant(slide.variants.original);
      }
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const deviceWidth = window.innerWidth;
    const bestVariant = getBestVariant(deviceWidth);

    // Compare by src, not by reference
    if (currentVariant.src !== bestVariant.src) {
      const original = slide.variants.original;
      
      // If upgrading to original, preload it first
      if (bestVariant.src === original.src) {
        const img = new window.Image();
        img.src = original.src;
        
        // Add timeout to fallback to smaller variant if loading takes too long
        timeoutId = setTimeout(() => {
          // Timeout reached, keeping current variant
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
      } else {
        // For other variants, switch immediately
        setCurrentVariant(bestVariant);
      }
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentVariant, isActive, slide, getBestVariant, isSvgSlide]);

  // Listen for window resize and upgrade variants when appropriate
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      // Shorter debounce to feel more responsive
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const deviceWidth = window.innerWidth;
        const bestVariant = getBestVariant(deviceWidth);
        
        // Only upgrade to higher resolution variants, never downgrade
        // This prevents unnecessary downloads when shrinking the window
        // Compare by src, not by reference
        if (bestVariant.src !== currentVariant.src) {
          // Establish priority: original > large > display
          const getVariantPriority = (src: string): number => {
            if (src.includes('variant=original')) return 3;
            if (src.includes('variant=large')) return 2;
            if (src.includes('variant=display')) return 1;
            return 0;
          };
          
          const currentPriority = getVariantPriority(currentVariant.src);
          const bestPriority = getVariantPriority(bestVariant.src);
          
          // Only switch if the new variant is higher priority (higher resolution)
          if (bestPriority > currentPriority) {
            // Apply blur immediately
            setIsUpgrading(true);
            
            // Preload the higher res image into browser cache
            const img = new window.Image();
            img.src = bestVariant.src;
            
            img.onload = () => {
              // Image is now cached, safe to swap src
              // Keep blur on during swap to hide any flicker
              setCurrentVariant(bestVariant);
            };
            
            img.onerror = () => {
              console.error(`Failed to load variant for slide ${slide.id}: ${bestVariant.src}`);
              setIsUpgrading(false);
            };
          }
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentVariant, slide, getBestVariant]);

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
              alt=""
              width={slide.placeholder.width}
              height={slide.placeholder.height}
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
            // When new variant loads, wait for paint then remove blur
            if (isUpgrading) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    setIsUpgrading(false);
                  }, 100);
                });
              });
            }
            if (!loaded) {
              onLoaded();
            }
          }}
          style={{
            filter: isUpgrading ? "blur(12px)" : "none",
            transition: "filter 300ms ease-in-out",
          }}
          className={`relative z-10 h-auto w-full max-h-[85vh] object-contain ${
            isLoaded || isUpgrading ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

