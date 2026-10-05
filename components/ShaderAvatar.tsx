"use client";

import React, { useRef } from "react";
import { IconUser } from "@tabler/icons-react";

interface ShaderAvatarProps {
  email?: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
  onImageChange?: (dataUrl: string) => void;
}

export default function ShaderAvatar({
  size = 32,
  className = "",
  imageUrl = null,
  onImageChange,
}: ShaderAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (onImageChange) fileRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onImageChange(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div
        onClick={handleClick}
        style={{ width: size, height: size, cursor: onImageChange ? "pointer" : "default" }}
        className={`relative rounded-full overflow-hidden shrink-0 border border-white/20 shadow-xs group ${className}`}
        title={onImageChange ? "Click to change photo" : undefined}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/10">
            <IconUser size={Math.round(size * 0.6)} stroke={1.5} className="text-white/70" />
          </div>
        )}

        {/* Upload overlay hint on hover */}
        {onImageChange && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              width={Math.round(size * 0.4)}
              height={Math.round(size * 0.4)}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
