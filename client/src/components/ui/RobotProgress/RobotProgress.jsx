// src/components/ui/RobotProgress/RobotProgress.jsx
import { memo } from "react";
import { RiRobot3Fill as RobotIcon } from "react-icons/ri";
// import { SiProbot as RobotIcon } from "react-icons/si";

function RobotProgress({ progress = 0, size = "w-12 h-12", className = "" }) {
  const pct = Math.max(0, Math.min(100, progress));
  const cropTop = 100 - pct; // how much to hide from the TOP

  return (
    <div
      className={`relative inline-block ${size} ${className}`}
      role="img"
      aria-label={`Setup progress ${pct}%`}
    >
      {/* Base outline (muted) */}
      <RobotIcon className="absolute inset-0 w-full h-full text-muted-foreground/40" />

      {/* Colored icon, full-size, revealed by clip-path from bottom up */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(${cropTop}% 0 0 0)`,
          transition: "clip-path 300ms ease-out",
          willChange: "clip-path",
        }}
      >
        <RobotIcon className="absolute inset-0 w-full h-full text-burple-600 drop-shadow-sm" />
      </div>

      {/* Optional subtle top outline for crisp edges */}
      <RobotIcon className="absolute inset-0 w-full h-full text-foreground/30 pointer-events-none" />
    </div>
  );
}

export default memo(RobotProgress);
