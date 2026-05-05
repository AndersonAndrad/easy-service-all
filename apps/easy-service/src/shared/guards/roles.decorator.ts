import { SetMetadata } from '@nestjs/common';

import { Roles } from '../enums/roles.enum';

export const ROLES_METADATA_KEY = Symbol('ROLES_METADATA_KEY');

export const RolesAllowed = (...roles: Roles[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_METADATA_KEY, roles);
