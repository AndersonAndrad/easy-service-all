# 🎯 Spec-Driven: Socket Frontend Multi-Workspace

---

## 1. Objetivo

Implementar consumo de eventos via Socket.IO no frontend com suporte a múltiplos workspaces, garantindo:

* 1 única conexão global (já existente)
* Entrada dinâmica em múltiplas rooms
* Escuta correta de eventos
* Sem duplicação de conexão
* Simples de usar nas páginas

---

## 2. Contexto Atual

Você já possui:

* `SessionSocketProvider` ✔️
* Autenticação via `session:authenticate` ✔️
* Estado `isRealtimeReady` ✔️
* Socket exposto via `useSessionSocket()` ✔️

👉 Ou seja: **conexão já resolvida**

---

## 3. Problema a Resolver

Após login:

* usuário possui N workspaces
* precisa ouvir eventos de TODOS ao mesmo tempo
* sem criar múltiplos sockets

---

## 4. Arquitetura Frontend

```txt
SessionSocketProvider (global)
        ↓
useSessionSocket()
        ↓
Hook de workspace (join/leave)
        ↓
Listeners de eventos
```

---

## 5. Fluxo de Execução

### 5.1 Login

```txt
login → socket conecta → session:authenticated
```

---

### 5.2 Carregamento de workspaces

```txt
fetch workspaces → [w1, w2, w3]
```

---

### 5.3 Entrada nas rooms

Para cada workspace:

```ts
socket.emit("workspace:join", { workspaceId })
```

---

### 5.4 Escuta de eventos

```ts
socket.on("new-connection", handler)
```

---

## 6. Implementação

---

### 6.1 Hook: useWorkspaceRooms

Responsável por entrar e sair das rooms

```ts
import { useEffect } from "react";
import { useSessionSocket } from "@/contexts/session-socket-context";

export function useWorkspaceRooms(workspaceIds: string[]) {
  const { socket, isRealtimeReady } = useSessionSocket();

  useEffect(() => {
    if (!socket || !isRealtimeReady || workspaceIds.length === 0) return;

    // entra nas rooms
    workspaceIds.forEach((workspaceId) => {
      socket.emit("workspace:join", { workspaceId });
    });

    // cleanup
    return () => {
      workspaceIds.forEach((workspaceId) => {
        socket.emit("workspace:leave", { workspaceId });
      });
    };
  }, [socket, isRealtimeReady, workspaceIds]);
}
```

---

### 6.2 Hook: useWorkspaceEvents

Responsável por escutar eventos

```ts
import { useEffect } from "react";
import { useSessionSocket } from "@/contexts/session-socket-context";

export function useWorkspaceEvents(handlers: {
  onNewConnection?: (payload: any) => void;
  onError?: (payload: any) => void;
  onConnected?: (payload: any) => void;
}) {
  const { socket } = useSessionSocket();

  useEffect(() => {
    if (!socket) return;

    if (handlers.onNewConnection) {
      socket.on("new-connection", handlers.onNewConnection);
    }

    if (handlers.onError) {
      socket.on("error", handlers.onError);
    }

    if (handlers.onConnected) {
      socket.on("connected", handlers.onConnected);
    }

    return () => {
      if (handlers.onNewConnection) {
        socket.off("new-connection", handlers.onNewConnection);
      }

      if (handlers.onError) {
        socket.off("error", handlers.onError);
      }

      if (handlers.onConnected) {
        socket.off("connected", handlers.onConnected);
      }
    };
  }, [socket, handlers]);
}
```

---

### 6.3 Uso na página

```ts
const workspaceIds = workspaces.map(w => w.id);

// entra nas rooms
useWorkspaceRooms(workspaceIds);

// escuta eventos
useWorkspaceEvents({
  onNewConnection: (payload) => {
    console.log("QR recebido", payload);
  }
});
```

---

## 7. Regras Importantes

### ✔️ Fazer

* usar `useSessionSocket`
* entrar em múltiplas rooms
* escutar eventos por nome simples

---

### ❌ Não fazer

* criar `new WebSocket`
* criar `io()` fora do provider
* usar `workspaceId` no nome do evento
* filtrar manualmente por workspace no front

---

## 8. Comportamento Esperado

* usuário entra em vários workspaces
* recebe eventos simultâneos
* sem mistura indevida
* sem múltiplas conexões

---

## 9. Debug

Adicionar temporariamente:

```ts
socket.onAny((event, payload) => {
  console.log("SOCKET EVENT", event, payload);
});
```

---

## 🔚 Conclusão

Arquitetura correta:

```txt
1 socket
+ múltiplas rooms
+ eventos simples
= sistema escalável
```

Sem complexidade desnecessária.
