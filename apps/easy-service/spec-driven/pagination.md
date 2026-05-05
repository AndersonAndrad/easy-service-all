**Objetivo**
descrição -> Padronizar o sistema como todas as páginações devem ser
resultado esperado -> Todos os retornos páginados sigam os mesmos padrões estabelecidos

**Escopo**
Esta incluso -> Unicamente os filtros páginados que estão na aplicação
O que não está incluso -> Todos os outros filtros que retornam informações de forma não páginada

**Fluxo principal**
- Ao filtrar qualquer endpoint que seja uma resposta páginada esperasse que seja passado page e pageSize como obrigatório
- Os demais campos todos serão opcionais a menos que pré-estabelecido na interface esteja que seja obrigatório
- Criar a interface em uma common/interface para paginated.interface.ts que deve conter *PaginatedResponse* e *PaginatedRequest*

**Regras de negocio**
Itens páginados devem sempre ter o mesmo retorno da *PaginatedResponse*
Filtros páginados sempre devem estender a interface *PaginatedRequest*
Endpoints que não estejam pré-estabelecido na spec-driven como páginados não devem seguir as regras de negocio aqui estabelecidas
Todos os endpoints que tiverem busca paginada devem ter dto para os filtros e os params page e pageSize devem ser validados por ClassValidator, caso errado devem retornar error
As páginações retornadas devem ser armazenados em cache onde a chave será o filtro, esse cache vai ter tempo de vida de 10 minutos passando disso será destruído para ser criado um novo assim que filtrado novamente
- Quando for disparado qualquer qualquer metodo de alteração de dados ou seja, que não seja de busca, deve ser invalidado todos os caches daquele modulo imediatamente

**Critérios de aceite**

Retornos páginados todos seguindo os padrões estabelecidos em *PaginatedResponse*

Filtros páginados sempre estendendo a interface *PaginatedRequest*

  

**Contratos de Api**

*PaginatedResponse*

```typescript

interface PaginatedResponse<TypeItem> {

  items: T[]

  info: {

    currentPage: number

    totalItems: number

    itemsPerPage: number

  }

}

```

*PaginatedRequest*

```typescript

interface PaginatedRequest {

  page: number

  pageSize: number

}

```

  

**Tratamentos de error**

Retornar resposta de error do class validator em caso de que os parâmetros de page e pageSize estejam incorretos

  

**Performance**

- em banco de dados sempre que implementado paginação a menos que a spec-driven daquele modulo solicite todos os items são limitados até 20 itens por página, não podendo ser mais que isso

- todos os resultados páginados devem ser armazenados em cache que tem tempo de vida de 10 minutos, caso passe esse tempo devem ser destruídos para serem reconstruídos, os caches devem levar em consideração não somente a página porém o filtro inteiro para retornar do cache ou criar um novo

  

**Definition of done**

- Ter páginas filtradas de forma padronizada

- Ter cache para chamada com o mesmo filtro

- Ser limitada em até no máximo a menos que outra spec-drive diga até 20 items por página