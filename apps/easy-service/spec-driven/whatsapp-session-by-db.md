## 📌 SPEC — PERSISTÊNCIA DE SESSÃO WHATSAPP (BAILEYS VIA BANCO)

---

### **Objetivo**

* Armazenar o estado de autenticação do WhatsApp (Baileys) no banco de dados
* Eliminar dependência de arquivos locais (`auth/`)
* Permitir reconexão automática independente da máquina
* Garantir suporte a múltiplas sessões por workspace

---

### **Escopo**

**Incluso**

* Persistência de `creds` e `keys` do Baileys
* Serialização segura do estado
* Reconstrução da sessão a partir do banco
* Atualização automática via `creds.update`
* Suporte a múltiplas sessões por workspace

**Não incluso**

* Lógica de mensagens
* Lógica de atendimento
* UI

---

### **Modelo de Dados**

#### Interface atualizada

```ts
export interface WhatsappSession {
  _id: string;

  workspaceId: string;

  // 🔥 NOVO — identificador único da sessão
  sessionId: string;

  name: string;
  phone?: string;

  status: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';

  auth: {
    creds: unknown; // ⚠️ serializado com BufferJSON
    keys: unknown;  // ⚠️ serializado com BufferJSON
  };

  settings: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    rateLimitPerMinute: number;
  };

  metadata?: {
    waUserId?: string | null;
    lastError?: string;
  };

  lastConnectionAt?: number;
  lastDisconnectionAt?: number;
  lastMessageAt?: number;

  isActive: boolean;

  createdAt: number;
  updatedAt: number;
}
```

---

### **Ponto crítico (obrigatório)**

```txt
creds e keys NÃO são JSON simples
```

Deve usar:

```ts
BufferJSON.replacer
BufferJSON.reviver
```

---

### **Fluxo principal**

---

#### 1. Bootstrap

* Ao iniciar aplicação:

```ts
sessions = repository.listActiveSessions()
```

* Para cada sessão:

```ts
connect(session.sessionId)
```

---

#### 2. Load do auth state

```ts
const session = await repo.findBySessionId(sessionId)

const creds = JSON.parse(JSON.stringify(session.auth.creds), BufferJSON.reviver)
const keys = JSON.parse(JSON.stringify(session.auth.keys), BufferJSON.reviver)

const state = {
  creds,
  keys: makeCacheableSignalKeyStore(keys, logger)
}
```

---

#### 3. Conexão

```ts
const sock = makeWASocket({
  auth: state
})
```

---

#### 4. Persistência automática

```ts
sock.ev.on('creds.update', async () => {
  await repo.updateBySessionId(sessionId, {
    auth: {
      creds: JSON.parse(JSON.stringify(state.creds, BufferJSON.replacer)),
      keys: JSON.parse(JSON.stringify(state.keys, BufferJSON.replacer)),
    },
    updatedAt: Date.now()
  })
})
```

---

### **Regras de negócio**

* Um workspace pode possuir múltiplas sessões simultâneas
* Cada sessão é identificada unicamente por `sessionId`
* Todas as operações devem ser baseadas em `sessionId`
* `workspaceId` deve ser utilizado apenas como agrupador
* Sessão deve ser persistida a cada atualização de credenciais
* Sistema deve ser capaz de reiniciar e reconectar automaticamente
* Não deve depender de filesystem
* Sessão inválida deve ser marcada como `failed`

---

### **Estados da sessão**

```txt
connecting → iniciando conexão
connected → conectado
reconnecting → tentando reconectar
disconnected → desconectado
failed → sessão inválida
```

---

### **Critérios de aceite**

* Múltiplas sessões por workspace são suportadas
* Sessões persistem corretamente no banco
* Aplicação reinicia e reconecta todas as sessões sem QR
* Nenhum uso de `auth/` no filesystem
* Conexão funciona em qualquer ambiente
* Sessões operam de forma independente

---

### **Tratamento de erros**

* `loggedOut` → marcar sessão como `failed`
* `restartRequired` → reconectar automaticamente
* erro desconhecido → logar e tentar reconectar
* erro em uma sessão NÃO pode impactar outras

---

### **Observabilidade**

#### Logs obrigatórios

```txt
[Baileys] Connecting sessionId=... workspaceId=...
[Baileys] Connected sessionId=... phone=...
[Baileys] Saving auth state sessionId=...
[Baileys ERROR] sessionId=... message=...
```

---

### **Performance / Limitações**

* Atualizações frequentes de `creds` (evitar writes excessivos)
* Recomenda-se debounce opcional (futuro)
* Número de sessões simultâneas depende da infraestrutura

---

### **Dependências**

* Baileys
* MongoDB
* BufferJSON
* makeCacheableSignalKeyStore

---

### **Estrutura técnica**

```txt
BaileysService
 ├── Map<sessionId, socket>
 ├── connect(sessionId)
 ├── loadAuthFromDB(sessionId)
 ├── saveAuthToDB(sessionId)
 ├── listenMessages(sessionId)
```

---

### **Fases de implementação**

1. Adicionar `sessionId` na interface
2. Ajustar repositório para suportar `findBySessionId`
3. Alterar `Map` interno para usar `sessionId`
4. Implementar `loadAuthFromDB(sessionId)`
5. Implementar `saveAuthToDB(sessionId)`
6. Substituir `useMultiFileAuthState`
7. Testar múltiplas sessões simultâneas
8. Remover filesystem completamente

---

### **Definition of Done**

* Múltiplas sessões funcionando simultaneamente
* Sessões persistidas corretamente no banco
* Reconexão funciona após restart
* Nenhum arquivo local necessário
* Sistema suporta múltiplos números por workspace

---

## 🔚 Conclusão

```txt
sessionId passa a ser a unidade real de conexão
workspaceId passa a ser apenas agrupador
```

Habilitando:

```txt
multi-sessão + escalabilidade + isolamento real
```
