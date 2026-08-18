import rss from '@astrojs/rss';

import { getVisibleFieldNotes } from '../lib/content';

export async function GET(context: { site?: URL }) {
  const notes = await getVisibleFieldNotes();
  return rss({
    title: 'AgentSutra Field Notes',
    description:
      'Accessible, evidence-led lessons for understanding and using AI systems with better judgement.',
    site: context.site ?? new URL('https://agentsutra.dev'),
    items: notes.map((entry) => ({
      title: entry.title,
      description: entry.description,
      link: `/field-notes/${entry.slug}/`,
      pubDate: entry.dates.published
        ? new Date(entry.dates.published)
        : new Date(entry.dates.updated),
      categories: [entry.arc, entry.difficulty, `risk-${entry.riskClass.toLowerCase()}`],
    })),
    customData: '<language>en</language>',
  });
}
