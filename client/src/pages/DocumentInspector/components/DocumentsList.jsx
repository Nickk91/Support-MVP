import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, FileIcon, Eye } from "lucide-react";

export default function DocumentsList({
  documents,
  selectedDocument,
  onDocumentSelect,
}) {
  const getFileName = (path) => {
    return path.split(/[\\/]/).pop() || path;
  };

  return (
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
              <DocumentCard
                key={index}
                document={doc}
                isSelected={selectedDocument === doc.document_path}
                onSelect={() => onDocumentSelect(doc.document_path)}
              />
            ))}
            {documents.length === 0 && <EmptyDocumentsState />}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DocumentCard({ document, isSelected, onSelect }) {
  const getFileName = (path) => {
    return path.split(/[\\/]/).pop() || path;
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        <FileIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-foreground">
            {getFileName(document.document_path)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {document.document_path}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {new Date(document.last_processed).toLocaleDateString()}
            </Badge>
            {document.user_id && (
              <Badge variant="outline" className="text-xs">
                User: {document.user_id}
              </Badge>
            )}
          </div>
        </div>
        {isSelected && <Eye className="h-4 w-4 text-primary" />}
      </div>
    </div>
  );
}

function EmptyDocumentsState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p>No documents processed yet</p>
    </div>
  );
}
