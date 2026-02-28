"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentTemplateProps } from "@/components/documents/DocumentTemplate";
import { generateDocumentPDF } from "@/lib/utils/pdf";
import { toast } from "sonner";

interface DocumentPdfDownloadButtonProps {
  templateProps: DocumentTemplateProps;
  filename: string;
  label?: string;
  variant?: "default" | "outline" | "gnerai" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function DocumentPdfDownloadButton({
  templateProps,
  filename,
  label = "Descargar PDF",
  variant = "outline",
  size = "sm",
  className,
}: DocumentPdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await generateDocumentPDF(templateProps, filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF";
      toast.error("Error al generar PDF", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} variant={variant} size={size} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </Button>
  );
}
