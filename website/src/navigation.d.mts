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
  /**
   * معرّف البطولة في مصدر المباريات (مثل "eng.1") — إن وُجد يُعرض شعار البطولة
   * من src/lib/league-icons.mjs بدل الإيموجي، وإلا بديل محايد (كأس).
   */
  league?: string;
}

export interface NavGroup {
  key: "home" | "servers" | "matches" | "match-center" | "blog" | "help";
  label: string;
  match: string[];
  links: NavLink[];
  legal?: NavLink[];
  /** أقسام فرعية اختيارية داخل المجموعة — تُستخدم في لوحة سطح المكتب */
  sections?: NavSection[];
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

export declare const HOME_SECTIONS: HomeSection[];
export declare const CHANNEL_CATEGORY_LINKS: ChannelCategoryLink[];
export declare const SERVER_PAGES: ServerPage[];
export declare const NAV_GROUPS: NavGroup[];
export declare const EN_PAGES: NavLink[];
export declare function activeGroupKey(path: string): string;
