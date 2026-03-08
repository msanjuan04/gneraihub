"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Key, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createCredential } from "@/app/(dashboard)/accesos/actions";

export function AddCredentialForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site.trim() || !email.trim() || !password.trim()) {
      toast.error("Sitio, correo y contraseña son obligatorios");
      return;
    }
    setLoading(true);
    const result = await createCredential({
      site: site.trim(),
      email: email.trim(),
      password: password.trim(),
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Acceso guardado");
      setSite("");
      setEmail("");
      setPassword("");
      setNotes("");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gnerai" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir acceso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Nuevo acceso
          </DialogTitle>
          <DialogDescription>
            Guarda correo y contraseña de un sitio. Indica para qué sirve (ej. panel, DNS). Solo tú puedes ver estos datos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Sitio / servicio *</Label>
            <Input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Ej. Supabase, Gmail, dominio.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Correo o usuario *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Contraseña *</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Para qué sirve (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Panel de facturación, DNS del dominio, correo del equipo"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
