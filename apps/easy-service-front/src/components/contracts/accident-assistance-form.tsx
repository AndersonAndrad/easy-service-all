"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCIDENT_TYPES, formatBrazilianPhone, normalizeTextLines, type AccidentAssistanceFormData } from "@easy-service/shared";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { downloadBlob, generateAccidentAssistanceForm } from "@/lib/contracts-client";

const EMPTY_FORM: AccidentAssistanceFormData = {
  fullName: "", cpf: "", postalCode: "", street: "", streetNumber: "", complement: "",
  neighborhood: "", city: "", state: "", phone: "", secondaryPhone: "",
  accidentType: ACCIDENT_TYPES[0], receivedSicknessBenefit: false,
  sicknessBenefitEndDate: "", caseDescription: "",
};

const inputClass = "h-10 w-full rounded-lg bg-muted/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50 disabled:opacity-50";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

type ViaCepResponse = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };

function maskCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function Field({ label, name, value, onChange, required, placeholder, inputMode }: {
  label: string; name: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return <div><label className={labelClass} htmlFor={name}>{label}</label><input className={inputClass} id={name} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} inputMode={inputMode} /></div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex items-center gap-3"><span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary/80">{children}</span><span className="h-px flex-1 bg-border/40" /></div>;
}

export function AccidentAssistanceForm() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [postalCodeLoading, setPostalCodeLoading] = useState(false);
  const words = wordCount(form.caseDescription);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const handlePostalCodeChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((current) => ({ ...current, postalCode: maskPostalCode(digits) }));
    if (digits.length !== 8) return;
    setPostalCodeLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error();
      const address = await response.json() as ViaCepResponse;
      if (address.erro) { toast.error("CEP não encontrado."); return; }
      setForm((current) => ({ ...current, street: address.logradouro ?? "", neighborhood: address.bairro ?? "", city: address.localidade ?? "", state: address.uf ?? "" }));
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setPostalCodeLoading(false);
    }
  }, []);

  function handleDescriptionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    if (wordCount(value) <= 450) setForm((current) => ({ ...current, caseDescription: value }));
  }

  function handleDescriptionBlur() {
    setForm((current) => ({ ...current, caseDescription: normalizeTextLines(current.caseDescription).trim() }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || words > 450) return;
    setLoading(true);
    try {
      const payload: AccidentAssistanceFormData = {
        ...form,
        complement: form.complement?.trim() || undefined,
        secondaryPhone: form.secondaryPhone?.trim() || undefined,
        sicknessBenefitEndDate: form.receivedSicknessBenefit ? form.sicknessBenefitEndDate : undefined,
        caseDescription: normalizeTextLines(form.caseDescription).trim(),
      };
      const pdf = await generateAccidentAssistanceForm(accessToken, payload);
      downloadBlob(pdf, `ficha_auxilio_acidente_${form.fullName.trim()}.pdf`);
      toast.success("Ficha gerada — download iniciado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar a ficha.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="flex h-full flex-col">
    <div className="border-b border-border/40 px-6 py-5">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground/60"><button type="button" onClick={() => router.push("/contracts")} className="hover:text-muted-foreground">Contratos</button><span>/</span><span className="text-foreground/80">Ficha atendimento auxílio acidente</span></div>
      <h1 className="text-xl font-semibold text-foreground">Ficha atendimento auxílio acidente</h1>
    </div>
    <div className="flex-1 overflow-y-auto"><form onSubmit={(event) => void handleSubmit(event)} className="px-6 py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div><SectionTitle>Dados pessoais</SectionTitle><div className="flex flex-col gap-4">
          <Field label="Nome completo" name="fullName" value={form.fullName} onChange={handleChange} required />
          <Field label="CPF" name="cpf" value={form.cpf} onChange={(event) => setForm((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} required inputMode="numeric" placeholder="000.000.000-00" />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Contato principal" name="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: formatBrazilianPhone(event.target.value) }))} required inputMode="tel" placeholder="(00) 00000-0000" /><Field label="Segundo contato" name="secondaryPhone" value={form.secondaryPhone ?? ""} onChange={(event) => setForm((current) => ({ ...current, secondaryPhone: formatBrazilianPhone(event.target.value) }))} inputMode="tel" placeholder="(00) 00000-0000" /></div>
        </div></div>
        <div><SectionTitle>Endereço</SectionTitle><div className="flex flex-col gap-4">
          <div><label className={labelClass} htmlFor="postalCode">CEP {postalCodeLoading && <span className="normal-case tracking-normal">buscando…</span>}</label><input className={inputClass} id="postalCode" value={form.postalCode} onChange={(event) => void handlePostalCodeChange(event)} required inputMode="numeric" placeholder="00000-000" /></div>
          <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Field label="Logradouro" name="street" value={form.street} onChange={handleChange} required /></div><Field label="Número" name="streetNumber" value={form.streetNumber} onChange={handleChange} required /></div>
          <Field label="Complemento" name="complement" value={form.complement ?? ""} onChange={handleChange} />
          <Field label="Bairro" name="neighborhood" value={form.neighborhood} onChange={handleChange} required />
          <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Field label="Cidade" name="city" value={form.city} onChange={handleChange} required /></div><Field label="UF" name="state" value={form.state} onChange={handleChange} required /></div>
        </div></div>
      </div>
      <div className="mt-8"><SectionTitle>Dados do caso</SectionTitle><div className="grid gap-5 lg:grid-cols-2">
        <div><label className={labelClass} htmlFor="accidentType">Tipo de acidente</label><select className={inputClass} id="accidentType" name="accidentType" value={form.accidentType} onChange={handleChange}>{ACCIDENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
        <div><span className={labelClass}>Recebeu Auxílio Doença?</span><div className="flex h-10 items-center gap-6">{[true, false].map((value) => <label key={String(value)} className="flex items-center gap-2 text-sm"><input type="radio" checked={form.receivedSicknessBenefit === value} onChange={() => setForm((current) => ({ ...current, receivedSicknessBenefit: value, sicknessBenefitEndDate: value ? current.sicknessBenefitEndDate : "" }))} />{value ? "Sim" : "Não"}</label>)}</div></div>
        {form.receivedSicknessBenefit && <div><label className={labelClass} htmlFor="sicknessBenefitEndDate">Data da cessação do Auxílio Doença</label><input className={inputClass} type="date" id="sicknessBenefitEndDate" name="sicknessBenefitEndDate" value={form.sicknessBenefitEndDate ?? ""} onChange={handleChange} required /></div>}
        <div className="lg:col-span-2"><div className="flex justify-between"><label className={labelClass} htmlFor="caseDescription">Descrição do caso</label><span className="text-xs text-muted-foreground">{words}/450 palavras</span></div><textarea className="min-h-48 w-full resize-y rounded-lg bg-muted/60 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50" id="caseDescription" name="caseDescription" value={form.caseDescription} onChange={handleDescriptionChange} onBlur={handleDescriptionBlur} required /></div>
      </div></div>
      <div className="mt-8 flex justify-end border-t border-border/40 pt-6"><button type="submit" disabled={loading || postalCodeLoading} className="inline-flex h-9 min-w-40 items-center justify-center rounded-lg bg-sidebar-primary px-5 text-sm font-medium text-sidebar-primary-foreground disabled:opacity-50">{loading ? "Gerando PDF…" : "Gerar e baixar PDF"}</button></div>
    </form></div>
  </div>;
}
