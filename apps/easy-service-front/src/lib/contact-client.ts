import { isAxiosError } from "axios";

import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";
import { authConfig, parseDate, pickId, pickStr } from "@easy-service/shared";
import type {
  Contact,
  ContactCreateBody,
  ContactListParams,
  ContactListResult,
  ContactUpdateBody,
} from "@easy-service/shared";

export type { Contact, ContactCreateBody, ContactListParams, ContactListResult, ContactUpdateBody };

function normalizeContact(raw: unknown): Contact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const _id = pickId(o);
  if (!_id) return null;

  return {
    _id,
    workspaceId: pickStr(o, ["workspaceId", "workspace_id"]),
    phone: pickStr(o, ["phone"]),
    name: pickStr(o, ["name"]) || undefined,
    alias: pickStr(o, ["alias"]) || undefined,
    email: pickStr(o, ["email"]) || undefined,
    avatar: pickStr(o, ["avatar"]) || undefined,
    notes: pickStr(o, ["notes"]) || undefined,
    sharedFromId: pickStr(o, ["sharedFromId", "shared_from_id"]) || undefined,
    sharedByUserId: pickStr(o, ["sharedByUserId", "shared_by_user_id"]) || undefined,
    createdAt: parseDate(o, "createdAt", "created_at"),
    updatedAt: parseDate(o, "updatedAt", "updated_at"),
  };
}

function extractContactList(data: unknown): { rows: unknown[]; total: number } {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (!data || typeof data !== "object") return { rows: [], total: 0 };
  const o = data as Record<string, unknown>;

  let total = 0;
  for (const k of ["total", "totalCount", "count"]) {
    if (typeof o[k] === "number") {
      total = o[k] as number;
      break;
    }
  }

  for (const k of ["items", "contacts", "results", "data"]) {
    if (Array.isArray(o[k])) return { rows: o[k] as unknown[], total };
  }

  return { rows: [], total };
}

function unwrapData(data: unknown): unknown {
  if (
    data !== null &&
    typeof data === "object" &&
    "data" in (data as Record<string, unknown>)
  ) {
    return (data as Record<string, unknown>).data;
  }
  return data;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listContacts(
  accessToken: string,
  params: ContactListParams
): Promise<ContactListResult> {
  try {
    const res = await publicApiClient.get<unknown>("/contacts", {
      ...authConfig(accessToken),
      params: {
        page: params.page,
        pageSize: params.pageSize,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
      },
    });
    const { rows, total } = extractContactList(res.data);
    const items = rows
      .map(normalizeContact)
      .filter((c): c is Contact => c !== null);
    return { items, total };
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function getContact(
  accessToken: string,
  id: string
): Promise<Contact | null> {
  try {
    const res = await publicApiClient.get<unknown>(
      `/contacts/${encodeURIComponent(id)}`,
      authConfig(accessToken)
    );
    return normalizeContact(unwrapData(res.data));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw new Error(await parseErrorMessage(error));
  }
}

export async function createContact(
  accessToken: string,
  body: ContactCreateBody
): Promise<Contact> {
  try {
    const res = await publicApiClient.post<unknown>(
      "/contacts",
      body,
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao criar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateContact(
  accessToken: string,
  id: string,
  body: ContactUpdateBody
): Promise<Contact> {
  try {
    const res = await publicApiClient.patch<unknown>(
      `/contacts/${encodeURIComponent(id)}`,
      body,
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao atualizar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteContact(
  accessToken: string,
  id: string
): Promise<void> {
  try {
    await publicApiClient.delete(
      `/contacts/${encodeURIComponent(id)}`,
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function importContact(
  accessToken: string,
  contactId: string
): Promise<Contact> {
  try {
    const res = await publicApiClient.post<unknown>(
      "/contacts/import",
      { contactId },
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao importar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

// ─── Workspace-scoped API (correct backend endpoints) ─────────────────────────

export async function listWorkspaceContacts(
  accessToken: string,
  workspaceId: string,
  params: { page: number; pageSize: number; search?: string }
): Promise<ContactListResult> {
  try {
    const res = await publicApiClient.get<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/contacts`,
      {
        ...authConfig(accessToken),
        params: {
          page: params.page,
          pageSize: params.pageSize,
          ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        },
      }
    );
    const { rows, total } = extractContactList(res.data);
    const items = rows.map(normalizeContact).filter((c): c is Contact => c !== null);
    return { items, total };
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function createWorkspaceContact(
  accessToken: string,
  workspaceId: string,
  body: Omit<ContactCreateBody, "workspaceId">
): Promise<Contact> {
  try {
    const res = await publicApiClient.post<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/contacts`,
      body,
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao criar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateWorkspaceContact(
  accessToken: string,
  workspaceId: string,
  id: string,
  body: ContactUpdateBody
): Promise<Contact> {
  try {
    const res = await publicApiClient.patch<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/contacts/${encodeURIComponent(id)}`,
      body,
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao atualizar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteWorkspaceContact(
  accessToken: string,
  workspaceId: string,
  id: string
): Promise<void> {
  try {
    await publicApiClient.delete(
      `/workspaces/${encodeURIComponent(workspaceId)}/contacts/${encodeURIComponent(id)}`,
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function importWorkspaceContact(
  accessToken: string,
  workspaceId: string,
  contactId: string
): Promise<Contact> {
  try {
    const res = await publicApiClient.post<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/contacts/import`,
      { contactId },
      authConfig(accessToken)
    );
    const contact = normalizeContact(unwrapData(res.data));
    if (!contact) throw new Error("Resposta inválida ao importar contato.");
    return contact;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function contactDisplayName(contact: Contact): string {
  return contact.name?.trim() || contact.alias?.trim() || contact.phone || "—";
}
