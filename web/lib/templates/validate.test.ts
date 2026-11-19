import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadTemplate, TemplateNotFound } from "./load";
import { parseManifest, TemplateError, validateTemplateCss, validateTemplateHtml } from "./validate";

describe("validateTemplateHtml", () => {
  it("accepts a plain template", () => {
    expect(() => validateTemplateHtml("t", '<main><h1>{{bride_name}}</h1><a href="{{map_url}}">Go</a><img src="assets/a.jpg"></main>')).not.toThrow();
  });

  it.each([
    ["raw output", "<p>{{{bride_name}}}</p>"],
    ["raw output with ampersand", "<p>{{& bride_name}}</p>"],
    ["script tag", "<script>1</script>"],
    ["iframe", '<iframe src="x"></iframe>'],
    ["form", "<form></form>"],
    ["inline handler", '<p onclick="x()">hi</p>'],
    ["javascript link", '<a href="javascript:alert(1)">x</a>'],
    ["outside image", '<img src="https://evil.example/a.jpg">'],
    ["protocol-relative link", '<a href="//evil.example">x</a>'],
  ])("rejects %s", (_name, html) => {
    expect(() => validateTemplateHtml("t", html)).toThrow(TemplateError);
  });
});

describe("validateTemplateCss", () => {
  it("accepts local files", () => {
    expect(() => validateTemplateCss("t", "a{background:url(assets/a.png)}")).not.toThrow();
  });

  it.each(["@import 'x.css';", "a{background:url(https://evil.example/a.png)}", "a{background:url('//evil.example/a.png')}"])("rejects %s", (css) => {
    expect(() => validateTemplateCss("t", css)).toThrow(TemplateError);
  });
});

describe("parseManifest", () => {
  const good = {
    id: "demo",
    name: "Demo",
    style: "plain",
    licence: "Own work",
    colorPresets: { a: { name: "A", vars: { "--color-primary": "#fff" } } },
    fontPairs: { f: { name: "F", vars: { "--font-body": "'Figtree', sans-serif" }, googleFonts: ["Figtree:wght@400;700"] } },
    defaults: { colorPreset: "a", fontPair: "f" },
  };

  it("accepts a good manifest", () => {
    expect(parseManifest(good, "demo").defaults.colorPreset).toBe("a");
  });

  it("requires the id to match the folder", () => {
    expect(() => parseManifest(good, "other")).toThrow(TemplateError);
  });

  it("rejects CSS values that could break out of the style block", () => {
    const bad = { ...good, colorPresets: { a: { name: "A", vars: { "--color-primary": "red;}</style><script>" } } } };
    expect(() => parseManifest(bad, "demo")).toThrow(TemplateError);
  });

  it("rejects an unsafe Google Fonts name", () => {
    const bad = { ...good, fontPairs: { f: { name: "F", vars: {}, googleFonts: ["Evil&display=x"] } } };
    expect(() => parseManifest(bad, "demo")).toThrow(TemplateError);
  });

  it("requires defaults that exist", () => {
    expect(() => parseManifest({ ...good, defaults: { colorPreset: "zzz", fontPair: "f" } }, "demo")).toThrow(TemplateError);
  });
});

describe("loadTemplate", () => {
  it("says not found for a bad id or a missing folder", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tpl-"));
    await expect(loadTemplate("../etc", dir)).rejects.toBeInstanceOf(TemplateNotFound);
    await expect(loadTemplate("missing", dir)).rejects.toBeInstanceOf(TemplateNotFound);
  });

  it("refuses a template with raw output", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tpl-"));
    await mkdir(path.join(dir, "bad"));
    await writeFile(
      path.join(dir, "bad", "manifest.json"),
      JSON.stringify({
        id: "bad",
        name: "Bad",
        style: "x",
        licence: "x",
        colorPresets: { a: { name: "A", vars: {} } },
        fontPairs: { f: { name: "F", vars: {} } },
        defaults: { colorPreset: "a", fontPair: "f" },
      }),
    );
    await writeFile(path.join(dir, "bad", "template.html"), "<p>{{{bride_name}}}</p>");
    await writeFile(path.join(dir, "bad", "styles.css"), "");
    await expect(loadTemplate("bad", dir)).rejects.toBeInstanceOf(TemplateError);
  });
});
