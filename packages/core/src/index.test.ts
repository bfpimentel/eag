import { describe, expect, test } from "bun:test";
import { wordlist } from "./words";
import { generateAlias, optionsString, parseOptions } from "./index";

describe("Bitwarden options", () => {
  test("round trips snake-case settings", () => {
    const input = [
      "domain=example.com,destination=me@example.com",
      "slug_length=3,hex_length=8,template=<hex>,alias_separator=-",
    ].join(",");
    expect(parseOptions(optionsString(parseOptions(input)))).toEqual(
      parseOptions(input),
    );
  });

  test("supports fixed aliases", () => {
    expect(
      generateAlias(
        parseOptions("domain=example.com,destination=me@example.com,static=shop"),
      ),
    ).toBe("shop");
  });

  test("rejects invalid templates and lengths", () => {
    expect(() =>
      generateAlias(
        parseOptions("domain=example.com,destination=me@example.com,template=<bad>"),
      ),
    ).toThrow();
    expect(() =>
      generateAlias(
        parseOptions("domain=example.com,destination=me@example.com,hex_length=-1"),
      ),
    ).toThrow();
  });

  test("generates different aliases with a random suffix", () => {
    const config = parseOptions("domain=example.com,destination=me@example.com");
    expect(generateAlias(config)).not.toBe(generateAlias(config));
  });

  test("selects readable words from the larger curated list", () => {
    expect(wordlist).toHaveLength(2048);
    const config = parseOptions("domain=example.com,destination=me@example.com");
    const [first, second, suffix] = generateAlias(config).split("_");
    expect(wordlist).toContain(first);
    expect(wordlist).toContain(second);
    expect(suffix).toMatch(/^[0-9a-f]{12}$/);
  });
});
