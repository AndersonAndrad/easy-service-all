import { authConfig } from "@easy-service/shared";
import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";

export type UserResponse = {
  _id: string;
  createdAt: string;
  email: string;
  cnpj: string;
  name: string;
  userName: string;
  roles: string[];
};

export type CreateUserBody = {
  email: string;
  cnpj: string;
  name: string;
  userName: string;
  password: string;
  roles: string[];
};

export type UpdateUserBody = Partial<Omit<CreateUserBody, "password">> & {
  password?: string;
};

export async function listUsers(accessToken: string): Promise<UserResponse[]> {
  try {
    const res = await publicApiClient.get<UserResponse[]>("/users", authConfig(accessToken));
    return res.data;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function createUser(accessToken: string, body: CreateUserBody): Promise<UserResponse> {
  try {
    const res = await publicApiClient.post<UserResponse>("/users", body, authConfig(accessToken));
    return res.data;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateUser(
  accessToken: string,
  id: string,
  body: UpdateUserBody
): Promise<UserResponse> {
  try {
    const res = await publicApiClient.patch<UserResponse>(`/users/${id}`, body, authConfig(accessToken));
    return res.data;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteUser(accessToken: string, id: string): Promise<void> {
  try {
    await publicApiClient.delete(`/users/${id}`, authConfig(accessToken));
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}
