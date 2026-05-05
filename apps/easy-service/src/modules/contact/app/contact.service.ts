import { ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import { Roles } from 'src/shared/enums/roles.enum';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { ContactEntity } from '../domain/contact.entity';
import type { CreateContactDto } from '../types/dto/create-contact.dto';
import type { FindContactsQueryDto } from '../types/dto/find-contacts-query.dto';
import type { UpdateContactDto } from '../types/dto/update-contact.dto';
import type { Contact } from '../types/interface/contact.interface';
import { CONTACT_REPOSITORY, type ContactRepository } from '../types/repository/contact.repository';

type AuthContext = { userId: string; roles: Roles[] };

@Injectable({ scope: Scope.REQUEST })
export class ContactService {
  constructor(
    @Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository,
    private readonly currentAuthContext: CurrentAuthContextProvider,
  ) {}

  private getAuth(): AuthContext {
    return this.currentAuthContext.getAuthContext() as AuthContext;
  }

  private hasAdminRole(roles: Roles[]): boolean {
    return roles.includes(Roles.ADMIN) || roles.includes(Roles.SUPER_ADMIN);
  }

  /** Called internally (e.g. on message arrival) — no auth context required. */
  async getOrCreate(phone: string, workspaceId: string, name?: string): Promise<Contact> {
    const normalized = phone.trim().replace(/[^0-9+]/g, '');
    return this.contactRepository.upsertByPhone({ workspaceId, phone: normalized, name });
  }

  async create(workspaceId: string, dto: CreateContactDto): Promise<Contact> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const entity = new ContactEntity({ ...dto, workspaceId });
    return this.contactRepository.create(entity);
  }

  async find(workspaceId: string, query: FindContactsQueryDto): Promise<PaginatedResponse<Contact>> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    return this.contactRepository.find(workspaceId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
    });
  }

  async findById(id: string, workspaceId: string): Promise<Contact> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const contact = await this.contactRepository.findById(id);
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.workspaceId !== workspaceId) throw new ForbiddenException('Contact access denied');

    return contact;
  }

  async update(id: string, workspaceId: string, dto: UpdateContactDto): Promise<Contact> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const existing = await this.contactRepository.findById(id);
    if (!existing) throw new NotFoundException('Contact not found');
    if (existing.workspaceId !== workspaceId) throw new ForbiddenException('Contact access denied');

    const entity = new ContactEntity({ ...existing, ...dto, workspaceId });

    return this.contactRepository.update(id, {
      name: entity.name,
      alias: entity.alias,
      email: entity.email,
      avatar: entity.avatar,
      notes: entity.notes,
    });
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const existing = await this.contactRepository.findById(id);
    if (!existing) throw new NotFoundException('Contact not found');
    if (existing.workspaceId !== workspaceId) throw new ForbiddenException('Contact access denied');

    await this.contactRepository.delete(id);
  }

  /**
   * Import a contact from any workspace by its ID into the current workspace.
   * The caller provides the contact ID (shared out-of-band by the owner).
   * A copy is created in targetWorkspaceId with sharedFromId pointing to the source.
   */
  async importContact(contactId: string, targetWorkspaceId: string): Promise<Contact> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const source = await this.contactRepository.findById(contactId);
    if (!source) throw new NotFoundException('Source contact not found');

    // If the phone already exists in the target workspace, return the existing contact.
    const existing = await this.contactRepository.findByPhoneAndWorkspace(source.phone, targetWorkspaceId);
    if (existing) return existing;

    const entity = new ContactEntity({
      workspaceId: targetWorkspaceId,
      phone: source.phone,
      name: source.name,
      alias: source.alias,
      email: source.email,
      avatar: source.avatar,
      notes: source.notes,
      sharedFromId: source._id,
      sharedByUserId: auth.userId,
    });

    return this.contactRepository.create(entity);
  }
}
