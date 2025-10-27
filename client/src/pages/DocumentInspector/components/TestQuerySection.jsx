import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "../../../lib/api";

export default function TestQuerySection({ selectedDocument, botId }) {
  const [testQuery, setTestQuery] = useState("");
  const [queryResults, setQueryResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const testDocumentQuery = async () => {
    if (!testQuery.trim() || !selectedDocument) return;

    try {
      setTesting(true);
      const encodedPath = encodeURIComponent(selectedDocument);
      const response = await api.post(
        `/inspect/documents/${botId}/${encodedPath}/test-query`,
        { query: testQuery }
      );
      setQueryResults(response.data);
    } catch (error) {
      console.error("Failed to test query:", error);
      toast.error("Failed to test query");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Test Document Retrieval</h3>
      <div className="flex space-x-2">
        <Input
          placeholder="Enter a question to test retrieval..."
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && testDocumentQuery()}
        />
        <Button
          onClick={testDocumentQuery}
          disabled={testing || !testQuery.trim()}
        >
          {testing ? "Testing..." : "Test Query"}
        </Button>
      </div>

      {queryResults && <QueryResults results={queryResults} />}
    </div>
  );
}

function QueryResults({ results }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-foreground">Query Results</span>
          <Badge variant={results.matches_found > 0 ? "default" : "secondary"}>
            {results.matches_found} matches
          </Badge>
        </div>
        {results.matching_chunks.length > 0 ? (
          <div className="space-y-2">
            {results.matching_chunks.map((chunk, index) => (
              <MatchingChunk key={index} chunk={chunk} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No matching chunks found for this query.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MatchingChunk({ chunk }) {
  return (
    <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
      <p className="text-sm text-foreground">{chunk.content_preview}</p>
      <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
        <span>Chunk {chunk.chunk_id}</span>
        {chunk.page && <span>• Page {chunk.page}</span>}
      </div>
    </div>
  );
}
