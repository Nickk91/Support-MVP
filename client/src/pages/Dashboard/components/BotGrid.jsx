// src/pages/Dashboard/components/BotGrid.jsx - UPDATED
import BotCard from "./BotCard";

export default function BotGrid({
  bots,
  onEdit,
  onDelete,
  onInspect,
  onEvaluate,
}) {
  // ADD onEvaluate prop
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Your AI Assistants</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <BotCard
            key={bot._id || bot.id}
            bot={bot}
            onEdit={() => onEdit(bot)}
            onDelete={() => onDelete(bot)}
            onInspect={() => onInspect(bot)}
            onEvaluate={() => onEvaluate(bot)} // ADD THIS
          />
        ))}
      </div>
    </div>
  );
}
