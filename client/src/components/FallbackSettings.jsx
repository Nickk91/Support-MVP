// components/FallbackSettings.jsx
export default function FallbackSettings({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Fallback Message (When unsure)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="I don't have enough information to answer that question. Would you like me to connect you with a human expert?"
        className="w-full p-3 border rounded-lg text-sm"
        rows={3}
      />
      <div className="text-xs text-gray-500 mt-1">
        This message shows when the bot doesn't have enough context to answer
      </div>
    </div>
  );
}
