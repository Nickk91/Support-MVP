import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* <Header botId={botId} onBack={handleBackToDashboard} /> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DocumentsList
            documents={documents}
            selectedDocument={selectedDocument}
            onDocumentSelect={inspectDocument}
          />

          <DocumentAnalysis
            selectedDocument={selectedDocument}
            inspectionData={inspectionData}
            botId={botId}
            onRefresh={inspectDocument}
          />
        </div>
      </div>
    </div>
  );
}
