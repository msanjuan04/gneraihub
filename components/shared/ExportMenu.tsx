"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToExcel } from "@/lib/utils/export";

interface ExportMenuProps {
  data: Record<string, any>[];
  filename: string;
  sheetName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

export function ExportMenu({
  data,
  filename,
  sheetName,
  buttonLabel = "Exportar",
  buttonClassName,
}: ExportMenuProps) {
  const disabled = data.length === 0;

  const handleCsv = () => {
    if (disabled) {
      toast.error("No hay datos para exportar");
      return;
    }
    exportToCSV(data, filename);
    toast.success("CSV exportado");
  };

  const handleExcel = () => {
    if (disabled) {
      toast.error("No hay datos para exportar");
      return;
    }
    exportToExcel(data, filename, sheetName);
    toast.success("Excel exportado");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={buttonClassName}>
          <Download className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsv}>Exportar CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel}>Exportar Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
