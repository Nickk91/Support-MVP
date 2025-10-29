import { RefreshCw } from "lucide-react";

export default function LoadingOverlay({
  title,
  description,
  show = false,
  zIndex = 10,
}) {
  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-${zIndex}`}
    >
      <div className="text-center p-6 bg-card rounded-lg shadow-lg border border-border">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
        <h4 className="font-medium mb-1 text-card-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
