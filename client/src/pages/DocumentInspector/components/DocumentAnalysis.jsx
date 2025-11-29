import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, Search, AlertCircle } from "lucide-react";

import DocumentSummary from "./DocumentSummary";
import TestQuerySection from "./TestQuerySection";
import ChunksList from "./ChunksList";

export default function DocumentAnalysis({
  selectedDocument,
  inspectionData,
  botId,
  onRefresh,
}) {
  if (!selectedDocument) {
    return <EmptySelectionState />;
  }

  if (!inspectionData) {
    return <LoadingAnalysisState />;
  }

  return (
    <Card className="lg:col-span-2 lg:h-[695px] ">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Document Analysis</span>
          </div>
          <Badge variant="secondary">
            {inspectionData.parsing_result?.length || 0} chunks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <DocumentSummary inspectionData={inspectionData} />

          {/* <TestQuerySection selectedDocument={selectedDocument} botId={botId} /> */}

          <Separator />

          <ChunksList chunks={inspectionData.parsing_result} />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptySelectionState() {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Select a document to inspect its processing results</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingAnalysisState() {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            Loading document analysis...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
