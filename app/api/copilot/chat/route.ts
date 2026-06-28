import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCopilotReply, isOpenAiConfigured } from '../../../../lib/copilot/catalogRag.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

const copilotRequestSchema = z.object({
  question: z.string().min(3).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(8)
    .optional(),
});

export async function POST(request: Request) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAiCoPilotEnabled')) {
    return NextResponse.json({ error: 'Research Co-Pilot is not enabled' }, { status: 404 });
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured. See /admin/rollout → Phase 5.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = copilotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
  }

  try {
    const reply = await generateCopilotReply({
      question: parsed.data.question,
      history: parsed.data.history ?? [],
    });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[copilot/chat] failed', error);
    return NextResponse.json({ error: 'Co-Pilot is temporarily unavailable' }, { status: 500 });
  }
}

export async function GET() {
  const flags = await getModuleFlags();
  return NextResponse.json({
    enabled: isModuleEnabled(flags, 'isAiCoPilotEnabled'),
    configured: isOpenAiConfigured(),
  });
}
