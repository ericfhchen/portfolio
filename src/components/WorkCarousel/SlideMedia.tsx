import { useEffect, useRef, useState } from "react";
import type { WorkSlide } from "@/lib/content";

type SlideMediaProps = {
  slide: Extract<WorkSlide, { kind: "media" }>;
  isActive: boolean;
};

export function SlideMedia({ slide, isActive }: SlideMediaProps) {
  const hasAttachment = Boolean(slide.attachmentUrl);
  const hasEmbed = Boolean(slide.embedHtml?.trim());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [maxHeight, setMaxHeight] = useState("75vh");

  useEffect(() => {
    const updateMaxHeight = () => {
      if (typeof window !== "undefined") {
        setMaxHeight(window.innerWidth >= 768 ? "85vh" : "75vh");
      }
    };

    updateMaxHeight();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateMaxHeight);
      return () => window.removeEventListener("resize", updateMaxHeight);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Suppress play promise rejection (e.g. autoplay restrictions)
        });
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <div className={`${isActive ? "flex" : "hidden"} w-full flex-col items-center justify-center`} aria-hidden={!isActive}>
      {hasAttachment ? (
        <video
          ref={videoRef}
          className="rounded-none bg-transparent object-contain"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={slide.title}
          style={{
            // Ensure videos fit within viewport bounds, accounting for Safari UI (address bar, tab bar)
            width: "100%",
            maxWidth: "100vw",
            height: "auto",
            maxHeight: maxHeight,
          }}
        >
          <source src={slide.attachmentUrl} type={slide.attachmentContentType ?? "video/mp4"} />
          Your browser does not support the video tag.
        </video>
      ) : hasEmbed ? (
        <div
          className="aspect-video w-full max-w-4xl [&_a]:no-underline [&_a:hover]:opacity-70 [&_a]:transition-opacity"
          dangerouslySetInnerHTML={{ __html: slide.embedHtml ?? "" }}
          aria-label={slide.title}
        />
      ) : (
        <div className="flex aspect-video w-full max-w-4xl items-center justify-center">
          Media unavailable.
        </div>
      )}
    </div>
  );
}

