export type Status =
  | "In Progress"
  | "Live"
  | "Planning"
  | "Review"
  | "Done"
  | "Complete"
  | "Delay"
  | "Bottleneck"
  | "Escalation Required";

export type Market = "🇮🇩 ID" | "🇵🇭 PH" | "🇸🇬 SG" | "🌏 Regional";

export interface UpdateCard {
  id: string;
  title: string;
  desc?: string;
  subTasks?: { id: string; text: string; done: boolean; status?: Status; date?: string; ask?: string; linkUrl?: string; linkName?: string }[];
  link?: string;
  links?: string[];
  status: Status;
  date: string; // ISO yyyy-mm-dd
  targetDate?: string; // ISO yyyy-mm-dd
  owner: string;
  market: Market;
  updatedAt?: string; // ISO timestamp of last save
}

export type LaneId =
  | "b2b" | "sme" | "skorku"
  | "cbp_b2b" | "cbp_sme" | "cbp_d2c"
  | "ai";

export interface Announcement {
  id: string;
  type: "info" | "warning" | "alert" | "success" | "event";
  text: string;
  /** @deprecated use validTill */
  date?: string;
  /** ISO yyyy-mm-dd — announcement rolls over until this date passes */
  validTill?: string;
  /** ISO timestamp of original post creation */
  postedAt?: string;
}

export type PMStatus = "Active" | "Resign" | "Transfer";

export interface PM {
  id: string;
  name: string;
  role: string;
  status?: PMStatus;
  /** Admin-only link to this PM's OKR doc. */
  okrLink?: string;
  /** Quarter (1-4) in which the PM resigned or transferred. They are active in quarters BEFORE this. */
  exitQuarter?: 1 | 2 | 3 | 4;
  /** Effective date (w.e.f.) of Resign/Transfer status, ISO yyyy-mm-dd. */
  exitDate?: string;
  /** Date the PM became Active, ISO yyyy-mm-dd. */
  activeSince?: string;
  q: [{ c: number; t: number }, { c: number; t: number }, { c: number; t: number }, { c: number; t: number }];
}

export type MarketingStatus = "Final" | "Internal ONLY" | "Draft for Alignment" | "Archived";

export interface MarketingCard {
  id: string;
  title: string;
  type: "Campaign" | "Deck" | "Content" | "Event";
  status: MarketingStatus;
  desc?: string;
  link?: string;
  owner: string;
  updatedAt?: string; // ISO timestamp of last save
  completedDate?: string; // ISO yyyy-mm-dd, set when status === "Final"
}

export interface MeetingTodo {
  id: string;
  text: string;
  owner: string; // PM tasked
  done: boolean;
}

export interface Meeting {
  id: string;
  header: string;
  date: string; // ISO yyyy-mm-dd, date of meeting
  todos: MeetingTodo[];
  updatedAt?: string;
}

export interface State {
  // updates keyed by lane -> category -> cards
  updates: Record<LaneId, Record<string, UpdateCard[]>>;
  /** Optional renamed display labels per lane keyed by the original category key. */
  categoryNames?: Partial<Record<LaneId, Record<string, string>>>;
  /** User-added extra category keys per lane (appended after defaults). */
  extraCategories?: Partial<Record<LaneId, string[]>>;
  /** Default category keys hidden by the user, per lane. */
  removedCategories?: Partial<Record<LaneId, string[]>>;
  announcements: Announcement[];
  pms: PM[];
  marketing: MarketingCard[];
  meetings?: Meeting[];
}


export type Role = "team" | "admin" | "pmm" | null;
