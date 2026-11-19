import { describe, expect, it } from "vitest";

import { GET } from "./route";

async function preview(id: string, query = "") {
  return GET(new Request(`http://localhost:3000/preview/${id}${query}`), { params: Promise.resolve({ id }) });
}

describe("GET /preview/[id]", () => {
  it("renders the template with the names and date from the address", async () => {
    const res = await preview("marigold", "?bride=Riya&groom=Karan&date=2028-05-10");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("Riya");
    expect(html).toContain("Karan");
    expect(html).toContain("10 May 2028");
    expect(html).toContain("8 May 2028"); // the mehendi, two days before
  });

  it("uses the sample when nothing is given", async () => {
    const html = await (await preview("marigold")).text();
    expect(html).toContain("Diya");
    expect(html).toContain("14 February 2027");
  });

  it("shows markup in a name as text", async () => {
    const q = `?bride=${encodeURIComponent('<img src=x onerror=alert(1)>')}&groom=${encodeURIComponent("</title><script>alert(2)</script>")}`;
    const html = await (await preview("marigold", q)).text();
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(2)");
    expect(html).toContain("&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;");
  });

  it("can be framed by our own pages only, and is kept out of search", async () => {
    const res = await preview("marigold");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["nope", "../etc", "Marigold"])("says not found for %s", async (id) => {
    expect((await preview(id)).status).toBe(404);
  });
});
