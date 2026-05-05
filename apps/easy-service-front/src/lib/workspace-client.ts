import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";
import { isAxiosError } from "axios";
import { authConfig, pickStr } from "@easy-service/shared";
import type {
  Workspace,
  WorkspaceListParams,
  WorkspaceListResult,
  WorkspaceWriteBody,
  WhatsappSessionRow,
} from "@easy-service/shared";

export type {
  Workspace,
  WorkspaceListParams,
  WorkspaceListResult,
  WorkspaceWriteBody,
  WhatsappSessionRow,
};

function pickBoolean(
  o: Record<string, unknown>,
  keys: string[],
  fallback: boolean
): boolean {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "boolean") return v;
  }
  return fallback;
}

function pickCustomInterfaceColor(o: Record<string, unknown>): string {
  const raw = o.customInterface;
  if (raw && typeof raw === "object") {
    const color = (raw as Record<string, unknown>).color;
    if (typeof color === "string" && color.length > 0) return color;
  }
  return pickStr(o, ["customInterfaceColor", "color"], "blue");
}

function pickCreatedAtIso(o: Record<string, unknown>): string {
  const v = o.createdAt ?? o.created_at ?? o.created;
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  if (typeof v === "string" && v.length > 0) {
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    return v;
  }
  return new Date(0).toISOString();
}

function pickWorkspaceId(o: Record<string, unknown>): string {
  for (const k of ["id", "_id", "workspaceId"]) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  const raw = o._id ?? o.id;
  if (raw && typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const bson = raw as Record<string, unknown>;
    const oid = bson.$oid;
    if (typeof oid === "string" && oid.length > 0) return oid;
  }
  return "";
}

function pickWorkspaceName(o: Record<string, unknown>): string {
  const fromKeys = pickStr(o, ["name", "title"]);
  if (fromKeys) return fromKeys;
  const n = o.name;
  if (typeof n === "number" && Number.isFinite(n)) return String(n);
  return "";
}

export function normalizeWorkspace(raw: unknown): Workspace | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickWorkspaceId(o);
  const name = pickWorkspaceName(o);
  if (!id || !name) return null;
  const ownerSub = pickStr(o, [
    "userOwnerId",
    "ownerSub",
    "owner_sub",
    "ownerId",
    "owner_id",
    "userId",
    "user_id",
  ]);
  return {
    id,
    name,
    document: pickStr(o, ["document", "documentNumber", "taxId", "cnpj"]),
    createdAt: pickCreatedAtIso(o),
    isActive: pickBoolean(o, ["isActive", "active"], true),
    customInterface: {
      color: pickCustomInterfaceColor(o),
    },
    ownerSub,
  };
}

function extractListPayload(data: unknown): { rows: unknown[]; total: number } {
  if (data === null || data === undefined) {
    return { rows: [], total: 0 };
  }
  if (Array.isArray(data)) {
    return { rows: data, total: data.length };
  }
  if (typeof data !== "object") {
    return { rows: [], total: 0 };
  }
  const o = data as Record<string, unknown>;
  const totalNum = (k: string): number | null => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  let total =
    totalNum("total") ??
    totalNum("totalCount") ??
    totalNum("count") ??
    0;

  const infoRaw = o.info;
  if (infoRaw && typeof infoRaw === "object") {
    const info = infoRaw as Record<string, unknown>;
    const fromInfo = info.totalItems;
    if (typeof fromInfo === "number" && Number.isFinite(fromInfo)) {
      total = fromInfo;
    }
  }

  let rawItems: unknown =
    o.items ??
    o.workspaces ??
    o.results ??
    null;

  if (!Array.isArray(rawItems)) {
    const dataField = o.data;
    if (Array.isArray(dataField)) {
      rawItems = dataField;
    } else if (dataField && typeof dataField === "object") {
      const inner = (dataField as Record<string, unknown>).items;
      if (Array.isArray(inner)) {
        rawItems = inner;
      }
    }
  }

  const rows = Array.isArray(rawItems) ? rawItems : [];
  return { rows, total };
}

export async function listWorkspaces(
  accessToken: string,
  params: WorkspaceListParams
): Promise<WorkspaceListResult> {
  try {
    const response = await publicApiClient.get<unknown>("/workspaces", {
      ...authConfig(accessToken),
      params: {
        page: params.page,
        pageSize: params.pageSize,
        ...(params.search.trim() ? { search: params.search.trim() } : {}),
        ...(params.ownerId?.trim() ? { ownerId: params.ownerId.trim() } : {}),
      },
    });
    const { rows, total } = extractListPayload(response.data);
    const items = rows
      .map(normalizeWorkspace)
      .filter((w): w is Workspace => w !== null);
    return { items, total };
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function getWorkspace(
  accessToken: string,
  id: string
): Promise<Workspace | null> {
  try {
    const response = await publicApiClient.get<unknown>(
      `/workspaces/${encodeURIComponent(id)}`,
      authConfig(accessToken)
    );
    const data = response.data;
    const raw =
      data !== null &&
      typeof data === "object" &&
      "data" in (data as Record<string, unknown>)
        ? (data as Record<string, unknown>).data
        : data;
    return normalizeWorkspace(raw);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw new Error(await parseErrorMessage(error));
  }
}

export async function createWorkspace(
  accessToken: string,
  body: WorkspaceWriteBody
): Promise<Workspace> {
  try {
    const response = await publicApiClient.post<unknown>(
      "/workspaces",
      body,
      authConfig(accessToken)
    );
    const data = response.data;
    const raw =
      data !== null &&
      typeof data === "object" &&
      "data" in (data as Record<string, unknown>)
        ? (data as Record<string, unknown>).data
        : data;
    const w = normalizeWorkspace(raw);
    if (!w) throw new Error("Resposta inválida ao criar workspace.");
    return w;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateWorkspace(
  accessToken: string,
  id: string,
  body: WorkspaceWriteBody
): Promise<Workspace> {
  try {
    const response = await publicApiClient.patch<unknown>(
      `/workspaces/${encodeURIComponent(id)}`,
      body,
      authConfig(accessToken)
    );
    const data = response.data;
    const raw =
      data !== null &&
      typeof data === "object" &&
      "data" in (data as Record<string, unknown>)
        ? (data as Record<string, unknown>).data
        : data;
    const w = normalizeWorkspace(raw);
    if (!w) throw new Error("Resposta inválida ao atualizar workspace.");
    return w;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteWorkspace(
  accessToken: string,
  id: string
): Promise<void> {
  try {
    await publicApiClient.delete(
      `/workspaces/${encodeURIComponent(id)}`,
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

type RequestNewQrCodeResult = {
  workspaceId: string;
  status: "connecting";
};

export async function requestBaileysConnection(
  accessToken: string,
  workspaceId: string
): Promise<void> {
  try {
    await publicApiClient.post(
      `/baileys/request-connection/${encodeURIComponent(workspaceId)}`,
      undefined,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteWhatsappSession(
  accessToken: string,
  whatsappSessionId: string
): Promise<void> {
  try {
    await publicApiClient.delete(
      `/whatsapp-sessions/${encodeURIComponent(whatsappSessionId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function requestWorkspaceNewQrCode(
  accessToken: string,
  workspaceId: string
): Promise<RequestNewQrCodeResult> {
  try {
    const response = await publicApiClient.post<unknown>(
      `/baileys/workspaces/${encodeURIComponent(workspaceId)}/new-qrcode`,
      undefined,
      authConfig(accessToken)
    );
    const data = response.data;
    if (!data || typeof data !== "object") {
      throw new Error("Resposta inválida ao solicitar novo QR Code.");
    }
    const payload = data as Record<string, unknown>;
    const id = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
    const status = payload.status === "connecting" ? "connecting" : null;
    if (!id || !status) {
      throw new Error("Resposta inválida ao solicitar novo QR Code.");
    }
    return {
      workspaceId: id,
      status,
    };
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export function isWorkspaceOwner(
  workspace: Workspace,
  userSub: string | undefined
): boolean {
  if (!userSub || !workspace.ownerSub) return false;
  return workspace.ownerSub === userSub;
}

function normalizeWhatsappSession(
  raw: unknown,
  index: number
): WhatsappSessionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickStr(o, ["id", "sessionId", "_id"], `session-${index}`);
  const status = pickStr(o, ["status", "state", "connectionStatus"], "—");
  const label = pickStr(
    o,
    ["name", "phone", "jid", "deviceName", "label", "displayName"],
    id
  );
  return { id, label, status };
}

export async function listWhatsappSessionsByWorkspace(
  accessToken: string,
  workspaceId: string
): Promise<WhatsappSessionRow[]> {
  try {
    const response = await publicApiClient.get<unknown>(
      `/whatsapp-sessions/by-workspace/${encodeURIComponent(workspaceId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = response.data;
    let rows: unknown[] = [];
    if (Array.isArray(data)) {
      rows = data;
    } else if (data !== null && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const nested = o.data ?? o.items ?? o.sessions ?? o.results;
      rows = Array.isArray(nested) ? nested : [];
    }
    return rows
      .map((row, i) => normalizeWhatsappSession(row, i))
      .filter((row): row is WhatsappSessionRow => row !== null);
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}
