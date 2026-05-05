# 📌 Chat Atendimento - Spec Driven (Versão Evoluída)

---

## 1. Objetivo

Criar um módulo de atendimento via chat (estilo WhatsApp Web multi-tenant), permitindo:

- Visualização de conversas por workspace
- Envio e recebimento de mensagens em tempo real
- Gestão de atendimentos (status, prioridade, anotações)
- Integração com sessões de WhatsApp

---

## 2. Escopo

### Incluso

- Tela de atendimento (chat)
- Listagem de conversas
- Envio/recebimento de mensagens (texto, áudio, arquivo)
- Integração via socket
- Anotações por atendimento
- Classificação e labels
- Busca de atendimentos e mensagens

### NÃO incluso

- Módulo de autenticação
- Gestão de usuários/workspaces
- Configuração de WhatsApp session (QR, conexão)

---

## 3. Arquitetura

### Backend

Separação obrigatória:

#### 1. Message Gateway (Realtime)

- WebSocket (Socket.IO ou WS)
- Responsável por:
  - emitir mensagens
  - receber eventos
  - mapear usuário → workspace

#### 2. Chat Service

- Regras de negócio:
  - mensagens
  - conversas
  - status
  - validações

#### 3. Persistence (MongoDB)

Collections:

- conversations
- messages
- annotations
- clients

---

### Frontend

Estrutura:

- Sidebar (lista de atendimentos)
- Chat (mensagens)
- Details panel (cliente + anotações)

---

## 4. Modelagem de Dados

### Conversation

```ts
{
  _id: string;
  createdAt: Date;
  conversationKey: string;
  participants: {
    attendant: {
      name: string;
      phone: string;
    };
    client: {
      name: string;
      phone: string;
      customName?: string;
    };
  };
  notations: Notation[]
}
```

---

### Message

```ts
{
  _id: string;
  createdAt: Date;
  conversationKey: string;
  payload: any;
  type: MessageType;
  attendant: {
    name: string;
    phone: string;
  }
  client: {
    name: string;
    phone: string;
  }
}
```

---

### Annotation

```ts
{
  _id: string;
  conversationId: string;
  workspaceId: string;

  createdBy: string;

  content: string;

  createdAt: number;
  updatedAt?: number;
}
```

---

### Client

```ts
{
  _id: string;
  workspaceId: string;

  name?: string;
  phone: string;
  document?: string;

  createdAt: number;
}
```

---

## 5. Fluxo Principal

1. Usuário loga
2. Front conecta no socket
3. Backend registra usuário nos workspaces
4. Front busca conversas
5. Usuário abre conversa
6. Backend retorna últimas 25 mensagens
7. Nova mensagem chega (WhatsApp ou frontend)
8. Backend salva e emite via socket
9. Front atualiza automaticamente

---

## 6. Regras de Negócio

### Permissão

- Usuário só acessa conversas do seu workspace

### Mensagens

- Texto → livre
- Áudio → máximo 40 segundos
- Arquivo → máximo 15MB
- Links → sanitizados

### Status de Atendimento

- > 5 minutos sem resposta → laranja
- > 10 minutos → vermelho

### Não lidas

- Incrementa ao receber mensagem
- Zera ao abrir conversa

### Anotações

- Editável até 24h
- Apenas criador pode editar

### Busca

Ordem:

1. Nome do cliente
2. Mensagens

---

## 7. Realtime (Socket)

### Eventos client → server

- SEND_MESSAGE
- MARK_AS_READ
- JOIN_WORKSPACE
- JOIN_CONVERSATION

### Eventos server → client

- NEW_MESSAGE
- UPDATE_CONVERSATION
- UNREAD_COUNT_UPDATED
- CONNECTION_STATUS

### Rooms

- workspace:{id}
- conversation:{id}

---

## 8. Integração WhatsApp

Fluxo:

1. Mensagem chega via WhatsApp
2. Backend identifica cliente
3. Identifica workspace
4. Cria/atualiza:
   - conversation
   - message
5. Emite via socket

---

## 9. API

### Conversations

- GET /conversations/by-workspace
- GET /conversations/:id/messages

### Messages

- POST /messages/send

### Client

- POST /clients
- PUT /clients/:id

### Annotation

- POST /annotations/:conversationId
- PATCH /annotations/:id
- DELETE /annotations/:id

---

## 10. Critérios de Aceite

- Atualização em tempo real sem refresh
- Contador de mensagens não lidas funcionando
- Status (laranja/vermelho) funcionando
- Ordenação dinâmica de atendimentos
- Download de arquivos funcionando
- Anotações editáveis corretamente
- Envio de mensagens (texto, áudio, arquivo)
- Interface responsiva (mobile)

---

## 11. Pontos Críticos

### Socket

- Deve reconectar automaticamente
- Deve reentrar nas rooms

### Banco

Criar índices:
conversation: workspaceId + lastMessageAt  
message: conversationId + createdAt

### Performance

- Usar cursor pagination
- NÃO usar skip

### Arquitetura

- Separar:
  - WhatsApp handler
  - Socket gateway
  - Service

---

## 12. Plano de Execução

### Fase 1

- Criar models
- Criar banco
- Criar endpoints básicos

### Fase 2

- Implementar socket
- Conectar frontend

### Fase 3

- Integrar WhatsApp

### Fase 4

- Melhorias UX + performance

---

## 13. Resultado Esperado

- Sistema multi-tenant funcional
- Mensagens em tempo real
- Escalável
- Base pronta para automações futuras (IA, bots, etc)
