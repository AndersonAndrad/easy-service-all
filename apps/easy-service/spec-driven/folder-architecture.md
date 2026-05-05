# Arquitetura Backend - Guia

## 1. Infra

### Estrutura

* database

  * mongodb (ou outro)

    * memory → dados mockados (opcional)
    * schema → definição do modelo
    * repository → implementação concreta (ex: mongoose-user.repository.ts)
    * mappers → conversão entre schema e entity

### Regras

* Repository nunca retorna schema cru
* Sempre retornar entity ou objeto tratado

---

## 2. Modules

### Estrutura padrão (todos os módulos devem seguir)

* app

  * services
  * use-cases
  * listeners
  * consumers

* domain

  * entities
  * value-objects

* rest

  * controllers
  * presenters

* types

  * dto
  * interfaces
  * enums
  * repository

* tests

  * unit
  * integration

---

## 3. Entities

### Objetivo

* Criar objetos válidos
* Garantir consistência de dados
* Encapsular validações

### Regras

* Não acessam banco
* Não dependem de framework
* Devem ser puras (fáceis de testar)

### Responsabilidades

* Normalizar dados (email, nome)
* Validar campos
* Garantir integridade

---

## 4. Value Objects

### Objetivo

* Representar valores com regras próprias

### Exemplos

* Email
* CPF
* Money
* PhoneNumber

### Benefícios

* Evita duplicação de validação
* Reduz bugs

---

## 5. Services

### Objetivo

* Orquestrar regras de negócio
* Chamar repositories
* Coordenar entities

### Não deve

* Validar dados simples
* Montar resposta HTTP

---

## 6. Use Cases

### Objetivo

* Representar ações específicas do sistema

### Exemplos

* create-user.use-case.ts
* send-message.use-case.ts

### Benefício

* Evita services gigantes
* Melhor organização

---

## 7. Listeners / Gateways / Consumers

### Tipos

* listeners → eventos internos
* gateways → websocket
* consumers → filas (RabbitMQ, Kafka)

### Regra

* Não possuem regra de negócio
* Apenas chamam service ou use-case

---

## 8. Controllers (REST)

### Objetivo

* Receber requisição
* Validar DTO
* Chamar use-case/service
* Retornar resposta

### Regra

* Não conter regra de negócio

---

## 9. DTOs

### Objetivo

* Representar entrada e saída da API

### Regras

* Não são entities
* Não possuem lógica

---

## 10. Repository

### Estrutura

* Interface → types/repository
* Implementação → infra/database

### Regra

* Services dependem da interface, nunca da implementação

---

## 11. Mappers

### Objetivo

* Converter dados entre camadas

### Tipos

* Entity → Banco
* Banco → Entity

### Benefício

* Evita acoplamento com ORM/ODM

---

## 12. Presenters

### Objetivo

* Formatar resposta da API

### Responsabilidades

* Ocultar campos
* Transformar estrutura

---

## 13. Tests

### Tipos

* Unit → entities, services, use-cases
* Integration → controllers + banco

---

## 14. Regras Gerais

* Domain não conhece infra
* Infra conhece domain
* App orquestra tudo
* Controllers são simples
* Entities são responsáveis pela consistência

---

## 15. Estrutura Final

```
infra/
  database/
    mongodb/
      schema
      repository
      mappers
      memory

modules/
  user/
    app/
      services
      use-cases
      listeners
      consumers
    domain/
      entities
      value-objects
    rest/
      controllers
      presenters
    types/
      dto
      interfaces
      enums
      repository
    tests/
```
