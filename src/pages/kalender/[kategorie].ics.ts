import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { alsIcs, kategorieSlug, ladeTermine } from '../../lib/kalender';

export async function getStaticPaths() {
  // Kategorien aus dem CMS plus alles, was in Terminen tatsächlich vorkommt
  const angelegt = (await getCollection('terminkategorien')).map((k) => k.data.name);
  const verwendet = (await getCollection('termine')).map((t) => t.data.kategorie);
  return [...new Set([...angelegt, ...verwendet])].map((k) => ({
    params: { kategorie: kategorieSlug(k) },
    props: { name: k },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { name } = props as { name: string };
  const termine = (await ladeTermine()).filter((t) => t.kategorie === name);
  return new Response(alsIcs(termine, name), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
