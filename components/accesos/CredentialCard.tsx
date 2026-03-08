"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff, Pencil, Trash2, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { updateCredential, deleteCredential } from "@/app/(dashboard)/accesos/actions";
import type { SavedCredential } from "@/types";

interface CredentialCardProps {
  credential: SavedCredential;
}

export function CredentialCard({ credential }: CredentialCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState(credential.site);
  const [email, setEmail] = useState(credential.email);
  const [password, setPassword] = useState(credential.password);
  const [notes, setNotes] = useState(credential.notes ?? "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(credential.password);
    toast.success("Contraseña copiada");
  };

  const handleSave = async () => {
    if (!site.trim() || !email.trim() || !password.trim()) {
      toast.error("Sitio, correo y contraseña son obligatorios");
      return;
    }
    setLoading(true);
    const result = await updateCredential(credential.id, {
      site: site.trim(),
      email: email.trim(),
      password: password.trim(),
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Acceso actualizado");
      setEditOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteCredential(credential.id);
    setLoading(false);
    if (result.success) toast.success("Eliminado");
    else toast.error(result.error);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{credential.site}</p>
              <p className="text-xs text-muted-foreground">{credential.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar acceso</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrará este registro de correo y contraseña. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2 py-1.5 text-sm font-mono">
              {showPassword ? credential.password : "••••••••••••"}
            </code>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {credential.notes && (
            <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
              {credential.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar acceso</DialogTitle>
            <DialogDescription>Modifica sitio, correo, contraseña o notas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sitio / servicio</Label>
              <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Ej. Supabase, Gmail" />
            </div>
            <div className="space-y-2">
              <Label>Correo o usuario</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Para qué sirve (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Panel de facturación, DNS del dominio" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
