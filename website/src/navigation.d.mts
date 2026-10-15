/* أنواع خريطة التنقل — تُطابق src/navigation.mjs */

export interface HomeSection {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

export interface ServerPage {
  code: string;
  label: string;
  desc: string;
  emoji: string;
  grad: string;
}

export interface ChannelCategoryLink {
  slug: string;
  sourceCategory: string;
  label: string;
  desc: string;
  icon: string;
}

export interface NavLink {
  href: string;
  label: string;
  desc?: string;
  icon?: string;
}

export interface NavGroup {
  key: "home" | "servers" | "watch" | "tournaments" | "blog" | "help";
  label: string;
  match: string[];
  links: NavLink[];
  legal?: NavLink[];
}

export declare const HOME_SECTIONS: HomeSection[];
export declare const CHANNEL_CATEGORY_LINKS: ChannelCategoryLink[];
export declare const SERVER_PAGES: ServerPage[];
export declare const NAV_GROUPS: NavGroup[];
export declare const EN_PAGES: NavLink[];
export declare function activeGroupKey(path: string): string;
