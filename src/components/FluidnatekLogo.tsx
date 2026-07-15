import React from "react";

interface FluidnatekLogoProps {
  variant?: "horizontal" | "vertical" | "symbol";
  className?: string;
  lightMode?: boolean;
}

export default function FluidnatekLogo({
  variant = "horizontal",
  className = "h-12",
  lightMode = false
}: FluidnatekLogoProps) {
  // Brand colors
  const tealColor = "#00b2b2"; // Vibrant brand teal
  const blueColor = "#0d4373"; // Deep brand blue
  const textColor = lightMode ? "#0d4373" : "#ffffff";
  const subtitleColor = lightMode ? "#00b2b2" : "#38bdf8"; // Light mode subtitle vs dark mode

  // Interlocking metaball logo symbol matching real Fluidnatek branding
  // Real branding contains:
  // 1. One blue metaball lobe at top-right
  // 2. One teal/aquamarine metaball lobe at middle-left
  // 3. One teal/aquamarine metaball lobe at bottom-right
  // They are connected smoothly as an organic liquid metaball.
  const LogoSymbol = () => (
    <svg
      viewBox="0 0 160 160"
      className="w-full h-full select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow effect for high-tech premium feel */}
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Blue Metaball Capsule: curves from top-right down to middle-left */}
      <path
        d="M 105 55 Q 83 75 62 95"
        stroke={blueColor}
        strokeWidth="52"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0px 3px 6px rgba(13, 67, 115, 0.4))" }}
      />

      {/* Teal Metaball Capsule: curves from middle-left down to bottom-right */}
      <path
        d="M 62 95 Q 81 113 100 130"
        stroke={tealColor}
        strokeWidth="52"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0px 4px 8px rgba(0, 178, 178, 0.35))" }}
      />

      {/* Subtle organic shine accent at overlap */}
      <circle cx="81" cy="95" r="4" fill="#ffffff" opacity="0.15" />
    </svg>
  );

  if (variant === "symbol") {
    return (
      <div className={`aspect-square flex items-center justify-center ${className}`}>
        <LogoSymbol />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-4 ${className}`}>
        {/* Symbol */}
        <div className="w-24 h-24 mb-4">
          <LogoSymbol />
        </div>
        {/* Brand Name Text */}
        <div className="flex flex-col items-center">
          <div className="flex items-end justify-center relative font-sans">
            <span className="text-3xl font-extrabold tracking-tight" style={{ color: textColor }}>
              Flu<span style={{ color: tealColor }}>i</span>dnatek
            </span>
            <span className="text-[10px] font-bold align-super ml-0.5" style={{ color: blueColor }}>®</span>
          </div>
          
          <div className="text-[11px] font-medium tracking-[0.25em] uppercase mt-1" style={{ color: subtitleColor }}>
            One Step Ahead
          </div>
          
          <div className="text-[9px] text-zinc-500 font-sans tracking-wide mt-1.5 flex items-center gap-1">
            <span>by</span>
            <span className="font-bold text-zinc-400">Bioinicia</span>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal Logo (Default)
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Symbol on the left */}
      <div className="w-12 h-12 shrink-0">
        <LogoSymbol />
      </div>
      
      {/* Text on the right */}
      <div className="flex flex-col select-none">
        <div className="flex items-start leading-none">
          <span className="text-2xl font-black tracking-tight font-sans flex items-center" style={{ color: textColor }}>
            Flu
            {/* Custom styled 'i' with a slanted capsule dot like the real logo */}
            <span className="relative flex flex-col items-center px-[1px]">
              <span 
                className="w-[5px] h-[8px] rounded-full absolute -top-[7px] rotate-[20deg]"
                style={{ backgroundColor: tealColor }}
              />
              <span className="text-2xl font-black">i</span>
            </span>
            dnatek
          </span>
          <span className="text-[8px] font-bold align-super ml-0.5" style={{ color: blueColor }}>®</span>
        </div>
        
        <div className="flex items-center justify-between mt-1 text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: subtitleColor }}>
          <span>One Step Ahead</span>
          <span className="text-[8px] text-zinc-500 font-sans tracking-normal ml-3 lowercase font-normal">
            by <strong className="font-semibold text-zinc-400">Bioinicia</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
