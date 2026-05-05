## 📌 SPEC — HANDSHAKE DE SESSÃO VIA SOCKET (COM ROOMS)

---

### **Objetivo**

* Estabelecer conexão persistente via socket com o backend
* Autenticar o usuário utilizando JWT
* Permitir comunicação isolada por **workspace (rooms)**
* Garantir reconexão automática em caso de falha

---

### **Escopo**

* Implementação do handshake via socket
* Validação de autenticação
* Controle de reconexão automática
* Entrada dinâmica em múltiplos workspaces
* Emissão de eventos via rooms
* Não inclui lógica de negócio

---

### **Fluxo principal**

#### 🔐 Handshake

* Usuário realiza login e obtém JWT
* Frontend conecta no socket
* Envia `session:authenticate` com token
* Backend valida token
* Em caso de sucesso responde `session:authenticated`

---

#### 🧩 Entrada em Workspaces (novo)

* Após `session:authenticated`
* Frontend obtém lista de workspaces
* Para cada workspace:

```ts
socket.emit("workspace:join", { workspaceId })
```

---

#### 📡 Emissão de eventos (novo)

* Backend emite eventos sempre usando **room do workspace**:

```ts
server.to(workspaceId).emit("new-connection", payload)
server.to(workspaceId).emit("connected", payload)
server.to(workspaceId).emit("error", payload)
```

---

#### 📥 Consumo no frontend

* Frontend escuta eventos **sem usar workspaceId no nome**:

```ts
socket.on("new-connection", handler)
socket.on("connected", handler)
socket.on("error", handler)
```

---

#### 🔁 Reconexão

* Em caso de desconexão inicia retry automático
* Após reconectar:

  * Reexecutar `session:authenticate`
  * Reentrar automaticamente em todas as rooms

---

### **Regras de negócio**

* Não permitir conexão sem token válido
* Token inválido deve encerrar conexão
* Retry máximo de 5 tentativas
* Intervalo de 20 segundos entre tentativas
* Cada conexão deve estar vinculada a um usuário
* Usuário pode estar em múltiplos workspaces simultaneamente
* Cada workspace corresponde a uma room
* Eventos NÃO devem conter `workspaceId` no nome

---

### **Estados da aplicação**

* idle
* connecting
* authenticated
* retrying
* disconnected
* error

---

### **Critérios de aceite**

* Conexão deve ser autenticada com sucesso
* Reconexão deve ocorrer automaticamente
* Limite de retry deve ser respeitado
* Usuário não autenticado não recebe eventos
* Usuário recebe eventos de múltiplos workspaces simultaneamente
* Eventos chegam apenas para workspaces conectados

---

### **Contratos de API (socket)**

#### Handshake

* session:authenticate
* session:authenticated
* session:error
* session:reconnected
* session:disconnected

---

#### Rooms (novo)

* workspace:join
* workspace:leave

```json
{
  "workspaceId": "string"
}
```

---

#### Eventos de negócio (novo)

```txt
new-connection
connected
error
```

---

### **Contratos de eventos (payload)**

```json
{
  "qr": "string"
}
```

---

### **Tratamento de erros**

* Retry automático em falhas
* Encerrar após 5 tentativas
* Log de erros no backend
* Eventos de erro devem ser emitidos via room:

```ts
server.to(workspaceId).emit("error", { message })
```

---

### **Observabilidade (logs no backend)**

#### Handshake

* Handshake concluído (`LOG`)
* Handshake rejeitado (`WARN`)
* Handshake desfeito (`LOG`)

#### Rooms (novo)

* Entrada em room:

```txt
User joined workspace room workspaceId=...
```

* Saída de room:

```txt
User left workspace room workspaceId=...
```

#### Eventos (novo)

* Emissão de evento:

```txt
Emitting event=new-connection workspaceId=...
```

---

### **Regras de UX/UI**

* Feedback visual via toast para:

  * sucesso
  * erro
  * reconexão

---

### **Segurança**

* Validar JWT no backend
* Encerrar conexão no logout
* Não permitir acesso sem autenticação
* Usuário só pode entrar em rooms dos seus workspaces

---

### **Performance / Limitações**

* Máximo de 5 retries
* Intervalo fixo de 20 segundos
* Uma única conexão por usuário
* Suporte a múltiplas rooms simultâneas

---

### **Dependências**

* Serviço de autenticação JWT
* Gateway de socket

---

### **Estrutura técnica (frontend)**

```txt
SessionSocketProvider → conexão global
↓
useWorkspaceRooms → join/leave
↓
listeners → eventos (new-connection, etc)
```

---

### **Fases de implementação**

1. Handshake (já implementado)
2. Implementar `workspace:join` e `workspace:leave`
3. Ajustar backend para emitir via room
4. Implementar entrada em múltiplos workspaces no frontend
5. Garantir rejoin automático após reconexão
6. Implementar listeners de eventos

---

### **Definition of Done**

* Conexão autenticada funcionando
* Usuário entra em múltiplos workspaces
* Eventos chegam corretamente por workspace
* Reconexão mantém rooms automaticamente
* Nenhum uso de `workspaceId` no nome do evento
* Logs permitem rastrear:

  * handshake
  * entrada em room
  * emissão de eventos
