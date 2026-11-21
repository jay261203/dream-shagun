import { buildIcs } from "@/lib/calendar";
import { isId } from "@/lib/ids";
import { getPublishedWedding } from "@/lib/wedding";

/** "Add to calendar" for one event of a published wedding. A draft or unknown link gives a plain 404. */
export async function GET(_request: Request, ctx: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await ctx.params;
  if (!isId(eventId)) return new Response("Not found", { status: 404 });
  const wedding = await getPublishedWedding(slug);
  const event = wedding?.events.find((e) => e.id === eventId);
  const ics = wedding && event?.id ? buildIcs({ ...event, id: event.id }, `${wedding.bride_name} & ${wedding.groom_name}`) : null;
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event!.kind.replace(/[^a-z0-9-]/gi, "") || "event"}.ics"`,
      "cache-control": "public, max-age=0, s-maxage=60",
      "x-content-type-options": "nosniff",
    },
  });
}
