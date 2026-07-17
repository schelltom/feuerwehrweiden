import type { APIRoute } from 'astro';
import { alsIcs, ladeTermine } from '../../lib/kalender';

export const GET: APIRoute = async () => {
  return new Response(alsIcs(await ladeTermine(), 'Alle Termine'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
