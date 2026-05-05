import mongoose, { Schema } from 'mongoose';

import type { Workspace } from 'src/modules/workspace/types/interfaces/workspace.interface';

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    document: { type: String, required: false },
    userOwnerId: { type: String, required: true, index: true },
    customInterface: {
      color: { type: String, required: true },
    },
    isActive: { type: Boolean, required: true, default: true },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

export const workspaceModel = mongoose.model<Workspace>('workspaces', WorkspaceSchema);
