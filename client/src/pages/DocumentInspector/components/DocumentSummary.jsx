export default function DocumentSummary({ inspectionData }) {
  const stats = [
    {
      label: "Total Chunks",
      value: inspectionData.parsing_result.length,
      color: "text-primary",
    },
    {
      label: "Characters",
      value: inspectionData.summary?.total_characters || 0,
      color: "text-green-600",
    },
    {
      label: "Pages",
      value: inspectionData.summary?.pages_processed || "N/A",
      color: "text-purple-600",
    },
    {
      label: "Avg Chunk Size",
      value: inspectionData.summary?.average_chunk_size || 0,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
