import { memo } from "react";

/**
 * PipelineProgress
 * - steps: string[] (labels)
 * - currentIndex: number (0-based)
 */
function PipelineProgress({ steps = [], currentIndex = 0, className = "" }) {
  const total = steps.length;
  const active = Math.max(0, Math.min(currentIndex, total - 1));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        {steps.map((label, i) => {
          const done = i < active;
          const current = i === active;

          return (
            <div key={label} className="flex items-center gap-3 min-w-0">
              {/* Node */}
              <div
                className={[
                  "relative shrink-0 size-6 rounded-full border",
                  done
                    ? "bg-burple-600 border-burple-600"
                    : current
                    ? "bg-burple-400 border-burple-500"
                    : "bg-muted border-border",
                ].join(" ")}
                aria-current={current ? "step" : undefined}
              >
                {/* Inner dot for current step */}
                {current && (
                  <span className="absolute inset-1 rounded-full bg-burple-700/30 animate-pulse" />
                )}
              </div>

              {/* Label */}
              <div className="min-w-0">
                <div
                  className={[
                    "text-xs font-medium truncate",
                    done || current
                      ? "text-foreground"
                      : "text-muted-foreground",
                  ].join(" ")}
                  title={label}
                >
                  {label}
                </div>
              </div>

              {/* Pipe (skip on last) */}
              {i < total - 1 && (
                <div
                  className={[
                    "h-1 w-10 md:w-16 rounded-full transition-colors",
                    done
                      ? "bg-burple-600"
                      : current
                      ? "bg-burple-400"
                      : "bg-muted",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(PipelineProgress);
