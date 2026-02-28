import type { DocumentTemplateProps } from "@/components/documents/DocumentTemplate";

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^A-Za-z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildDocumentFilename(documentNumber: string, clientName: string): string {
  const numberPart = sanitizeFilePart(documentNumber || "documento") || "documento";
  const clientPart = sanitizeFilePart(clientName || "cliente") || "cliente";
  return `${numberPart}-${clientPart}.pdf`;
}

export async function generateDocumentPDF(
  templateProps: DocumentTemplateProps,
  filename: string
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("La generación de PDF solo está disponible en el navegador");
  }

  const [
    { default: html2canvas },
    { default: JsPdf },
    React,
    { createRoot },
    { DocumentTemplate },
  ] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
    import("react"),
    import("react-dom/client"),
    import("@/components/documents/DocumentTemplate"),
  ]);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.minHeight = "1123px";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.setAttribute("aria-hidden", "true");

  const mountNode = document.createElement("div");
  mountNode.style.width = "794px";
  mountNode.style.minHeight = "1123px";
  host.appendChild(mountNode);
  document.body.appendChild(host);

  const root = createRoot(mountNode);

  try {
    root.render(React.createElement(DocumentTemplate, { ...templateProps, isPdfMode: true }));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(mountNode, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: mountNode.scrollHeight,
      logging: false,
      windowWidth: 794,
    });

    const imageData = canvas.toDataURL("image/png");
    const pdf = new JsPdf("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const imageProps = pdf.getImageProperties(imageData);
    const renderWidth = pageWidth;
    const renderHeight = (imageProps.height * renderWidth) / imageProps.width;

    let heightLeft = renderHeight;
    let position = 0;

    pdf.addImage(imageData, "PNG", 0, position, renderWidth, renderHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - renderHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, position, renderWidth, renderHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    const safeFilename = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } finally {
    root.unmount();
    host.remove();
  }
}
