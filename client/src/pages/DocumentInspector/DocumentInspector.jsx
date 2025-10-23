import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Search,
  ArrowLeft,
  Eye,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";

export default function DocumentInspector() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [testQuery, setTestQuery] = useState("");
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (botId) {
      fetchDocuments();
    }
  }, [botId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inspect/documents/${botId}`);
      if (response.data.documents) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const inspectDocument = async (documentPath) => {
    try {
      setInspecting(true);
      // URL encode the path for the API call
      const encodedPath = encodeURIComponent(documentPath);
      const response = await api.get(
        `/inspect/documents/${botId}/${encodedPath}`
      );
      setInspectionData(response.data);
      setSelectedDocument(documentPath);
      setQueryResults(null);
    } catch (error) {
      console.error("Failed to inspect document:", error);
      toast.error("Failed to load document details");
    } finally {
      setInspecting(false);
    }
  };

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

  const getFileName = (path) => {
    return path.split(/[\\/]/).pop() || path;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
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

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Document Inspector
              </h1>
              <p className="text-muted-foreground">
                Review how your documents are processed and verify content
                extraction
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            Bot ID: {botId}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documents ({documents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedDocument === doc.document_path
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                      onClick={() => inspectDocument(doc.document_path)}
                    >
                      <div className="flex items-start space-x-3">
                        <FileIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">
                            {getFileName(doc.document_path)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.document_path}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {new Date(
                                doc.last_processed
                              ).toLocaleDateString()}
                            </Badge>
                            {doc.user_id && (
                              <Badge variant="outline" className="text-xs">
                                User: {doc.user_id}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedDocument === doc.document_path && (
                          <Eye className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No documents processed yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Inspection Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Document Analysis</span>
                </div>
                {inspectionData && (
                  <Badge variant="secondary">
                    {inspectionData.parsing_result?.length || 0} chunks
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDocument ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a document to inspect its processing results</p>
                </div>
              ) : inspecting ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    Loading document analysis...
                  </p>
                </div>
              ) : inspectionData ? (
                <div className="space-y-6">
                  {/* Document Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {inspectionData.parsing_result.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Chunks
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {inspectionData.summary?.total_characters || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Characters
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {inspectionData.summary?.pages_processed || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Pages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {inspectionData.summary?.average_chunk_size || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg Chunk Size
                      </p>
                    </div>
                  </div>

                  {/* Test Query Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">
                      Test Document Retrieval
                    </h3>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter a question to test retrieval..."
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && testDocumentQuery()
                        }
                      />
                      <Button
                        onClick={testDocumentQuery}
                        disabled={testing || !testQuery.trim()}
                      >
                        {testing ? "Testing..." : "Test Query"}
                      </Button>
                    </div>

                    {queryResults && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">
                              Query Results
                            </span>
                            <Badge
                              variant={
                                queryResults.matches_found > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {queryResults.matches_found} matches
                            </Badge>
                          </div>
                          {queryResults.matching_chunks.length > 0 ? (
                            <div className="space-y-2">
                              {queryResults.matching_chunks.map(
                                (chunk, index) => (
                                  <div
                                    key={index}
                                    className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                                  >
                                    <p className="text-sm text-foreground">
                                      {chunk.content_preview}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                                      <span>Chunk {chunk.chunk_id}</span>
                                      {chunk.page && (
                                        <span>• Page {chunk.page}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              No matching chunks found for this query.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Separator />

                  {/* Chunks List */}
                  <div>
                    <h3 className="font-semibold mb-4 text-foreground">
                      Document Chunks
                    </h3>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {inspectionData.parsing_result.map((chunk, index) => (
                          <Card key={chunk.chunk_id} className="relative">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    Chunk {index + 1}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {chunk.char_count} chars •{" "}
                                    {chunk.token_count} tokens
                                  </span>
                                  {chunk.page_number && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Page {chunk.page_number}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(chunk.content)}
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
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Failed to load document analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
