"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MaternityContractData } from "@easy-service/shared";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { downloadBlob, generateMaternityContract } from "@/lib/contracts-client";
import { cn } from "@/lib/utils";

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
  maritalStatus: "",
  profession: "",
  street: "",
  neighborhood: "",
  postalCode: "",
  city: "",
  state: "",
  isMinor: false,
  guardianName: "",
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

/* ── Shared field style ── */
const inputCls =
  "h-10 w-full rounded-lg bg-muted/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50 disabled:opacity-50";

const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

function Field({
  label, name, value, onChange, placeholder, required, inputMode, disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className={labelCls}>{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        disabled={disabled}
        className={inputCls}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary/80">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/40" />
    </div>
  );
}

export function MaternityForm() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<MaternityContractData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, cpf: maskCpf(digits) }));
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
      if (data.erro) { toast.error("CEP não encontrado."); return; }
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
      setGenerated(true);
      toast.success("Contrato gerado — download iniciado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o contrato.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border/40 px-6 py-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground/60">
          <button
            type="button"
            onClick={() => router.push("/contracts")}
            className="transition-colors hover:text-muted-foreground"
          >
            Contratos
          </button>
          <span>/</span>
          <span className="text-foreground/80">Salário Maternidade</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Contrato Salário Maternidade</h1>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Preencha os dados abaixo para gerar o contrato em PDF.
        </p>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-6">

          {/* Two-column layout: personal + address side by side on lg */}
          <div className="grid gap-8 lg:grid-cols-2">

            {/* ── Dados pessoais ── */}
            <div>
              <SectionTitle>Dados pessoais</SectionTitle>
              <div className="flex flex-col gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label htmlFor="maritalStatus" className={labelCls}>Estado civil</label>
                    <select
                      id="maritalStatus"
                      name="maritalStatus"
                      value={form.maritalStatus}
                      onChange={handleChange}
                      required
                      className={cn(inputCls, "cursor-pointer appearance-none")}
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
                </div>

                {/* Minor toggle */}
                <label className="flex cursor-pointer select-none items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.isMinor ?? false}
                      onChange={(e) => setForm((prev) => ({ ...prev, isMinor: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-sidebar-primary" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Menor de idade</p>
                    <p className="text-[10px] text-muted-foreground/60">Exige dados do responsável legal</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Endereço ── */}
            <div>
              <SectionTitle>Endereço</SectionTitle>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <label htmlFor="postalCode" className={labelCls}>
                    CEP{cepLoading && <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/50">buscando…</span>}
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
                    className={inputCls}
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
              </div>
            </div>
          </div>

          {/* ── Responsável legal (if minor) ── */}
          {form.isMinor && (
            <div className="mt-8">
              <SectionTitle>Responsável legal</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nome completo do responsável"
                  name="guardianName"
                  value={form.guardianName ?? ""}
                  onChange={handleChange}
                  placeholder="Ana Santos"
                  required
                />
                <Field
                  label="CPF do responsável"
                  name="guardianCpf"
                  value={form.guardianCpf ?? ""}
                  onChange={handleGuardianCpfChange}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border/40 pt-6">
            {generated && (
              <button
                type="button"
                onClick={() => { setForm(EMPTY_FORM); setGenerated(false); }}
                className="inline-flex h-9 items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                Novo usuário
              </button>
            )}
            <button
              type="submit"
              disabled={loading || cepLoading}
              className="inline-flex h-9 min-w-40 items-center justify-center rounded-lg bg-sidebar-primary px-5 text-sm font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Gerando PDF…" : "Gerar e baixar PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
