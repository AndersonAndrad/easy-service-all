import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): string => {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
};

export const isPasswordValid = (plain: string, hash: string): boolean => {
  return bcrypt.compareSync(plain, hash);
};
