/** Serializable manual blocks for the executive flipbook (server → client). */

export type ManualBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' };

export interface ManualFlipPage {
  id: string;
  kind: 'cover' | 'content';
  sectionLabel?: string;
  pageIndex: number;
  blocks: ManualBlock[];
}

export interface ExecutiveManualPayload {
  title: string;
  subtitle: string;
  pageCount: number;
  pages: ManualFlipPage[];
}
