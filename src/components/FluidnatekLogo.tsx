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
      viewBox="0 0 200 200"
      className="w-full h-full select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="fluidnatek-symbol-clip">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="97" fill="#ffffff" stroke={blueColor} strokeWidth="6" />
      <g clipPath="url(#fluidnatek-symbol-clip)">
        <path d="M113 43c20 0 33 14 32 32-1 16-12 27-27 31-10 3-17 10-22 20l-35-26c8-10 15-20 18-31 4-15 16-26 34-26Z" fill={blueColor} />
        <path d="M77 78c14 0 25 7 32 18 6 10 13 15 24 18 15 4 26 17 26 32 0 19-14 33-34 33-17 0-29-10-35-25-4-10-10-16-21-19-13-4-22-15-22-29 0-16 12-28 30-28Z" fill={tealColor} />
      </g>
      <text x="143" y="51" fill={blueColor} fontSize="14" fontFamily="Arial, sans-serif">®</text>
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
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-12 w-12 shrink-0">
        <LogoSymbol />
      </div>
      <div className="flex flex-col select-none">
        <div className="flex items-start leading-none">
          <span className="text-2xl font-black tracking-tight font-sans flex items-center" style={{ color: lightMode ? blueColor : textColor }}>
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
        
        <div className="flex items-center justify-between mt-1 text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: lightMode ? blueColor : subtitleColor }}>
          <span>One Step Ahead</span>
          <span className="text-[8px] font-sans tracking-normal ml-3 lowercase font-normal" style={{ color: lightMode ? "#334155" : "#71717a" }}>
            by <strong className="font-semibold" style={{ color: lightMode ? blueColor : "#a1a1aa" }}>Bioinicia</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
