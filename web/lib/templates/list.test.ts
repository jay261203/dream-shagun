import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { label, LANGUAGE_LABELS, listTemplates } from "./list";

describe("listTemplates", () => {
  it("lists the real templates with a gallery picture, languages and colours", async () => {
    const all = await listTemplates();
    const marigold = all.find((t) => t.id === "marigold");
    expect(marigold).toBeDefined();
    expect(marigold?.preview).toBe("/t/marigold/assets/marigold.jpg");
    expect(marigold?.languages).toEqual(expect.arrayContaining(["en", "hi"]));
    expect(marigold?.colors.map((c) => c.id)).toEqual(expect.arrayContaining(["marigold", "rose"]));
    expect(marigold?.credit).toMatch(/CC BY/);
  });

  it("returns nothing for a folder that does not exist", async () => {
    expect(await listTemplates(path.join(os.tmpdir(), "no-such-templates-folder"))).toEqual([]);
  });

  it("skips a broken template instead of failing the whole gallery", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "gallery-"));
    await mkdir(path.join(dir, "broken"));
    await writeFile(path.join(dir, "broken", "manifest.json"), "{ not json");
    await mkdir(path.join(dir, ".hidden"));
    expect(await listTemplates(dir)).toEqual([]);
  });
});

describe("label", () => {
  it("uses the known name or a tidied version of the code", () => {
    expect(label(LANGUAGE_LABELS, "hi")).toBe("Hindi");
    expect(label(LANGUAGE_LABELS, "ta")).toBe("Ta");
  });
});
