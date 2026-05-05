import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk — base64 overhead ~33% → ~85 KB JSON body

function authConfig(token: string) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

async function startAudioUpload(
  accessToken: string,
  conversationKey: string,
  workspaceId: string,
  mimeType: string,
): Promise<string> {
  const res = await publicApiClient.post<{ uploadId: string }>(
    "/audio/chunks/start",
    { conversationKey, workspaceId, mimeType },
    authConfig(accessToken),
  );
  return res.data.uploadId;
}

async function uploadChunk(
  accessToken: string,
  uploadId: string,
  index: number,
  total: number,
  bytes: Uint8Array,
): Promise<void> {
  // btoa on large arrays — avoid call stack overflow by using TextDecoder trick
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const data = btoa(binary);
  await publicApiClient.post(
    `/audio/chunks/${encodeURIComponent(uploadId)}`,
    { index, total, data },
    authConfig(accessToken),
  );
}

async function completeUpload(accessToken: string, uploadId: string): Promise<void> {
  await publicApiClient.post(
    `/audio/chunks/${encodeURIComponent(uploadId)}/complete`,
    {},
    authConfig(accessToken),
  );
}

export async function uploadAudioBlob(
  accessToken: string,
  blob: Blob,
  conversationKey: string,
  workspaceId: string,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> {
  try {
    const mimeType = blob.type || "audio/webm";
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE));

    const uploadId = await startAudioUpload(accessToken, conversationKey, workspaceId, mimeType);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const slice = bytes.slice(start, start + CHUNK_SIZE);
      await uploadChunk(accessToken, uploadId, i, totalChunks, slice);
      onProgress?.(i + 1, totalChunks);
    }

    await completeUpload(accessToken, uploadId);
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}
