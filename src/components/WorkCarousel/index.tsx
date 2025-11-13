"use client";

import {
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BioContent, WorkSlide } from "@/lib/content";

import { SlideImage } from "./SlideImage";
import { SlideMedia } from "./SlideMedia";

type WorkCarouselProps = {
  slides: WorkSlide[];
  name: string;
  about: BioContent;
};

const SWIPE_THRESHOLD = 40;
const SCROLL_THRESHOLD = 40;
const MOBILE_SCROLL_THRESHOLD = 60; // Higher threshold for mobile (less aggressive)

export function WorkCarousel({ slides, name, about }: WorkCarouselProps) {
  const [index, setIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<Record<number, boolean>>({});
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef(0);
  const scrollDelta = useRef(0);
  const carouselRef = useRef<HTMLElement>(null);
  const total = slides.length;

  const { bioHtml, detailsHtml, clientsHtml, websitesHtml } = about;
  const hasDetailsSection = Boolean(detailsHtml);
  const hasClientsSection = Boolean(clientsHtml);
  const hasWebsitesSection = Boolean(websitesHtml);
  const showAboutGrid = hasDetailsSection || hasClientsSection || hasWebsitesSection;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (!total) return;
      const normalized = (nextIndex + total) % total;
      setIndex(normalized);
    },
    [total],
  );

  const handleNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const handlePrevious = useCallback(() => goTo(index - 1), [goTo, index]);

  // Global keyboard navigation (works without focus)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation when about is closed
      if (isAboutOpen) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(total - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goTo, handleNext, handlePrevious, total, isAboutOpen]);

  // Global wheel/scroll navigation (works anywhere on the page)
  useEffect(() => {
    if (isAboutOpen) return;

    const handleGlobalWheel = (event: Event) => {
      const wheelEvent = event as globalThis.WheelEvent;
      
      // Prevent default page scrolling
      event.preventDefault();

      const { deltaX, deltaY } = wheelEvent;
      const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

      scrollDelta.current += dominantDelta;

      if (scrollDelta.current >= SCROLL_THRESHOLD) {
        handleNext();
        scrollDelta.current = 0;
      } else if (scrollDelta.current <= -SCROLL_THRESHOLD) {
        handlePrevious();
        scrollDelta.current = 0;
      }
    };

    // Add global wheel listener with passive: false to allow preventDefault
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [handleNext, handlePrevious, isAboutOpen]);

  // Global touch navigation (works anywhere on the page)
  useEffect(() => {
    if (isAboutOpen) return;

    const handleGlobalTouchStart = (event: Event) => {
      const touchEvent = event as globalThis.TouchEvent;
      if (touchEvent.touches.length === 1) {
        touchStartX.current = touchEvent.touches[0].clientX;
        touchStartY.current = touchEvent.touches[0].clientY;
        touchDeltaY.current = 0;
      }
    };

    const handleGlobalTouchMove = (event: Event) => {
      if (touchStartY.current === null || touchStartX.current === null) return;
      
      const touchEvent = event as globalThis.TouchEvent;
      if (touchEvent.touches.length !== 1) return;

      const currentY = touchEvent.touches[0].clientY;
      const currentX = touchEvent.touches[0].clientX;
      const deltaY = touchStartY.current - currentY; // Positive = scrolling down
      const deltaX = Math.abs(touchStartX.current - currentX);

      // If horizontal movement is dominant, treat as swipe
      if (deltaX > Math.abs(deltaY) && deltaX > SWIPE_THRESHOLD) {
        return; // Let handleGlobalTouchEnd handle horizontal swipes
      }

      // Vertical scrolling for rapid navigation
      if (Math.abs(deltaY) > 5) {
        // Prevent default to stop page bounce
        event.preventDefault();
        
        touchDeltaY.current += deltaY;
        touchStartY.current = currentY; // Reset for continuous tracking

        // Use mobile-specific threshold for touch events
        if (touchDeltaY.current >= MOBILE_SCROLL_THRESHOLD) {
          handleNext();
          touchDeltaY.current = 0;
        } else if (touchDeltaY.current <= -MOBILE_SCROLL_THRESHOLD) {
          handlePrevious();
          touchDeltaY.current = 0;
        }
      }
    };

    const handleGlobalTouchEnd = (event: Event) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      
      const touchEvent = event as globalThis.TouchEvent;
      if (touchEvent.changedTouches.length === 1) {
        const deltaX = touchEvent.changedTouches[0].clientX - touchStartX.current;
        const deltaY = touchStartY.current - touchEvent.changedTouches[0].clientY;
        
        // Only trigger swipe if horizontal movement is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
          if (deltaX < 0) {
            handleNext();
          } else {
            handlePrevious();
          }
        }
      }
      touchStartX.current = null;
      touchStartY.current = null;
      touchDeltaY.current = 0;
    };

    const handleGlobalTouchCancel = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      touchDeltaY.current = 0;
    };

    // Add global touch listeners with passive: false to allow preventDefault
    window.addEventListener("touchstart", handleGlobalTouchStart, { passive: false });
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd, { passive: false });
    window.addEventListener("touchcancel", handleGlobalTouchCancel, { passive: false });

    return () => {
      window.removeEventListener("touchstart", handleGlobalTouchStart);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchCancel);
    };
  }, [handleNext, handlePrevious, isAboutOpen]);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    pointerStartX.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
    pointerStartX.current = null;
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length === 1) {
      touchStartX.current = event.touches[0].clientX;
      touchStartY.current = event.touches[0].clientY;
      touchDeltaY.current = 0;
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (event.touches.length !== 1) return;

    const currentY = event.touches[0].clientY;
    const currentX = event.touches[0].clientX;
    const deltaY = touchStartY.current - currentY; // Positive = scrolling down
    const deltaX = Math.abs(touchStartX.current - currentX);

    // If horizontal movement is dominant, treat as swipe
    if (deltaX > Math.abs(deltaY) && deltaX > SWIPE_THRESHOLD) {
      return; // Let handleTouchEnd handle horizontal swipes
    }

    // Vertical scrolling for rapid navigation
    if (Math.abs(deltaY) > 5) {
      // Prevent default to stop page bounce
      event.preventDefault();
      
      touchDeltaY.current += deltaY;
      touchStartY.current = currentY; // Reset for continuous tracking

      if (touchDeltaY.current >= SCROLL_THRESHOLD) {
        handleNext();
        touchDeltaY.current = 0;
      } else if (touchDeltaY.current <= -SCROLL_THRESHOLD) {
        handlePrevious();
        touchDeltaY.current = 0;
      }
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (event.changedTouches.length === 1) {
      const deltaX = event.changedTouches[0].clientX - touchStartX.current;
      const deltaY = touchStartY.current - event.changedTouches[0].clientY;
      
      // Only trigger swipe if horizontal movement is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrevious();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      // Always prevent default to stop page scrolling
      event.preventDefault();

      const { deltaX, deltaY } = event;
      const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

      scrollDelta.current += dominantDelta;

      if (scrollDelta.current >= SCROLL_THRESHOLD) {
        handleNext();
        scrollDelta.current = 0;
      } else if (scrollDelta.current <= -SCROLL_THRESHOLD) {
        handlePrevious();
        scrollDelta.current = 0;
      }
    },
    [handleNext, handlePrevious],
  );

  const currentSlide = slides[index];

  const currentLabel = useMemo(() => {
    if (!currentSlide) return "";
    if (currentSlide.kind === "image") return currentSlide.alt;
    return currentSlide.title;
  }, [currentSlide]);

  const currentCaptionHtml = useMemo(() => currentSlide?.captionHtml ?? "", [currentSlide]);

  const PRELOAD_AHEAD = 4;

  const markLoaded = useCallback((id: number) => {
    setLoadedSlides((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const toggleAbout = useCallback(() => {
    setIsAboutOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isAboutOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsAboutOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAboutOpen]);

  useEffect(() => {
    if (!total) return;

    const toPrefetch: Set<string> = new Set();
    const isMobile = window.innerWidth < 768;

    const schedulePrefetch = (slide: WorkSlide | undefined) => {
      if (!slide || slide.kind !== "image") return;

      // On mobile, only prefetch display/large variants, not original
      // This prevents downloading massive images that won't be used
      const variants = isMobile
        ? [slide.variants.display, slide.variants.large, slide.variants.thumb].filter(Boolean)
        : [slide.variants.original, slide.variants.large, slide.variants.display, slide.variants.thumb].filter(Boolean);

      (variants as { src: string }[]).forEach((variant) => {
        if (!toPrefetch.has(variant.src)) {
          const img = new Image();
          img.decoding = "async";
          img.src = variant.src;
          toPrefetch.add(variant.src);
        }
      });

      if (slide.placeholder) {
        const existing = document.querySelector(`link[data-placeholder="${slide.placeholder.src}"]`);
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "preload";
          link.as = "image";
          link.href = slide.placeholder.src;
          link.setAttribute("data-placeholder", slide.placeholder.src);
          document.head.appendChild(link);
        }
      }
    };

    for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
      const nextIndex = (index + offset) % total;
      schedulePrefetch(slides[nextIndex]);
    }

    for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
      const prevIndex = (index - offset + total) % total;
      schedulePrefetch(slides[prevIndex]);
    }
  }, [index, slides, total]);

  if (!total) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className="absolute left-2 right-2 top-2 z-30 flex justify-between pointer-events-none">
        <button
          type="button"
          onClick={toggleAbout}
          className="pointer-events-auto block leading-none text-left transition-opacity duration-300 hover:opacity-70 focus:outline-none"
          aria-expanded={isAboutOpen}
          aria-controls="about-overlay"
          onPointerDown={!isAboutOpen ? handlePointerDown : undefined}
          onPointerUp={!isAboutOpen ? handlePointerUp : undefined}
          onPointerCancel={!isAboutOpen ? handlePointerCancel : undefined}
          onWheel={!isAboutOpen ? handleWheel : undefined}
        >
          {isAboutOpen ? "CLOSE" : name}
        </button>
        <span
          className={`leading-none transition-opacity duration-100 whitespace-nowrap pointer-events-auto ${
            isAboutOpen ? "opacity-0" : "opacity-100"
          }`}
          onPointerDown={!isAboutOpen ? handlePointerDown : undefined}
          onPointerUp={!isAboutOpen ? handlePointerUp : undefined}
          onPointerCancel={!isAboutOpen ? handlePointerCancel : undefined}
          onWheel={!isAboutOpen ? handleWheel : undefined}
          aria-live="polite"
          aria-hidden={isAboutOpen}
        >
          {index + 1} / {total}
        </span>
      </div>

      {/* About Overlay - Hidden by default, appears when toggled */}
      <div
        id="about-overlay"
        aria-hidden={!isAboutOpen}
        className={`absolute left-2 top-2 bottom-2 right-2 z-20 pt-8 pb-8 leading-tight transition-all duration-100 ease-in-out overflow-y-auto hide-scrollbar ${
          isAboutOpen
            ? "pointer-events-auto opacity-100 translate-y-0 w-screen max-w-[99vw]"
            : "pointer-events-none opacity-0 w-auto"
        }`}
      >
        {bioHtml ? (
          <div
            className="[&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity [&_p]:m-0 [&_p]:max-w-prose max-w-full md:max-w-[33.33%] xl:max-w-[16.66%]"
            dangerouslySetInnerHTML={{ __html: bioHtml }}
          />
        ) : null}
        {showAboutGrid ? (
          <div
            className={`grid gap-8 grid-cols-2 max-w-full md:max-w-2/3 xl:max-w-[33.33%] ${bioHtml ? "mt-10" : ""}`}
          >
            {hasDetailsSection ? (
              <section className="space-y-4">
                <div
                  className="space-y-2 [&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: detailsHtml }}
                />
              </section>
            ) : null}
            {(hasClientsSection || hasWebsitesSection) ? (
              <div className="space-y-8">
                {hasClientsSection ? (
                  <section className="space-y-2">
                    <h3 className="">Selected Clients</h3>
                    <div
                      className="space-y-2 [&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity [&_p]:m-0"
                      dangerouslySetInnerHTML={{ __html: clientsHtml }}
                    />
                  </section>
                ) : null}
                {hasWebsitesSection ? (
                  <section className="space-y-2">
                    <h3 className="">Websites</h3>
                    <div
                      className="space-y-2 [&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity [&_p]:m-0"
                      dangerouslySetInnerHTML={{ __html: websitesHtml }}
                    />
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="absolute bottom-2 left-2 opacity-30">
          © {new Date().getFullYear()} Eric L. Chen. All rights reserved.
        </div>
      </div>
      <section
        ref={carouselRef}
        aria-roledescription="carousel"
        aria-label={`${name} work carousel`}
        className={`flex min-h-screen flex-col transition-opacity duration-100 ease-in-out ${
          isAboutOpen ? "pointer-events-none opacity-0" : "opacity-100 pointer-events-auto"
        }`}
        style={{
          touchAction: "none", // Handle all touch events manually for carousel navigation
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onWheel={handleWheel}
      >
        {/* Invisible navigation buttons */}
        <button
          type="button"
          onClick={handlePrevious}
          aria-label="Previous slide"
          className={`absolute left-0 top-0 bottom-0 w-1/2 z-10 bg-transparent border-none focus:outline-none ${
            isAboutOpen ? "pointer-events-none" : "pointer-events-auto cursor-w-resize"
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onWheel={handleWheel}
        />
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next slide"
          className={`absolute right-0 top-0 bottom-0 w-1/2 z-10 bg-transparent border-none focus:outline-none ${
            isAboutOpen ? "pointer-events-none" : "pointer-events-auto cursor-e-resize"
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onWheel={handleWheel}
        />
        <div className="flex flex-1 absolute z-1 top-0 left-0 right-0 bottom-0 items-center justify-center">
          <div className="relative flex w-full max-w-full md:max-w-[90vw] flex-col items-center">
            {slides.map((slide, slideIndex) =>
              slide.kind === "image" ? (
                <SlideImage
                  key={slide.id}
                  slide={slide}
                  index={slideIndex}
                  activeIndex={index}
                  loaded={Boolean(loadedSlides[slide.id])}
                  onLoaded={() => markLoaded(slide.id)}
                />
              ) : (
                <SlideMedia key={slide.id} slide={slide} isActive={slideIndex === index} />
              ),
            )}
          </div>
        </div>
        <div className="sr-only" aria-live="polite">
          {currentLabel}
        </div>
      </section>
      {currentCaptionHtml ? (
        <div
          className={`absolute bottom-0 left-2 right-2 z-20 text-center leading-tight transition-opacity duration-100 pb-2 [@media(max-height:400px)]:hidden [&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity ${
            isAboutOpen ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
          }`}
          onPointerDown={!isAboutOpen ? handlePointerDown : undefined}
          onPointerUp={!isAboutOpen ? handlePointerUp : undefined}
          onPointerCancel={!isAboutOpen ? handlePointerCancel : undefined}
          onWheel={!isAboutOpen ? handleWheel : undefined}
          aria-hidden={isAboutOpen}
          dangerouslySetInnerHTML={{ __html: currentCaptionHtml }}
        />
      ) : null}
    </>
  );
}

