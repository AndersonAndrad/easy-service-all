"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MaternityContractData } from "@easy-service/shared";
import { toast } from "@/components/toast/toaster";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { listWorkspaces } from "@/lib/workspace-client";
import type { Workspace } from "@/lib/workspace-client";
import { downloadBlob, generateMaternityContract } from "@/lib/contracts-client";

const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Domestic Partnership",
];

const EMPTY_FORM: MaternityContractData = {
  fullName: "",
  cpf: "",
  maritalStatus: "",
  profession: "",
  street: "",
  neighborhood: "",
  postalCode: "",
  city: "",
};

export function MaternityForm() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [form, setForm] = useState<MaternityContractData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await listWorkspaces(accessToken, { page: 1, pageSize: 100, search: "" });
      setWorkspaces(res.items);
      if (res.items.length === 1) setSelectedWorkspace(res.items[0].id);
    } catch {
      toast.error("Could not load workspaces.");
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [accessToken]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkspace) { toast.error("Select a workspace."); return; }
    if (!accessToken) return;
    setLoading(true);
    try {
      const blob = await generateMaternityContract(accessToken, selectedWorkspace, form);
      downloadBlob(blob, "maternity-contract.pdf");
      toast.success("Contract generated — download started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generating contract.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/contracts")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Contracts
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Maternity</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maternity Contract</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details to generate the contract PDF.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium mb-1">Workspace</legend>
          {loadingWorkspaces ? (
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          ) : (
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Personal details</legend>
          <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Maria Silva Santos" required />
          <Field label="CPF" name="cpf" value={form.cpf} onChange={handleChange} placeholder="123.456.789-00" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Marital status</label>
            <select
              name="maritalStatus"
              value={form.maritalStatus}
              onChange={handleChange}
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select</option>
              {MARITAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <Field label="Profession" name="profession" value={form.profession} onChange={handleChange} placeholder="Teacher" required />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Address</legend>
          <Field label="Street" name="street" value={form.street} onChange={handleChange} placeholder="Rua das Flores, 123" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Neighborhood" name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Centro" required />
            <Field label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="12345-678" required />
          </div>
          <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="São Paulo" required />
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="min-w-36">
            {loading ? "Generating PDF…" : "Generate & download PDF"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, value, onChange, placeholder, required,
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input
        id={name} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
