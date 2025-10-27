export default function LoadingState() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="col-span-2 h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
