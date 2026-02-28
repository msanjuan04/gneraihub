"use client";

import { DocumentEditor } from "@/components/documents/DocumentEditor";
import type { Client, Invoice, Project, UserSettings } from "@/types";

interface InvoiceFormProps {
  invoice?: Invoice;
  clients: Client[];
  projects: Project[];
  issuer: UserSettings | null;
  initialInvoiceNumber: string;
}

export function InvoiceForm({
  invoice,
  clients,
  projects,
  issuer,
  initialInvoiceNumber,
}: InvoiceFormProps) {
  return (
    <DocumentEditor
      type="invoice"
      clients={clients}
      projects={projects}
      issuer={issuer}
      initialDocumentNumber={initialInvoiceNumber}
      invoice={invoice}
    />
  );
}
