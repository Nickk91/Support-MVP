// components/TempSlider.jsx (complete updated version)
import { useState, forwardRef, useMemo } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const TempSlider = forwardRef(
  (
    {
      className,
      showLabels = true,
      showMarks = true,
      showHeatIndicator = true,
      showInfoPanel = true,
      value,
      onValueChange,
      min = 0,
      max = 1,
      step = 0.05, // Step size is 0.05
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState([0.3]);

    // Use controlled value if provided, otherwise use local state
    const currentValue = value?.[0] ?? localValue[0];

    const handleValueChange = (val) => {
      // Force snap to 0.05 increments
      const rawValue = val[0];

      // Calculate the snapped value
      const snappedValue = Math.round(rawValue / step) * step;

      // Ensure it stays within bounds and has exactly 2 decimal places
      const clampedValue = Math.max(min, Math.min(max, snappedValue));
      const finalValue = Number(clampedValue.toFixed(2)); // Ensures 0.00, 0.05, 0.10, etc.

      const roundedValue = [finalValue];

      setLocalValue(roundedValue);
      if (onValueChange) {
        onValueChange(roundedValue);
      }
    };

    // Generate random but vibrant psychedelic colors
    const generatePsychedelicColors = () => {
      const baseColors = [
        "#ef4444", // Red
        "#f97316", // Orange
        "#fbbf24", // Yellow
        "#84cc16", // Lime
        "#16a34a", // Green
        "#22d3ee", // Cyan
        "#3b82f6", // Blue
        "#8b5cf6", // Indigo
        "#d946ef", // Purple
        "#ec4899", // Pink
        "#f43f5e", // Rose
        "#f59e0b", // Amber
        "#10b981", // Emerald
        "#06b6d4", // Sky
        "#6366f1", // Violet
        "#a855f7", // Fuchsia
      ];

      // Create a chaotic mix by shuffling and repeating
      const shuffled = [...baseColors].sort(() => Math.random() - 0.5);
      return [...shuffled, ...shuffled, ...shuffled]; // 48 colors total for density
    };

    // Memoize the static gradient to prevent recalculations
    const staticGradient = useMemo(() => {
      const psychedelicColors = generatePsychedelicColors();

      let gradientString = `linear-gradient(to right, 
        #1e40af 0%,      /* Deep Blue - Cold */
        #3b82f6 10%,     /* Blue - Cold */
        #22d3ee 20%,     /* Cyan - Cold */
        #16a34a 30%,     /* Green - Cool */
        #84cc16 40%,     /* Lime - Cool */
        #fbbf24 50%,     /* Yellow - Lukewarm */
        #f59e0b 55%,     /* Amber - Warm */
        #f97316 60%,     /* Orange - Warm */
        #ef4444 70%,     /* Red - Hot */
        #dc2626 80%,     /* Dark Red - Hot */
        #b91c1c 90%,     /* Very Dark Red - End of smooth gradient */`;

      // Add chaotic psychedelic stripes from 90% to 100%
      const stripeStart = 90; // Start chaotic stripes at 90%
      const stripeEnd = 100; // End at 100%
      const totalStripeSpace = stripeEnd - stripeStart; // 10% of the track for chaos
      const totalStripes = 56; // Even more stripes for maximum chaos (56 stripes in 10% space!)
      const stripeWidth = totalStripeSpace / totalStripes; // Each stripe is ~0.18% wide

      // Create the chaotic psychedelic stripes
      for (let i = 0; i < totalStripes; i++) {
        const colorIndex = i % psychedelicColors.length;
        const startPercent = stripeStart + i * stripeWidth;
        const endPercent = startPercent + stripeWidth;

        gradientString += `
        ${psychedelicColors[colorIndex]} ${startPercent}%,`;
        gradientString += `
        ${psychedelicColors[colorIndex]} ${endPercent}%,`;
      }

      // Remove the trailing comma and close the gradient
      gradientString = gradientString.slice(0, -1); // Remove last comma
      gradientString += ")";

      return gradientString;
    }, []); // Empty dependency array means it only calculates once

    // Get thumb color based on temperature
    const getThumbColor = (temp) => {
      const normalized = (temp - min) / (max - min);
      const percentage = normalized * 100;

      if (percentage <= 10) return "#1e40af"; // Deep Blue
      if (percentage <= 20) return "#3b82f6"; // Blue
      if (percentage <= 30) return "#22d3ee"; // Cyan
      if (percentage <= 40) return "#16a34a"; // Green
      if (percentage <= 50) return "#fbbf24"; // Yellow (Lukewarm)
      if (percentage <= 60) return "#f97316"; // Orange (Warm)
      if (percentage <= 70) return "#ef4444"; // Red (Hot)
      if (percentage <= 80) return "#dc2626"; // Dark Red (Hot)
      if (percentage <= 90) return "#b91c1c"; // Very Dark Red

      // For psychedelic chaos section (90-100%), use random vibrant colors
      if (percentage > 90) {
        const psychedelicColors = [
          "#ef4444",
          "#f97316",
          "#fbbf24",
          "#84cc16",
          "#16a34a",
          "#22d3ee",
          "#3b82f6",
          "#8b5cf6",
          "#d946ef",
          "#ec4899",
          "#f43f5e",
          "#f59e0b",
          "#10b981",
          "#06b6d4",
          "#6366f1",
          "#a855f7",
        ];

        // Map 90-100% to color index (creates random-like pattern)
        const chaosProgress = (percentage - 90) / 10;
        const colorIndex =
          Math.floor(chaosProgress * psychedelicColors.length * 4) %
          psychedelicColors.length;
        return psychedelicColors[colorIndex];
      }

      return "#ef4444"; // Default red
    };

    // Get temperature description - Updated to include Lukewarm
    const getTemperatureDescription = (temp) => {
      const normalized = (temp - min) / (max - min);

      if (normalized <= 0.2) return "Cold: Very Consistent & Predictable";
      if (normalized <= 0.4) return "Cool: Focused & Reliable";
      if (normalized <= 0.5) return "Lukewarm: Balanced Creativity";
      if (normalized <= 0.6) return "Warm: Creative & Varied";
      if (normalized <= 0.8) return "Hot: Very Creative & Original";
      if (normalized <= 0.9) return "Extreme: Highly Experimental";
      return "Psychedelic: Chaos Mode";
    };

    // Get heat indicator emoji - Updated to include Lukewarm
    const getHeatIndicator = (temp) => {
      const normalized = (temp - min) / (max - min);

      if (normalized <= 0.2) return "❄️";
      if (normalized <= 0.4) return "🌊";
      if (normalized <= 0.5) return "💧"; // Lukewarm - water droplet
      if (normalized <= 0.6) return "🌡️";
      if (normalized <= 0.8) return "🔥";
      if (normalized <= 0.9) return "🔥🔥";
      return "🌀";
    };

    // Get temperature label - Updated to include Lukewarm
    const getTemperatureLabel = (temp) => {
      const normalized = (temp - min) / (max - min);

      if (normalized <= 0.2) return "Cold";
      if (normalized <= 0.4) return "Cool";
      if (normalized <= 0.5) return "Lukewarm";
      if (normalized <= 0.6) return "Warm";
      if (normalized <= 0.8) return "Hot";
      if (normalized <= 0.9) return "Extreme";
      return "Psychedelic";
    };

    return (
      <div className="w-full space-y-4">
        {/* Temperature Display */}
        {showLabels && (
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Temperature
              </label>
              <p className="text-xs text-muted-foreground">
                Controls response randomness
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showHeatIndicator && (
                <span className="text-xl">
                  {getHeatIndicator(currentValue)}
                </span>
              )}
              <div className="text-right">
                <div
                  className={`text-sm font-semibold ${
                    currentValue >= 0.9
                      ? "text-purple-600 animate-pulse"
                      : currentValue >= 0.8
                      ? "text-red-600"
                      : currentValue >= 0.6
                      ? "text-orange-600"
                      : currentValue >= 0.5
                      ? "text-yellow-600" // Lukewarm gets yellow
                      : currentValue >= 0.4
                      ? "text-green-600"
                      : currentValue >= 0.2
                      ? "text-blue-600"
                      : "text-indigo-600"
                  }`}
                >
                  {getTemperatureLabel(currentValue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentValue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slider Container */}
        <div className="relative">
          {/* Full Track Background - Static Gradient */}
          <div
            className="absolute h-2 w-full rounded-full"
            style={{ background: staticGradient }}
          />

          {/* Main Slider */}
          <SliderPrimitive.Root
            ref={ref}
            className={cn(
              "relative flex w-full touch-none select-none items-center",
              className
            )}
            value={[currentValue]}
            onValueChange={handleValueChange}
            min={min}
            max={max}
            step={step} // Now properly enforces 0.05 steps
            {...props}
          >
            {/* Transparent track that sits on top of the background */}
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-transparent">
              {/* Mask that hides the background based on slider position */}
              <div
                className="absolute inset-0 bg-gray-100/90 rounded-full transition-all duration-150"
                style={{
                  left: `${(currentValue / max) * 100}%`,
                  width: `${100 - (currentValue / max) * 100}%`,
                }}
              />
            </SliderPrimitive.Track>

            {/* Thumb with Dynamic Color */}
            <SliderPrimitive.Thumb
              className={`block h-6 w-6 rounded-full border-2 border-white shadow-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                currentValue >= 0.9
                  ? "ring-2 ring-offset-1 ring-purple-400"
                  : ""
              }`}
              style={{
                backgroundColor: getThumbColor(currentValue),
                boxShadow: `0 0 0 4px ${getThumbColor(
                  currentValue
                )}30, 0 2px 10px rgba(0,0,0,0.2)`,
              }}
            />
          </SliderPrimitive.Root>

          {/* Marks with special mark for chaos threshold */}
          {showMarks && (
            <div className="flex mt-2 relative w-full">
              <div className="absolute left-0 right-0 top-0 flex justify-between px-1.5">
                {[
                  min,
                  0.2, // Cold/Cool boundary
                  0.4, // Cool/Lukewarm boundary
                  0.5, // Lukewarm point
                  0.6, // Lukewarm/Warm boundary
                  0.8, // Warm/Hot boundary
                  0.9, // Chaos threshold
                  max,
                ].map((mark, index, array) => {
                  // Calculate position percentage for each mark
                  const positionPercentage = ((mark - min) / (max - min)) * 100;

                  return (
                    <div
                      key={mark}
                      className="flex flex-col items-center relative"
                      style={{
                        position: "absolute",
                        left: `${positionPercentage}%`,
                        transform: "translateX(-50%)", // Center the mark
                      }}
                    >
                      <div
                        className={`h-1 w-px ${
                          mark === 0.9
                            ? "bg-purple-500 h-3 w-0.5"
                            : mark === 0.5
                            ? "bg-yellow-500 h-3 w-0.5" // Highlight Lukewarm mark
                            : "bg-gray-300"
                        }`}
                      />
                      <div
                        className={`text-xs ${
                          mark === 0.9
                            ? "text-purple-600 font-semibold"
                            : mark === 0.5
                            ? "text-yellow-600 font-semibold" // Highlight Lukewarm label
                            : "text-gray-500"
                        } mt-1 font-mono whitespace-nowrap`}
                      >
                        {mark.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {showLabels && (
          <div className="text-center">
            <p className="text-sm mt-9 text-muted-foreground">
              {getTemperatureDescription(currentValue)}
            </p>
          </div>
        )}
      </div>
    );
  }
);
TempSlider.displayName = "TempSlider";

export { TempSlider };
