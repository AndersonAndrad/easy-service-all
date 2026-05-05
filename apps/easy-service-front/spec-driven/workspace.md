**Objetivo**

- Tela dedicada apenas ao **cadastro (registro)** de um novo workspace, alinhada à interface `Workspace`.
- Após **criação com sucesso**, o usuário é **redirecionado** para a **listagem de workspaces**.
- Conexão de WhatsApp / QR Code / sessões fica em fluxo separado — ver `workspace-conection.md`.

**Regras — Cadastro de workspace**

- O formulário deve refletir a interface `Workspace` (campos abaixo).
- Todas as requisições autenticadas devem enviar o header `Authorization: Bearer <jwt>`.
- Em caso de **falha ao criar**: exibir toast de erro e **manter o formulário preenchido** (não limpar dados inseridos pelo usuário).
- Oferecer ação para **voltar** à listagem sem obrigar o envio.
- Formulário **centralizado** na viewport para melhor uso em desktop e mobile.

**Regras — Listagem de workspaces**

- Quando não houver itens, não exibir tabela vazia: usar **ilustração + mensagem** convidando a registrar o primeiro workspace (mantido na implementação da lista).

**Interface `Workspace` (payload de criação/atualização)**

```json
{
  "name": "string",
  "document": "string",
  "customInterface": {
    "color": "string"
  },
  "isActive": true
}
```

(`color` em formato hexadecimal `#RRGGBB` no front.)

**Critérios de aceite**

- Usuário consegue **criar** um workspace com sucesso.
- Após sucesso, ocorre **redirecionamento** para `/workspaces`.
- Falhas exibem **feedback** (toast) sem perder os dados do formulário.
- Nenhuma ação crítica sem feedback visual.

**Fluxo**

1. Usuário abre a listagem e acessa “Novo workspace”.
2. Preenche o formulário e confirma (Salvar / Criar).
3. API cria o workspace.
4. Em sucesso → redirect para listagem + toast de sucesso.
5. Conexão WhatsApp → tela dedicada na listagem (botão de conexão) conforme `workspace-conection.md`.

**Estados da tela (cadastro)**

- `idle` — editando formulário.
- `creating` — envio em andamento (loading).
- (pós-sucesso) navegação para lista; não há estado de QR nesta tela.

**Tratamento de erros**

- Erro de API: toast com mensagem; formulário permanece como estava.

**Segurança**

- JWT obrigatório nas chamadas.
- Regras de posse do workspace na API; o front reforça permissões onde aplicável (ex.: edição/exclusão na lista).

**Definition of Done (esta spec)**

- Cadastro funcional, com redirect pós-sucesso e feedbacks de erro/sucesso.
- Sem lógica de socket ou QR nesta rota.
