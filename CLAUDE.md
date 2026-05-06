# Easy Service — Project Guide

## Language
All code, files, folders, variables, functions, and comments must be written in **English only**.

## Repository structure

```
easy-service-all/
├── apps/
│   ├── easy-service/          NestJS backend
│   └── easy-service-front/    Next.js frontend
├── shared/                    @easy-service/shared — types & utils used by both apps
├── package.json               pnpm workspace root
└── pnpm-workspace.yaml
```

## Shared package (`@easy-service/shared`)

Place here anything used by **both** the backend and the frontend:

- **`shared/src/types/`** — domain interfaces (no class-validator or NestJS decorators)
- **`shared/src/utils/`** — pure utility functions with no framework dependency

The backend DTO classes (with `@IsString()` etc.) live in the backend module. They implement the shared interface via `implements`.

## Backend architecture

Every feature module follows the **contact module** pattern exactly:

```
modules/<feature>/
├── app/
│   └── <feature>.service.ts       Injectable({ scope: Scope.REQUEST })
├── rest/
│   ├── controllers/
│   │   └── <feature>.controller.ts
│   └── presenters/
│       └── <feature>.presenter.ts (omit only for binary/stream responses)
├── types/
│   ├── dto/                        class-validator DTOs
│   ├── interface/                  re-exports from @easy-service/shared
│   └── repository/                 abstract repo token + interface (when persistent)
├── domain/
│   └── <feature>.entity.ts         (when persistent)
├── tests/
│   ├── <feature>.service.spec.ts
│   ├── <feature>.controller.spec.ts
│   └── <sub>.spec.ts               one file per testable unit
└── <feature>.module.ts
```

### Guard stack order (always)
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
```

### Service rules
- Use `Scope.REQUEST` when reading `CurrentAuthContextProvider`
- Call `this.hasAdminRole(auth.roles)` before any write
- Throw `ForbiddenException` for access violations, `NotFoundException` for missing resources

### Controller rules
- Use `@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))` on mutating endpoints
- Use `@RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)` on every endpoint
- Route pattern: `/workspaces/:workspaceId/<feature>`

### Naming
- File names: `kebab-case.ts`
- Class names: `PascalCase`
- Interfaces: `PascalCase` (no `I` prefix)

## Frontend architecture

```
src/
├── app/(app)/           authenticated routes (Next.js App Router)
├── components/          client components grouped by feature
├── lib/                 API client files (one per backend resource)
├── config/navigation.ts add nav items here
└── contexts/            React contexts
```

### Adding a new contract type
1. Add the `<ContractName>Data` interface in `shared/src/types/contracts.ts`
2. Create DTO in `apps/easy-service/src/modules/contracts/types/dto/<name>-contract.dto.ts`
3. Add template in `apps/easy-service/src/modules/contracts/templates/<name>.template.ts`
4. Add method to `ContractsService` and endpoint to `ContractsController`
5. Add entry to `CONTRACT_TYPES` array in `apps/easy-service-front/src/lib/contracts-client.ts`
6. Create `apps/easy-service-front/src/app/(app)/contracts/<name>/page.tsx`
7. Create `apps/easy-service-front/src/components/contracts/<name>-form.tsx`
8. Write tests covering all new backend units

## Testing

- Every backend service, controller, and template must have a `tests/*.spec.ts` file
- Use `jest.fn()` mocks — no real DB, no real Puppeteer in unit tests
- Controller tests use `Test.createTestingModule` with guards overridden to `canActivate: true`
- Service tests instantiate the class directly with mocked dependencies

## Running the project

```bash
pnpm dev          # starts backend + frontend in parallel
pnpm build        # builds shared first, then all apps
pnpm lint         # lint all packages
```
