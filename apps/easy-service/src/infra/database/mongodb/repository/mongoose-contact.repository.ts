import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import type { Contact } from 'src/modules/contact/types/interface/contact.interface';
import type { ContactFindParams, ContactRepository } from 'src/modules/contact/types/repository/contact.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';
import { contactModel } from '../schema/contact.schema';

@Injectable()
export class MongooseContactRepository implements ContactRepository {
  async upsertByPhone(input: { workspaceId: string; phone: string; name?: string; whatsappId?: string }): Promise<Contact> {
    const updateOp: Record<string, unknown> = {
      $setOnInsert: { workspaceId: input.workspaceId, phone: input.phone, name: input.name },
    };
    if (input.whatsappId) {
      updateOp.$set = { whatsappId: input.whatsappId };
    }
    const result = await contactModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, phone: input.phone },
      updateOp,
      { upsert: true, returnDocument: 'after' },
    );
    return parseDocumentToObj(result) as Contact;
  }

  async create(input: Omit<Contact, '_id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    try {
      const created = await contactModel.create(input);
      return parseDocumentToObj(created) as Contact;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new BadRequestException('A contact with this phone already exists in this workspace');
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Contact | null> {
    const doc = await contactModel.findById(id);
    return doc ? (parseDocumentToObj(doc) as Contact) : null;
  }

  async findByPhoneAndWorkspace(phone: string, workspaceId: string): Promise<Contact | null> {
    const doc = await contactModel.findOne({ phone, workspaceId });
    return doc ? (parseDocumentToObj(doc) as Contact) : null;
  }

  async find(workspaceId: string, params: ContactFindParams): Promise<PaginatedResponse<Contact>> {
    const { page, pageSize, search } = params;
    const skip = (page - 1) * pageSize;

    const filter: Record<string, unknown> = { workspaceId };
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { alias: regex }, { phone: regex }, { email: regex }];
    }

    const [docs, totalItems] = await Promise.all([
      contactModel.find(filter).sort({ name: 1, phone: 1 }).skip(skip).limit(pageSize).exec(),
      contactModel.countDocuments(filter),
    ]);

    return {
      items: docs.map((doc) => parseDocumentToObj(doc) as Contact),
      info: { currentPage: page, totalItems, itemsPerPage: pageSize },
    };
  }

  async update(id: string, input: Partial<Omit<Contact, 'id' | 'workspaceId' | 'createdAt'>>): Promise<Contact> {
    const updated = await contactModel.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after' });
    if (!updated) throw new NotFoundException('Contact not found');
    return parseDocumentToObj(updated) as Contact;
  }

  async delete(id: string): Promise<void> {
    await contactModel.deleteOne({ _id: id });
  }
}
