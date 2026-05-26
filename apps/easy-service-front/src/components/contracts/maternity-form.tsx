"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MaternityContractData } from "@easy-service/shared";
import { toast } from "@/components/toast/toaster";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { downloadBlob, generateMaternityContract } from "@/lib/contracts-client";

const MARITAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "Solteiro(a)", label: "Solteiro(a)" },
  { value: "Casado(a)", label: "Casado(a)" },
  { value: "Divorciado(a)", label: "Divorciado(a)" },
  { value: "Viúvo(a)", label: "Viúvo(a)" },
  { value: "União Estável", label: "União Estável" },
];

const EMPTY_FORM: MaternityContractData = {
  fullName: "",
  cpf: "",
  rg: "",
  maritalStatus: "",
  profession: "",
  street: "",
  neighborhood: "",
  postalCode: "",
  city: "",
  state: "",
  isMinor: false,
  guardianName: "",
  guardianRg: "",
  guardianCpf: "",
};

function maskCpf(digits: string): string {
  return digits
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCep(digits: string): string {
  return digits.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

function maskRg(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 9);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1-$2");
}

type ViaCepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function fetchAddressByCep(cep: string): Promise<ViaCepResponse> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) throw new Error("Falha ao consultar o CEP.");
  return res.json() as Promise<ViaCepResponse>;
}

export function MaternityForm() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<MaternityContractData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, cpf: maskCpf(digits) }));
  }

  function handleRgChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, rg: maskRg(e.target.value) }));
  }

  function handleGuardianRgChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, guardianRg: maskRg(e.target.value) }));
  }

  function handleGuardianCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, guardianCpf: maskCpf(digits) }));
  }

  const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, postalCode: maskCep(digits) }));

    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const data = await fetchAddressByCep(digits);
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        street: data.logradouro ?? prev.street,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.localidade ?? prev.city,
        state: data.uf ?? prev.state,
      }));
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    try {
      const blob = await generateMaternityContract(accessToken, form);
      const filename = `CONTRATO E PROCURAÇÃO - ${form.fullName.toUpperCase()}.pdf`;
      downloadBlob(blob, filename);
      toast.success("Contrato gerado — download iniciado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o contrato.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/contracts")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Contratos
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Maternidade</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contrato de Maternidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados para gerar o contrato em PDF.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Dados pessoais</legend>

          <Field
            label="Nome completo"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Maria Silva Santos"
            required
          />

          <Field
            label="CPF"
            name="cpf"
            value={form.cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            inputMode="numeric"
            required
          />

          <Field
            label="RG"
            name="rg"
            value={form.rg ?? ""}
            onChange={handleRgChange}
            placeholder="00.000.000-0"
            inputMode="numeric"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Estado civil</label>
            <select
              name="maritalStatus"
              value={form.maritalStatus}
              onChange={handleChange}
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione</option>
              {MARITAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <Field
            label="Profissão"
            name="profession"
            value={form.profession}
            onChange={handleChange}
            placeholder="Professora"
            required
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isMinor ?? false}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isMinor: e.target.checked }))
              }
              className="h-4 w-4 rounded border"
            />
            <span className="text-sm font-medium">Contratante é menor de idade</span>
          </label>
        </fieldset>

        {form.isMinor && (
          <fieldset className="flex flex-col gap-4 rounded-lg border border-amber-200 p-4">
            <legend className="px-1 text-sm font-medium">Responsável legal</legend>

            <Field
              label="Nome completo do responsável legal"
              name="guardianName"
              value={form.guardianName ?? ""}
              onChange={handleChange}
              placeholder="Ana Santos"
              required
            />

            <Field
              label="RG do responsável legal"
              name="guardianRg"
              value={form.guardianRg ?? ""}
              onChange={handleGuardianRgChange}
              placeholder="00.000.000-0"
              inputMode="numeric"
              required
            />

            <Field
              label="CPF do responsável legal"
              name="guardianCpf"
              value={form.guardianCpf ?? ""}
              onChange={handleGuardianCpfChange}
              placeholder="000.000.000-00"
              inputMode="numeric"
              required
            />
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Endereço</legend>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="postalCode" className="text-sm font-medium">
              CEP{cepLoading && <span className="ml-2 text-xs text-muted-foreground">Buscando…</span>}
            </label>
            <input
              id="postalCode"
              name="postalCode"
              value={form.postalCode}
              onChange={(e) => void handleCepChange(e)}
              placeholder="00000-000"
              inputMode="numeric"
              required
              disabled={cepLoading}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>

          <Field
            label="Logradouro"
            name="street"
            value={form.street}
            onChange={handleChange}
            placeholder="Rua das Flores, 123"
            required
          />

          <Field
            label="Bairro"
            name="neighborhood"
            value={form.neighborhood}
            onChange={handleChange}
            placeholder="Centro"
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field
                label="Cidade"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="São Paulo"
                required
              />
            </div>
            <Field
              label="UF"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="SP"
              required
            />
          </div>
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || cepLoading} className="min-w-44">
            {loading ? "Gerando PDF…" : "Gerar e baixar PDF"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, value, onChange, placeholder, required, inputMode,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
