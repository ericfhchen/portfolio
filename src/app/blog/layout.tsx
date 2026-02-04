"use client";

import { useEffect } from "react";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Enable scrolling for blog page
    document.body.style.overflow = "auto";
    
    return () => {
      // Restore original overflow when leaving blog page
      document.body.style.overflow = "hidden";
    };
  }, []);

  return <>{children}</>;
}

