export interface User {
  _id: string;
  createdAt: Date;
  email: string;
  cnpj: string;
  name: string;
  userName: string;
  password: string;
  roles: string[];
}
