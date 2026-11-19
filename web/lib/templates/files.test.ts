import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveTemplateFile } from "./files";

const dir = path.resolve("/srv/templates");

describe("resolveTemplateFile", () => {
  it("serves effects.js and files under assets/", () => {
    expect(resolveTemplateFile("marigold", ["effects.js"], dir)).toBe(path.join(dir, "marigold", "effects.js"));
    expect(resolveTemplateFile("marigold", ["assets", "img", "cover.jpg"], dir)).toBe(path.join(dir, "marigold", "assets", "img", "cover.jpg"));
  });

  it.each([
    ["the manifest", ["manifest.json"]],
    ["the template source", ["template.html"]],
    ["the stylesheet", ["styles.css"]],
    ["a parent folder", ["assets", "..", "manifest.json"]],
    ["an encoded-looking parent", ["assets", "..%2Fmanifest.json"]],
    ["a hidden file", ["assets", ".env"]],
    ["a backslash path", ["assets", "..\\manifest.json"]],
    ["a file type we do not serve", ["assets", "run.sh"]],
    ["an empty path", []],
  ])("refuses %s", (_name, segments) => {
    expect(resolveTemplateFile("marigold", segments, dir)).toBeNull();
  });

  it("refuses a bad template id", () => {
    expect(resolveTemplateFile("../x", ["effects.js"], dir)).toBeNull();
    expect(resolveTemplateFile("Mari Gold", ["effects.js"], dir)).toBeNull();
  });
});
