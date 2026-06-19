import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { getDocumentAccessUrl } from "@/lib/storage";

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  name: string;
  file_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onVerify: (
    status: "verified" | "rejected",
    reason?: string,
  ) => Promise<void> | void;
}

const DocumentViewer = ({
  document,
  onClose,
  onVerify,
}: DocumentViewerProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setFileUrl(null);

      try {
        const signedUrl = await getDocumentAccessUrl(document.file_url);

        if (!cancelled) {
          setFileUrl(signedUrl);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [document.file_url]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify("verified");
    } catch {
      // The parent handler owns the error toast; keep the dialog open for retry.
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsVerifying(true);
    try {
      await onVerify("rejected", rejectionReason.trim());
    } catch {
      // The parent handler owns the error toast; keep the dialog open for retry.
    } finally {
      setIsVerifying(false);
    }
  };

  const isPdf = document.file_url.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(document.file_url);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {document.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Document Info */}
          <div className="bg-secondary rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Submitted by</p>
                <p className="font-medium text-foreground">
                  {document.user_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">User Type</p>
                <p className="font-medium text-foreground capitalize">
                  {document.user_role}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Document Type</p>
                <p className="font-medium text-foreground capitalize">
                  {(document.document_type ?? "").replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium text-foreground">
                  {new Date(document.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : fileUrl ? (
              <>
                {isImage && (
                  <img
                    src={fileUrl}
                    alt={document.name}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                )}
                {isPdf && (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[500px]"
                    title={document.name}
                  />
                )}
                {!isImage && !isPdf && (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </Button>
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-8">
                <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
                <p className="text-muted-foreground">Failed to load document</p>
              </div>
            )}
          </div>

          {/* Open in new tab */}
          {fileUrl && (
            <div className="mt-4 text-center">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in new tab
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        {document.status === "pending" && (
          <div className="border-t border-border pt-4 mt-4">
            {showRejectForm ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowRejectForm(false)}
                    disabled={isVerifying}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || isVerifying}
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Confirm Rejection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isVerifying}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify Document
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Already reviewed */}
        {document.status !== "pending" && (
          <div
            className={`border-t border-border pt-4 mt-4 text-center ${
              document.status === "verified"
                ? "text-success"
                : "text-destructive"
            }`}
          >
            {document.status === "verified" ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">
                  This document has been verified
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">
                    This document was rejected
                  </span>
                </div>
                {document.rejection_reason && (
                  <p className="text-sm text-muted-foreground">
                    Reason: {document.rejection_reason}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;
