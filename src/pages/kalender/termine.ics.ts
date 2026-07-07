import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { alsIcs } from '../../lib/kalender';

export const GET: APIRoute = async () => {
  const termine = (await getCollection('termine'))
    .map((t) => t.data)
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());
  return new Response(alsIcs(termine, 'Alle Termine'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
