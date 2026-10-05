"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const NeuroNoise = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.NeuroNoise),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
);

export default function ShaderBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full h-[420px] md:h-[480px] overflow-hidden -mt-[72px]">
      {mounted ? (
        <div className="absolute inset-0 w-full h-full">
          <NeuroNoise
            style={{ width: "100%", height: "100%" }}
            speed={0.3}
            colorFront="#ff7a3d"
            colorMid="#7928ca"
            colorBack="#0d0e15"
          />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: "#0d0e15" }} />
      )}
    </div>
  );
}
