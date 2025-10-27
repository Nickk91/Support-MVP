import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function ChunksList({ chunks }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div>
      <h3 className="font-semibold mb-4 text-foreground">Document Chunks</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {chunks.map((chunk, index) => (
            <ChunkCard
              key={chunk.chunk_id}
              chunk={chunk}
              index={index}
              onCopy={copyToClipboard}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChunkCard({ chunk, index, onCopy }) {
  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Chunk {index + 1}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {chunk.char_count} chars • {chunk.token_count} tokens
            </span>
            {chunk.page_number && (
              <Badge variant="secondary" className="text-xs">
                Page {chunk.page_number}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(chunk.content)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-sm whitespace-pre-wrap text-foreground">
          {chunk.content}
        </p>
      </CardContent>
    </Card>
  );
}
