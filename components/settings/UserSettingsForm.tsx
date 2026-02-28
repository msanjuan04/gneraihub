"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  updateUserPassword,
  updateUserProfile,
  updateUserSettings,
  uploadCompanyLogo,
} from "@/app/(dashboard)/ajustes/actions";
import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import type { UserSettings } from "@/types";

interface UserSettingsFormProps {
  settings: UserSettings | null;
  userEmail: string;
  userFullName: string;
}

const PRESET_COLORS = [
  "#3b82f6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#111827",
];

export function UserSettingsForm({ settings, userEmail, userFullName }: UserSettingsFormProps) {
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPersonalization, setLoadingPersonalization] = useState(false);

  const [companyName, setCompanyName] = useState(settings?.company_name ?? "");
  const [companyTaxId, setCompanyTaxId] = useState(settings?.company_tax_id ?? "");
  const [companyAddress, setCompanyAddress] = useState(settings?.company_address ?? "");
  const [companyEmail, setCompanyEmail] = useState(settings?.company_email ?? "");
  const [companyPhone, setCompanyPhone] = useState(settings?.company_phone ?? "");
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings?.company_logo_url ?? "");

  const [profileName, setProfileName] = useState(userFullName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [accentColor, setAccentColor] = useState(settings?.accent_color ?? "#3b82f6");
  const [documentLanguage, setDocumentLanguage] = useState<"es" | "en">(
    settings?.document_language ?? "es"
  );

  const previewProps = useMemo(
    () => ({
      type: "invoice" as const,
      documentNumber: "GNR-2026-02-001",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: "pending",
      issuerName: companyName || "Tu empresa",
      issuerTaxId: companyTaxId || undefined,
      issuerAddress: companyAddress || undefined,
      issuerEmail: companyEmail || undefined,
      issuerPhone: companyPhone || undefined,
      issuerLogoUrl: companyLogoUrl || undefined,
      clientName: documentLanguage === "en" ? "Sample Client" : "Cliente Ejemplo",
      clientCompany: "ACME",
      items: [{ description: "Servicio", quantity: 1, unit_price: 1200, tax_rate: 21 }],
      subtotal: 1200,
      taxAmount: 252,
      irpfAmount: 0,
      total: 1452,
      currency: "EUR" as const,
      taxRate: 21,
      irpfRate: 0,
      accentColor,
      documentLanguage,
      isPdfMode: false,
      hideStatusInPdf: true,
    }),
    [accentColor, companyAddress, companyEmail, companyLogoUrl, companyName, companyPhone, companyTaxId, documentLanguage]
  );

  const handleCompanySave = async () => {
    if (!companyName.trim()) {
      toast.error("El nombre de empresa es obligatorio para generar PDFs");
      return;
    }

    setLoadingCompany(true);
    const result = await updateUserSettings({
      company_name: companyName,
      company_tax_id: companyTaxId,
      company_address: companyAddress,
      company_email: companyEmail,
      company_phone: companyPhone,
      company_logo_url: companyLogoUrl,
    });
    setLoadingCompany(false);

    if (!result.success) {
      toast.error("No se pudieron guardar los datos de empresa", { description: result.error });
      return;
    }

    toast.success("Datos de empresa guardados");
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadCompanyLogo(formData);
    if (!result.success || !result.data?.url) {
      toast.error("No se pudo subir el logo", { description: result.error });
      return;
    }

    setCompanyLogoUrl(result.data.url);
    toast.success("Logo actualizado");
  };

  const handleProfileSave = async () => {
    setLoadingProfile(true);

    if (profileName.trim() && profileName.trim() !== userFullName) {
      const profileResult = await updateUserProfile(profileName.trim());
      if (!profileResult.success) {
        setLoadingProfile(false);
        toast.error("No se pudo actualizar el perfil", { description: profileResult.error });
        return;
      }
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setLoadingProfile(false);
        toast.error("Completa los 3 campos de contraseña");
        return;
      }

      if (newPassword.length < 8) {
        setLoadingProfile(false);
        toast.error("La nueva contraseña debe tener al menos 8 caracteres");
        return;
      }

      if (newPassword !== confirmPassword) {
        setLoadingProfile(false);
        toast.error("La confirmación de contraseña no coincide");
        return;
      }

      const passwordResult = await updateUserPassword(currentPassword, newPassword);
      if (!passwordResult.success) {
        setLoadingProfile(false);
        toast.error("No se pudo cambiar la contraseña", { description: passwordResult.error });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoadingProfile(false);
    toast.success("Perfil actualizado");
  };

  const handlePersonalizationSave = async () => {
    setLoadingPersonalization(true);
    const result = await updateUserSettings({
      accent_color: accentColor,
      document_language: documentLanguage,
    });
    setLoadingPersonalization(false);

    if (!result.success) {
      toast.error("No se pudo guardar la personalización", { description: result.error });
      return;
    }

    toast.success("Personalización guardada");
  };

  return (
    <Tabs defaultValue="empresa" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="empresa" className="shrink-0">Datos empresa</TabsTrigger>
        <TabsTrigger value="perfil" className="shrink-0">Perfil usuario</TabsTrigger>
        <TabsTrigger value="personalizacion" className="shrink-0">Personalización</TabsTrigger>
      </TabsList>

      <TabsContent value="empresa">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de empresa</CardTitle>
            <CardDescription>
              Se usan en encabezado y datos de emisor de facturas/presupuestos/PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Logo empresa" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="company-logo">Logo de empresa</Label>
                <Input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleLogoUpload(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de empresa *</Label>
                <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-tax-id">NIF/CIF</Label>
                <Input id="company-tax-id" value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-address">Dirección fiscal</Label>
                <Input id="company-address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Email empresa</Label>
                <Input id="company-email" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Teléfono</Label>
                <Input id="company-phone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
              </div>
            </div>

            <Button variant="gnerai" onClick={handleCompanySave} disabled={loadingCompany} className="w-full sm:w-auto">
              {loadingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="perfil">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil de usuario</CardTitle>
            <CardDescription>
              Puedes actualizar tu nombre y contraseña. El email se gestiona desde Supabase Auth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre completo</Label>
                <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={userEmail} readOnly disabled />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" /> Cambiar contraseña
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button variant="gnerai" onClick={handleProfileSave} disabled={loadingProfile} className="w-full sm:w-auto">
              {loadingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar perfil
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="personalizacion">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalización de documentos</CardTitle>
            <CardDescription>
              Ajusta color de acento e idioma de etiquetas en PDFs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Color de acento</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className={`h-7 w-7 rounded-full border ${accentColor === color ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-7 w-11 cursor-pointer rounded border border-input bg-transparent p-0"
                    aria-label="Seleccionar color"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Idioma del documento</Label>
                <Select
                  value={documentLanguage}
                  onValueChange={(value) => setDocumentLanguage(value as "es" | "en")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Vista previa</p>
              <DocumentTemplate {...previewProps} />
            </div>

            <Button variant="gnerai" onClick={handlePersonalizationSave} disabled={loadingPersonalization} className="w-full sm:w-auto">
              {loadingPersonalization ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar personalización
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
