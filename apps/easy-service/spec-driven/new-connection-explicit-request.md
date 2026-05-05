## 📌 SPEC — EMISSÃO CONTROLADA DE `new-connection` (SOMENTE POR SOLICITAÇÃO EXPLÍCITA)

---

### **Objetivo**

* Garantir que o evento `new-connection` seja emitido apenas quando houver pedido explícito de nova conexão
* Evitar emissão de QR em fluxos automáticos (bootstrap, join de workspace, cron de reconciliação, retry automático)
* Manter compatibilidade com o contrato atual de `connect()` (retorno de `qrCode` via Promise)

---

### **Escopo**

**Incluso**

* Controle de emissão de QR por flag de runtime
* Propagação da flag em recriação de socket pending (erro 515)
* Ajuste do fluxo explícito (`requestNewQrCode`, `connect`, `replaceAuth`, `reconnect`)
* Atualização de testes unitários do `BaileysService`

**Não incluso**

* Alteração de payload dos eventos socket
* Mudança de regras de persistência de auth (`creds`/`keys`)
* Alteração da API HTTP pública

---

### **Problema**

O sistema emitia `new-connection` ao receber QR em qualquer socket ativo da workspace, incluindo conexões iniciadas automaticamente. Isso gerava QR no frontend mesmo quando o usuário não havia solicitado nova conexão.

---

### **Decisão técnica**

Introduzir controle explícito por sessão em memória:

```txt
SessionRuntime.emitNewConnectionQr: boolean
```

Regra:

```txt
Só emitir socket "new-connection" quando emitNewConnectionQr === true
```

---

### **Modelo de runtime (novo comportamento)**

```ts
type SessionRuntime = {
  workspaceId: string;
  sessionId: string;
  lastEmittedQr: string | null;
  saveDebounceTimer: ReturnType<typeof setTimeout> | null;
  messageUpsertListenerAttached: boolean;
  emitNewConnectionQr: boolean;
  getKeyBlob: () => Record<string, Record<string, unknown>>;
};
```

---

### **Fluxo principal**

#### 1. Fluxos automáticos (NÃO emitem `new-connection`)

* `registerWorkspaceConnection` (quando socket abre por subscribe/join)
* `onApplicationBootstrap` (load inicial)
* cron `reconcileWhatsappSessionsNotConnected`
* `internalOpenSocketFromRepo`
* reconnect agendado pós-disconnect

Todos usam padrão:

```txt
emitNewConnectionQr = false
```

---

#### 2. Fluxos explícitos (PODEM emitir `new-connection`)

* `requestNewQrCode(workspaceId)`
* `connect(session)`
* `reconnect(session)` (via `connect`)
* `replaceAuth(session)` (via `connect`)

Todos passam:

```txt
emitNewConnectionQr = true
```

---

#### 3. Recebimento de QR (`handleConnectionUpdate`)

Comportamento:

* Sempre atualiza `lastEmittedQr` para deduplicação local
* Sempre resolve `connectionOutcomes` quando existir (`{ qrCode: qr }`)
* Só emite para room quando permitido:

```ts
if (rt.emitNewConnectionQr) {
  this.socketService.emit(workspaceId, 'new-connection', { qr });
}
```

---

#### 4. Restart pending por `DisconnectReason.restartRequired` (515)

Ao reiniciar socket pending:

* Recuperar `rt.emitNewConnectionQr` da runtime anterior
* Recriar pending socket preservando a mesma flag

Objetivo:

```txt
Não promover emissão de QR por acidente durante restart técnico
```

---

#### 5. Promoção pending → sessão real após scan

Quando o pending vira sessão persistida:

```txt
runtime da sessão real deve iniciar com emitNewConnectionQr = false
```

Motivo:

```txt
Após pareamento concluído, não há motivo para continuar broadcast de QR dessa sessão
```

---

### **Alterações implementadas**

* `SessionRuntime` ganhou `emitNewConnectionQr`
* `startPendingQrConnection(workspaceId, persistedAuth?, emitNewConnectionQr = false)`
* `internalOpenSocket(session, options?: { emitNewConnectionQr?: boolean })`
* `handleConnectionUpdate` passou a condicionar emissão de `new-connection`
* `restartPendingQrSocket` preserva a flag no restart 515
* `createWhatsappSessionAfterQrScan` inicializa runtime real com `emitNewConnectionQr: false`
* `requestNewQrCode` passou a abrir socket com emissão habilitada
* `connect` passou a abrir socket com emissão habilitada

---

### **Regras de negócio**

* QR pode ser gerado internamente sem obrigar emissão no socket room
* Emissão de `new-connection` depende de intenção explícita do usuário
* Fluxos automáticos devem ser silenciosos para QR
* Deduplicação de QR (`lastEmittedQr`) continua obrigatória
* Contrato de `connect()` deve continuar retornando `qrCode` quando disponível

---

### **Critérios de aceite**

* `registerWorkspaceConnection` não gera `new-connection` automaticamente
* bootstrap de sessões não gera `new-connection`
* cron de reconciliação não gera `new-connection`
* `requestNewQrCode` gera `new-connection` com `{ qr }`
* `connect`/`reconnect`/`replaceAuth` geram `new-connection` quando necessário
* restart 515 de pending mantém comportamento de emissão anterior
* evento duplicado com mesmo QR continua bloqueado

---

### **Testes**

Atualizações em `baileys.service.spec.ts`:

* Novo teste garantindo que pending iniciado por registro não emite `new-connection`
* Testes de QR que esperam emissão agora forçam fluxo explícito com `requestNewQrCode('w-1')`
* Cenário de deduplicação de QR permanece validado

---

### **Observabilidade**

Logs existentes de `Baileys.qr.updated` permanecem úteis para rastrear QR recebido, mesmo quando emissão no room não ocorre.

Sugestão de leitura operacional:

```txt
QR recebido + sem evento de room pode ser comportamento esperado (fluxo automático)
```

---

### **Riscos e mitigação**

**Risco**

* Confundir ausência de `new-connection` com falha de conexão

**Mitigação**

* Manter rastreamento por logs de QR atualizado
* Direcionar frontend para acionar `requestNewQrCode` quando precisar exibir QR

---

### **Fases de implementação**

1. Introduzir flag `emitNewConnectionQr` na runtime
2. Propagar flag na abertura de sockets (`pending` e `normal`)
3. Condicionar emissão no `handleConnectionUpdate`
4. Preservar flag no restart 515 de pending
5. Resetar flag na sessão real após pareamento
6. Ajustar testes unitários para fluxo explícito

---

### **Definition of Done**

* Emissão de `new-connection` ocorre somente por solicitação explícita
* Fluxos automáticos não poluem room com QR
* Contrato atual de conexão (retorno de `qrCode`) permanece íntegro
* Testes unitários refletem o novo comportamento
* Regras de deduplicação e restart técnico seguem estáveis

