import 'server-only';

import catalogData from '../data/catalog.json';
import { getCatalogEntries } from '../catalog';

export interface CatalogRagChunk {
  slug: string;
  name: string;
  category: string;
  description: string;
  researchAreas: string[];
  variants: string[];
}

const COPILOT_SYSTEM_PROMPT = `You are the TPT Peptides Research Co-Pilot — a catalog assistant for qualified laboratory buyers.

Rules:
- Answer ONLY using the catalog context provided below.
- Discuss compounds for in vitro / laboratory research purposes only.
- NEVER provide medical advice, dosing for humans or animals, or treatment recommendations.
- If asked for medical or dosing guidance, refuse politely and redirect to published research literature.
- If the catalog does not contain the answer, say you do not have that information in the current catalog.
- Keep responses concise, professional, and science-luxury in tone.
- Mention relevant catalog slugs when suggesting compounds (e.g. /catalog/bpc-157).`;

function buildCatalogChunks(): CatalogRagChunk[] {
  return getCatalogEntries().map((entry) => ({
    slug: entry.id,
    name: entry.name,
    category: entry.category,
    description: entry.description,
    researchAreas: entry.researchAreas,
    variants: entry.variants.map((variant) => variant.dose),
  }));
}

function scoreChunk(chunk: CatalogRagChunk, tokens: string[]): number {
  const haystack = [
    chunk.name,
    chunk.category,
    chunk.description,
    chunk.researchAreas.join(' '),
    chunk.variants.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

export function selectCatalogContext(query: string, limit = 6): CatalogRagChunk[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  const chunks = buildCatalogChunks();
  if (tokens.length === 0) {
    return chunks.slice(0, limit);
  }

  return [...chunks]
    .sort((a, b) => scoreChunk(b, tokens) - scoreChunk(a, tokens))
    .filter((chunk) => scoreChunk(chunk, tokens) > 0)
    .slice(0, limit);
}

export function formatCatalogContext(chunks: CatalogRagChunk[]): string {
  if (chunks.length === 0) {
    return 'No matching catalog entries.';
  }

  return chunks
    .map(
      (chunk) =>
        `- ${chunk.name} (/catalog/${chunk.slug})\n  Category: ${chunk.category}\n  Description: ${chunk.description}\n  Research areas: ${chunk.researchAreas.join(', ')}\n  Variants: ${chunk.variants.join(', ')}`
    )
    .join('\n\n');
}

export function getCopilotSystemPrompt(context: string): string {
  return `${COPILOT_SYSTEM_PROMPT}\n\n--- CATALOG CONTEXT ---\n${context}\n--- END CONTEXT ---`;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateCopilotReply(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const contextChunks = selectCatalogContext(params.question);
  const systemPrompt = getCopilotSystemPrompt(formatCatalogContext(contextChunks));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...params.history.slice(-6),
        { role: 'user', content: params.question },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('Empty response from OpenAI');
  }

  return reply;
}

/** Static export count for admin status panels. */
export const CATALOG_COMPOUND_COUNT = catalogData.length;
