**Objetivo**
- Deve ser criado uma tela que é acessada por um botão na listagem de workspaces
- Deve poder conectar um ou mais sessões de whatsapp a um workspace 

**Fluxo principal**
- Entrar na tela de listagem de workspace
- Ao clicar no botão de conexão deve ser navegado para a tela de conexão
- clicar para solicitar um qrcode
- deve solicitar um qrcode no endpoint baileys/request-connection/:workspaceId
- após solicitar a conexão vai passar a ser emitido uma atualização no topico workspaceid:new-connection com o payload {qr: string}
- o qrcode deve ser apresentado na tela
- após o usuário ler o qrcode vai ser recebido uma mensagem no topico "workspaceid:connected"
- caso necessário pode ser feita um delete das conexões já feitas

**Regras de negócio**
- todos os eventos devem conter loads e deve ser sempre apresentado um feedback visual para o usuário 
- o botão para solicitar uma nova conexão só pode habilitar em caso de error ou caso tenha finalizado com sucesso o fluxo
- Uma conexão só pode ser feita pelo dono daquele workspace

**Estados da aplicação**
- Estados possíveis da feature  
- Ex:
  - idle  
  - request
  - loading
  - make qrcode
  - success  
  - error  

**Critérios de aceite**
- o usuário deve conseguir solicitar um qrcode
- o qrcode deve ser apresentado em tela
- notificacoes visuais de sucesso ou error devem ser apresentadas
- usuário conseguir fazer a conexão, em caso de falha saber o porque não conseguiu
- deve listar as outras conexões do workspace, caso não tenha nenhuma deve apresentar uma mensagem amigavel informando que ainda não há nenhuma conexão feita
- deve ser possível deletar uma conexão já existente

**Contratos de API**
- GET baileys/request-connection/:workspaceId
- DELETE /whatsapp-sessions/:whatsappSessionId

**Contratos de eventos (socket / async)**
- workspaceid:new-connection com o payload {qr: string}
- "workspaceid:connected" informando que deu certo a conexão

**Tratamento de erros**
- O que acontece em falhas  
- em caso de falha deve ser apresentando visualmente para o usuário informando a mensagem correta do que está acontecendo

**Regras de UX/UI**
- apresentar ao topo o novo QRcode
- apresentar botão para solicitar novo qrcode
- apesentar listagem de todas as conexões ou uma mensagem que não há nenhuma
- apresentar feedbacks visuais para o usuário de sucesso e erro
- apresentar confirmation dialog antes de chamar o backend informando que uma vez deletado não há como recuperar apenas refazendo a conexão

**Segurança**
- Autenticação  
- Autorização  
- Validações críticas  

**Performance / Limitações**
- Rate limit  
- Tempo de resposta esperado  
- Volume de dados  


**Definition of Done**
- Deve ser possível estabelecer uma conexão
- Deve ser possível apagar uma conexão já feita
- Deve receber ter tratamento de erros e notificações de sucesso