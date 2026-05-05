**Objetivo**
- Deve ser possível solicitar um QrCode de conexão baseado no workspaceId
- Buscando resolver o problema de conexão com o whatsapp

**Fluxo principal**
- Solicitar que seja emitido via socket o Qrcode de conexão
- Ao solicitar o socket de seção que está recebendo a atualização deve emitir para "workspaceid:new-connection"
- Ao conectar deve ser enviado para o client no tópico "workspaceid:connected"
- caso algum error ocorra deve ser enviado no tópico de error "workspaceid:error"

**Regras de negócio**
- Deve conter apenas uma emissão no tópico por vez de connecting
- Após conectado não deve ser enviado mais esse tipo de mensagem para o socket
- Após conectar a sessão deve ser salva no backend com o ID do workspace

**Estados da aplicação**
- Idle
- aguardando
- conectando
- sucesso
- fechando conexão
- error

**Critérios de aceite**
- deve ser enviado o qrcode  pelo tópicos
- deve ter um endpoint para solicitar o envio para os tópicos onde é passado o workspaceid pela query params
- deve ser enviado pelo tópico que houve sucesso da conexão
- o token do usuário deve ser validado pelo guard
- em caso de error o deve ser emito no tópico de error

**Contratos de API**
- baileys/request-connection/:workspaceId
- envio do socket de "new-connection" -> {"qr":"string"}

**Contratos de eventos (socket / async)**
- workspaceid:new-connection ->  {"qr":"string"}
- workspaceid:connected
- workspaceid:error -> {message: string}

**Tratamento de erros**
- Em caso de error deve ser disparado uma exception 
- Em caso de error deve parar de escutar as atualizações do whatsapp
- Em caso de error deve ser finalizada a emissão nos tópicos, sendo enviado apenas para error

**Segurança**
- Deve ser validado o token do usuário através de guard
- Apenas usuários com tokens validos devem conseguir solicitar
- Apenas aplicações com o handshake aberto devem conseguir solicitar caso não tenha disparar uma exception

**Definition of Done**
- Ao solicitar um token deve ser enviado para o socket corretamente

---

## Implementação (backend)

**HTTP**
- `POST /baileys/request-connection/:workspaceId` — Bearer JWT + handshake de socket ativo + acesso ao workspace.
- `GET /baileys/request-connection?workspaceId=` — mesmo fluxo com `workspaceId` na query (critério de aceite).
- `POST /baileys/workspaces/:workspaceId/new-qrcode` — alias legado com os mesmos guards.

**Guards (ordem)**
1. `JwtAuthGuard` — valida o access token.
2. `SocketHandshakeGuard` — exige pelo menos um socket autenticado (`session:authenticate` concluído) para o `userId` do JWT (`SocketAuthenticatedPresenceService`).
3. `WorkspaceAccessGuard` — workspace existe e pertence ao usuário (ou `super_admin`).

**Socket (cliente)**
- Inscrever-se nos tópicos (mensagem `subscribe` após handshake) usando o mesmo nome da sala: `{workspaceId}:new-connection`, `{workspaceId}:connected`, `{workspaceId}:error`.
- O payload chega no evento `socket:payload` (ver módulo socket).

**Eventos emitidos pelo servidor**
- `{workspaceId}:new-connection` → `{ "qr": string }` (sem repetir o mesmo QR consecutivamente).
- `{workspaceId}:connected` → `{ "workspaceId": string }` após `connection === 'open'`; em seguida a sessão é persistida em `whatsapp_sessions` com o `workspaceId`.
- `{workspaceId}:error` → `{ "message": string }`; na fase de conexão/QR remove listeners do Baileys, encerra o socket interno e atualiza a sessão para `failed` quando existir registro.

**Exceção HTTP**
- Falha ao iniciar o cliente Baileys (ex.: erro de disco): emite no tópico `:error` e lança `BadRequestException`.
