// components/TemperaturePresets.jsx
import { Slider } from "./ui/slider";

export default function TemperaturePresets({
  value,
  onChange,
  presets = [
    {
      value: 0.1,
      label: "More Consistent",
      description: "Factual, predictable responses",
    },
    {
      value: 0.3,
      label: "Balanced",
      description: "Mix of consistency and creativity",
    },
    {
      value: 0.7,
      label: "More Creative",
      description: "Original, varied responses",
    },
  ],
}) {
  const currentPreset =
    presets.find((preset) => preset.value === value) || presets[1];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-3">
          Response Creativity:{" "}
          <span className="font-semibold text-blue-600">
            {currentPreset.label}
          </span>
        </label>

        {/* Preset Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`p-3 border rounded-lg text-sm transition-all ${
                value === preset.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-xs text-gray-500 mt-1">
                {preset.description}
              </div>
            </button>
          ))}
        </div>

        {/* Slider for Fine Control */}
        <div className="px-2">
          <Slider
            value={[value]}
            onValueChange={([newValue]) => onChange(newValue)}
            min={0}
            max={1}
            step={0.1}
            className="mt-2"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>More Consistent</span>
            <span className="font-medium">Current: {value}</span>
            <span>More Creative</span>
          </div>
        </div>
      </div>

      {/* Visual Indicator */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1 h-2 bg-gradient-to-r from-blue-300 to-orange-300 rounded-full" />
        <div className="text-gray-600 min-w-[120px] text-right">
          Temperature: <span className="font-mono">{value.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
