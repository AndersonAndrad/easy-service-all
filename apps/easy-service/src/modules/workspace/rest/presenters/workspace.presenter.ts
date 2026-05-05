import type { Workspace } from '../../types/interfaces/workspace.interface';

export const presentWorkspace = (workspace: Workspace): Workspace => ({ ...workspace });
