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
      { href: "/attendance", label: "Fila de espera", icon: "clock" },
    ],
  },
  {
    id: "contracts",
    label: "Contracts",
    icon: "file-text",
    items: [
      { href: "/contracts", label: "Generate contract", icon: "file-text" },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: "settings",
    items: [
      { href: "/settings/preferences", label: "Preferências", icon: "sliders" },
      { href: "/settings/profile", label: "Perfil", icon: "user" },
    ],
  },
  {
    id: "workspaces",
    label: "Workspaces",
    icon: "building",
    items: [{ href: "/workspaces", label: "Lista de workspaces", icon: "building" }],
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
