// src/pages/Dashboard/components/BotGrid.jsx
import BotCard from "./BotCard";

export default function BotGrid({
  bots,
  onEdit,
  onDelete,
  onInspect,
  onEvaluate,
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Your AI Assistants</h2>

      {/* 👇 key bit: add the classes below to the grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-artifact-fix">
        {bots.map((bot) => (
          <BotCard
            key={bot._id || bot.id}
            bot={bot}
            onEdit={() => onEdit(bot)}
            onDelete={() => onDelete(bot)}
            onInspect={() => onInspect(bot)}
            onEvaluate={() => onEvaluate(bot)}
          />
        ))}
      </div>
    </div>
  );
}
