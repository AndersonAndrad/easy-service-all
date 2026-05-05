**Objetivo**
- Padronizar o como deve ser feita todas as chamadas do frontend para clientes externos

**Escopo**
- Arquivos de chamadas http externas

**Fluxo principal**
- Criar um arquivo básico de instancia para cada cliente externo
- Substituir/implementar em todas as chamadas externas utilizando as instancias criadas de axios

**Regras de negocio**
- Todas as chamadas http devem ser feitas pelo axios
- Todas as chamadas pelo axios devem estar usando uma instancia para cada serviço externo
- Cada serviço externo tem que ter sua própria instancia
- A base url de todos os serviços externos devem estar em um .env e também no .env-example

**Critérios de aceite**
- Ter uma instancia de axios para cada cliente externo

**Segurança**
- Todos os tokens devem partir sempre do .env da aplicação

**Definition of done**
- Todas as chamadas para clientes externos estarem utilizando a própria instancia de axios
- Não utilizar baseurl ou tokens sem pegar do .env