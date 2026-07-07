import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { alsIcs, kategorieSlug } from '../../lib/kalender';

export async function getStaticPaths() {
  const termine = await getCollection('termine');
  const kategorien = [...new Set(termine.map((t) => t.data.kategorie))];
  return kategorien.map((k) => ({
    params: { kategorie: kategorieSlug(k) },
    props: { name: k },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { name } = props as { name: string };
  const termine = (await getCollection('termine'))
    .map((t) => t.data)
    .filter((t) => t.kategorie === name)
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());
  return new Response(alsIcs(termine, name), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
