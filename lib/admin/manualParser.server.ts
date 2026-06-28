import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExecutiveManualPayload, ManualBlock, ManualFlipPage } from './manualTypes';

const MANUAL_PATH = path.join(process.cwd(), 'docs', 'OPERATORS_MANUAL.md');
const PAGE_CHAR_BUDGET = 1_450;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .trim();
}

function parseMarkdownToBlocks(source: string): ManualBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ManualBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.trim() === '---') {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index]?.startsWith('```')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1]!.length as 1 | 2 | 3 | 4,
        text: stripInlineMarkdown(headingMatch[2]!),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index]?.startsWith('>') ?? false)) {
        quoteLines.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const tableLines: string[] = [];
      while (index < lines.length && /^\|.+\|$/.test((lines[index] ?? '').trim())) {
        tableLines.push(lines[index]!.trim());
        index += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|[\s\-:|]+\|$/.test(row))
        .map((row) =>
          row
            .slice(1, -1)
            .split('|')
            .map((cell) => stripInlineMarkdown(cell.trim()))
        );
      if (rows.length > 0) {
        blocks.push({
          type: 'table',
          headers: rows[0] ?? [],
          rows: rows.slice(1),
        });
      }
      continue;
    }

    if (/^(\d+\.\s|-|\*)\s/.test(line.trim())) {
      const ordered = /^\d+\.\s/.test(line.trim());
      const items: string[] = [];
      while (index < lines.length && /^(\d+\.\s|-|\*)\s/.test((lines[index] ?? '').trim())) {
        items.push(stripInlineMarkdown((lines[index] ?? '').replace(/^(\d+\.\s|-|\*)\s/, '')));
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() !== '' &&
      !(lines[index] ?? '').startsWith('#') &&
      !(lines[index] ?? '').startsWith('>') &&
      !(lines[index] ?? '').startsWith('```') &&
      !(lines[index] ?? '').trim().startsWith('---') &&
      !/^\|.+\|$/.test((lines[index] ?? '').trim()) &&
      !/^(\d+\.\s|-|\*)\s/.test((lines[index] ?? '').trim())
    ) {
      paragraphLines.push(lines[index] ?? '');
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: stripInlineMarkdown(paragraphLines.join(' ')) });
  }

  return blocks;
}

function blockCharWeight(block: ManualBlock): number {
  switch (block.type) {
    case 'heading':
      return block.text.length + 40;
    case 'paragraph':
      return block.text.length + 20;
    case 'list':
      return block.items.reduce((sum, item) => sum + item.length + 12, 0);
    case 'table':
      return (
        block.headers.join('').length +
        block.rows.reduce((sum, row) => sum + row.join('').length, 0) +
        60
      );
    case 'blockquote':
      return block.text.length + 30;
    case 'code':
      return Math.min(block.text.length, 400) + 40;
    case 'hr':
      return 24;
    default:
      return 40;
  }
}

function sectionLabelFromBlocks(blocks: ManualBlock[]): string | undefined {
  const heading = blocks.find((block) => block.type === 'heading');
  return heading?.type === 'heading' ? heading.text : undefined;
}

function paginateBlocks(blocks: ManualBlock[]): ManualFlipPage[] {
  const pages: ManualFlipPage[] = [];
  let buffer: ManualBlock[] = [];
  let bufferWeight = 0;
  let pageIndex = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    pages.push({
      id: `page-${pageIndex}`,
      kind: 'content',
      sectionLabel: sectionLabelFromBlocks(buffer),
      pageIndex,
      blocks: buffer,
    });
    pageIndex += 1;
    buffer = [];
    bufferWeight = 0;
  };

  for (const block of blocks) {
    const weight = blockCharWeight(block);
    const isMajorHeading = block.type === 'heading' && block.level <= 2;

    if (buffer.length > 0 && (bufferWeight + weight > PAGE_CHAR_BUDGET || isMajorHeading)) {
      flush();
    }

    buffer.push(block);
    bufferWeight += weight;
  }

  flush();
  return pages;
}

function buildCoverPage(): ManualFlipPage {
  return {
    id: 'cover',
    kind: 'cover',
    pageIndex: 0,
    sectionLabel: 'Falconwood OS',
    blocks: [
      { type: 'heading', level: 1, text: 'Falconwood OS' },
      {
        type: 'paragraph',
        text: 'Executive Operating Manual & Partner Orientation',
      },
      {
        type: 'blockquote',
        text: 'Confidential — Super Admin & ownership partners only. Swipe or click the page edges to turn.',
      },
      {
        type: 'paragraph',
        text: 'This flipbook renders the live Operator\'s Manual from docs/OPERATORS_MANUAL.md — always current with the platform.',
      },
    ],
  };
}

export async function loadExecutiveManualPayload(): Promise<ExecutiveManualPayload> {
  const raw = await readFile(MANUAL_PATH, 'utf8');
  const blocks = parseMarkdownToBlocks(raw);
  const contentPages = paginateBlocks(blocks);
  const cover = buildCoverPage();

  const pages: ManualFlipPage[] = [
    cover,
    ...contentPages.map((page, index) => ({
      ...page,
      pageIndex: index + 1,
      id: `page-${index + 1}`,
    })),
  ];

  return {
    title: 'Falconwood OS',
    subtitle: 'Executive Operating Manual',
    pageCount: pages.length,
    pages,
  };
}
