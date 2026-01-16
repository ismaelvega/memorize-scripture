"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { notionistsNeutral } from "@dicebear/collection";
import { cn } from "@/lib/utils";

type DicebearAvatarProps = {
  seed: string;
  alt: string;
  size?: number;
  className?: string;
};

export function DicebearAvatar({
  seed,
  alt,
  size = 80,
  className,
}: DicebearAvatarProps) {
  const dataUri = useMemo(() => {
    const svg = createAvatar(notionistsNeutral, {
      seed,
      size,
    }).toString();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [seed, size]);

  return (
    <img
      src={dataUri}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      loading="lazy"
    />
  );
}
