'use client';

import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_NAME } from '../../../lib/brand';

interface FaqItem {
  question: string;
  answer: string;
}

interface ProductFaqProps {
  productName: string;
}

export function ProductFaq({ productName }: ProductFaqProps) {
  const items: FaqItem[] = [
    {
      question: `Is ${productName} intended for human or clinical use?`,
      answer: `No. All ${SITE_NAME} products are supplied strictly for in-vitro and qualified laboratory research. They are not for human or veterinary consumption, diagnosis, or treatment.`,
    },
    {
      question: 'How is purity verified?',
      answer:
        'Each batch undergoes third-party HPLC testing. Certificates of Analysis are available through the Client Portal for fulfilled orders.',
    },
    {
      question: 'What storage conditions are recommended?',
      answer:
        'Lyophilized peptides should be stored at -20°C. Reconstituted material should be aliquoted and used according to your validated lab protocol.',
    },
  ];

  return (
    <section className="mt-20">
      <h2 className="text-xl font-light text-primary tracking-title uppercase mb-2">Research FAQ</h2>
      <HeaderDividerBeam delay={1} className="mb-8" />
      <div>
        {items.map((item, index) => (
          <details key={item.question} className="group border-b border-white/[0.06] py-4">
            <summary className="text-sm text-primary font-light cursor-pointer list-none flex justify-between items-center">
              {item.question}
              <span className="text-muted group-open:rotate-45 transition-transform text-lg leading-none">
                +
              </span>
            </summary>
            <p className="text-sm text-secondary font-light mt-4 leading-relaxed pr-8">{item.answer}</p>
            {index < items.length - 1 ? null : null}
          </details>
        ))}
      </div>
    </section>
  );
}
