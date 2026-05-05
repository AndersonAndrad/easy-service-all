import { BufferJSON, initAuthCreds, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import type { AuthenticationCreds, AuthenticationState, SignalDataSet, SignalKeyStore } from '@whiskeysockets/baileys';

type KeyBlob = Record<string, Record<string, unknown>>;

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}

function reviveKeyBlob(raw: unknown): KeyBlob {
  if (!isNonEmptyObject(raw)) {
    return {};
  }
  const hasGet = 'get' in raw && typeof (raw as { get?: unknown }).get === 'function';
  if (hasGet) {
    return {};
  }
  return JSON.parse(JSON.stringify(raw), BufferJSON.reviver) as KeyBlob;
}

export function serializeAuthForPersistence(creds: AuthenticationCreds, keyBlob: KeyBlob): { creds: unknown; keys: unknown } {
  return {
    creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
    keys: JSON.parse(JSON.stringify(keyBlob, BufferJSON.replacer)),
  };
}

export function buildAuthenticationStateFromPersisted(persistedCreds: unknown, persistedKeys: unknown, onKeysMutated: () => void): { state: AuthenticationState; getKeyBlob: () => KeyBlob } {
  const creds: AuthenticationCreds = isNonEmptyObject(persistedCreds) ? (JSON.parse(JSON.stringify(persistedCreds), BufferJSON.reviver) as AuthenticationCreds) : initAuthCreds();

  const keyBlob = reviveKeyBlob(persistedKeys);

  const baseKeyStore = {
    get: async (type: keyof SignalDataSet, ids: string[]) => {
      const data: Record<string, unknown> = {};
      const bucket = keyBlob[type as string] ?? {};
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(bucket, id)) {
          data[id] = bucket[id];
        }
      }
      return data;
    },
    set: async (data: SignalDataSet) => {
      for (const type of Object.keys(data) as (keyof SignalDataSet)[]) {
        const patch = data[type];
        if (!patch) continue;
        keyBlob[type as string] = keyBlob[type as string] ?? {};
        for (const id of Object.keys(patch)) {
          const v = patch[id];
          if (v == null) {
            delete keyBlob[type as string][id];
          } else {
            keyBlob[type as string][id] = v as unknown;
          }
        }
      }
      onKeysMutated();
    },
  } as SignalKeyStore;

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(baseKeyStore),
    },
    getKeyBlob: (): KeyBlob => keyBlob,
  };
}
