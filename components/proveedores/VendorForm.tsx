"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createVendor, updateVendor } from "@/app/(dashboard)/proveedores/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  category_default: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface VendorFormProps {
  vendor?: Vendor;
}

export function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter();
  const isEditing = !!vendor;
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vendor?.name ?? "",
      category_default: vendor?.category_default ?? "",
      website: vendor?.website ?? "",
      email: vendor?.email ?? "",
      phone: vendor?.phone ?? "",
      tax_id: vendor?.tax_id ?? "",
      address: vendor?.address ?? "",
      notes: vendor?.notes ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const result = isEditing && vendor
      ? await updateVendor(vendor.id, values)
      : await createVendor(values as any);
    setLoading(false);

    if (!result.success) {
      toast.error("No se pudo guardar el proveedor", { description: result.error });
      return;
    }

    toast.success(isEditing ? "Proveedor actualizado" : "Proveedor creado");
    const vendorId = vendor?.id ?? result.data?.id;
    if (vendorId) {
      router.push(`/proveedores/${vendorId}`);
    } else {
      router.push("/proveedores");
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vendor-name">Nombre *</Label>
        <Input id="vendor-name" {...register("name")} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-email">Email</Label>
        <Input id="vendor-email" type="email" {...register("email")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-phone">Teléfono</Label>
        <Input id="vendor-phone" {...register("phone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-tax-id">NIF/CIF</Label>
        <Input id="vendor-tax-id" {...register("tax_id")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-category">Categoría</Label>
        <Input id="vendor-category" {...register("category_default")} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vendor-address">Dirección</Label>
        <Input id="vendor-address" {...register("address")} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vendor-website">Sitio web</Label>
        <Input id="vendor-website" {...register("website")} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vendor-notes">Notas</Label>
        <textarea
          id="vendor-notes"
          {...register("notes")}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/proveedores")}>
          Cancelar
        </Button>
        <Button type="submit" variant="gnerai" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </div>
    </form>
  );
}
