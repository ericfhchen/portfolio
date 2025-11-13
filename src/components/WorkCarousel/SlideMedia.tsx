import { useEffect, useRef } from "react";
import type { WorkSlide } from "@/lib/content";

type SlideMediaProps = {
  slide: Extract<WorkSlide, { kind: "media" }>;
  isActive: boolean;
};

export function SlideMedia({ slide, isActive }: SlideMediaProps) {
  const hasAttachment = Boolean(slide.attachmentUrl);
  const hasEmbed = Boolean(slide.embedHtml?.trim());
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    <div className={`${isActive ? "flex" : "hidden"} w-full flex-col items-center`} aria-hidden={!isActive}>
      {hasAttachment ? (
        <video
          ref={videoRef}
          className="w-full max-h-[85vh] rounded-none bg-transparent"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={slide.title}
        >
          <source src={slide.attachmentUrl} type={slide.attachmentContentType ?? "video/mp4"} />
          Your browser does not support the video tag.
        </video>
      ) : hasEmbed ? (
        <div
          className="aspect-video w-full max-w-4xl"
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

