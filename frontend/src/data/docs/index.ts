import { ZH_CN_DOCS } from './zhCN.ts';
import { EN_US_DOCS } from './enUS.ts';
import { BUILTIN_AGENTS_DOC, PRACTICE_SKILL_PRESETS, PRACTICE_SKILL_TAG, SKILL_TEMPLATES } from './shared.ts';
import type { DocLocale, LocalizedDocs } from './types.ts';

export const DOCS_DATA: Record<DocLocale, LocalizedDocs> = {
  'zh-CN': ZH_CN_DOCS,
  'en-US': EN_US_DOCS,
};

export { BUILTIN_AGENTS_DOC, PRACTICE_SKILL_PRESETS, PRACTICE_SKILL_TAG, SKILL_TEMPLATES };
export type * from './types.ts';
