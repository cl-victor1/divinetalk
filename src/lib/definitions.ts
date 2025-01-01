import { i18n } from "../../i18n-config";

export type User = {
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string;
};

export type Report = {
  filename: string;
  url: string;
};

export type TeamMember = {
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
};

export type Activity = {
  firstName: string;
  lastName: string;
  action: "COMMENT" | "ACTIVATE" | "STOP";
  ts: number;
};

export type Locale = "en" | "de" | "fr";

export interface HeaderItem {
  trigger?: string;
  label?: string;
  href?: string;
  content?: {
    main?: {
      icon: React.ReactNode;
      title: string;
      description: string;
      href: string;
    };
    items: {
      title: string;
      description: string;
      href: string;
    }[];
  };
}

export interface SiteConfig {
  header: HeaderItem[];
  // ... other config properties
}
