import type { NavIconName } from "@/components/icons/nav-menu";

export type NavSubItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export type NavCategory = {
  id: string;
  label: string;
  icon: NavIconName;
  items: NavSubItem[];
};

const rawCategories: NavCategory[] = [
  {
    id: "attendance",
    label: "Atendimento",
    icon: "headset",
    items: [
      { href: "/chat", label: "Chat", icon: "message-square" },
      { href: "/contacts", label: "Contatos", icon: "users" },
    ],
  },
  {
    id: "contracts",
    label: "Contratos",
    icon: "file-text",
    items: [
      { href: "/contracts", label: "Gerar contrato", icon: "file-text" },
    ],
  },
  {
    id: "users",
    label: "Usuários",
    icon: "users",
    items: [
      { href: "/users", label: "Cadastro de usuário", icon: "user" },
    ],
  },
  {
    id: "workspaces",
    label: "Empresas",
    icon: "building",
    items: [{ href: "/workspaces", label: "Empresas", icon: "building" }],
  },
];

function sortCategories(categories: NavCategory[]): NavCategory[] {
  return [...categories]
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
    .map((cat) => ({
      ...cat,
      items: [...cat.items].sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR")
      ),
    }));
}

export const navigationCategories: NavCategory[] = sortCategories(rawCategories);
