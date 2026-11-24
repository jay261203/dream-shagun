import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { brand, pageTitle } from "./brand";

const root = path.join(__dirname, "..", "..");

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", "__pycache__", ".venv", "assets"].includes(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(ts|tsx|html|css|py|js)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !/^test_.*\.py$/.test(name)) out.push(full);
  }
  return out;
}

describe("the product name lives in one place", () => {
  it("builds page titles in one shape", () => {
    expect(pageTitle("Events")).toBe(`Events | ${brand.name}`);
  });
  it("keeps the example address and slug derived from the name", () => {
    expect(brand.slug).toBe(brand.name.toLowerCase());
    expect(brand.domain).toBe(`${brand.slug}.example`);
  });
  it("is not written out in any page, component, template or API file besides brand.ts and brand.py", () => {
    const hits = [...files(path.join(root, "web", "app")), ...files(path.join(root, "web", "components")), ...files(path.join(root, "web", "lib")), ...files(path.join(root, "web", "public")), ...files(path.join(root, "templates")), ...files(path.join(root, "api", "app"))]
      .filter((f) => !/brand\.(ts|py)$/.test(f))
      .filter((f) => new RegExp(`${brand.name}|${brand.slug}`, "i").test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });
});
