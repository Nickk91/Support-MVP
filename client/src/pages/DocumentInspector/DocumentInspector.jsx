import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";

// Components
import Header from "./components/Header";
import DocumentsList from "./components/DocumentsList";
import DocumentAnalysis from "./components/DocumentAnalysis";
import LoadingState from "./components/LoadingState";

export default function DocumentInspector() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setInspectionData(null);
      const encodedPath = encodeURIComponent(documentPath);
      const response = await api.get(
        `/inspect/documents/${botId}/${encodedPath}`
      );
      setInspectionData(response.data);
      setSelectedDocument(documentPath);
    } catch (error) {
      console.error("Failed to inspect document:", error);
      toast.error("Failed to load document details");
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[120rem] mx-auto border rounded-lg bg-card">
        {/* Header */}
        <div className=" p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Document Inspector</h1>
              {botId && (
                <Badge variant="secondary" className="ml-6 mt-2">
                  Bot ID: {botId}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
              className="h-8 w-8 rounded-full"
              title="Back to Dashboard"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              {/* DocumentsList now takes 2 out of 5 columns */}
              <DocumentsList
                documents={documents}
                selectedDocument={selectedDocument}
                onDocumentSelect={inspectDocument}
              />
            </div>

            <div className="lg:col-span-3">
              {/* DocumentAnalysis takes 3 out of 5 columns */}
              <DocumentAnalysis
                selectedDocument={selectedDocument}
                inspectionData={inspectionData}
                botId={botId}
                onRefresh={inspectDocument}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
