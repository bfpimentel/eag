import { wordlist } from "./words";

export interface AliasConfig {
  domain: string;
  destination: string;
  template?: string;
  prefix?: string;
  suffix?: string;
  slugLength?: string;
  hexLength?: string;
  aliasSeparator?: string;
  slugSeparator?: string;
  static?: string;
}

export function parseOptions(input: string): AliasConfig {
  const entries = input
    .split(",")
    .filter((part) => part.includes("="))
    .map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index), part.slice(index + 1)] as const;
    });
  const options = Object.fromEntries(entries);
  if (!options.domain || !options.destination)
    throw new Error("Domain and destination are required.");
  return {
    domain: options.domain,
    destination: options.destination,
    static: options.static,
    template: options.template,
    prefix: options.prefix,
    suffix: options.suffix,
    slugLength: options.slug_length,
    hexLength: options.hex_length,
    aliasSeparator: options.alias_separator,
    slugSeparator: options.slug_separator,
  };
}

export function optionsString(config: AliasConfig): string {
  const parts = [`domain=${config.domain}`, `destination=${config.destination}`];
  for (const [key, value, defaultValue] of [
    ["template", config.template, "<slug>"],
    ["prefix", config.prefix, ""],
    ["suffix", config.suffix, ""],
    ["slug_length", config.slugLength, "2"],
    ["hex_length", config.hexLength, "6"],
    ["alias_separator", config.aliasSeparator, "_"],
    ["slug_separator", config.slugSeparator, "_"],
    ["static", config.static, ""],
  ]) {
    if (value && value !== defaultValue) parts.push(`${key}=${value}`);
  }
  return parts.join(",");
}

function random(max: number): number {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0]! >= limit);
  return bytes[0]! % max;
}

function hex(count: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(count / 2))), (b) =>
    b.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, count);
}

function length(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max)
    throw new Error(`Length must be between 1 and ${max}.`);
  return n;
}

export function generateAlias(config: AliasConfig): string {
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(config.domain))
    throw new Error("Enter a valid domain.");
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(config.destination))
    throw new Error("Enter a valid destination email.");
  const alias = config.static?.trim();
  if (alias) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(alias))
      throw new Error("Invalid alias name.");
    return alias;
  }
  const template = config.template || "<slug>";
  if (!/^(?:<slug>|<hex>)+$/.test(template))
    throw new Error("Template must contain only <slug> and <hex>.");
  const slugLength = length(config.slugLength, 2, 10);
  const hexLength = length(config.hexLength, 6, 64);
  const parts = (template.match(/<(slug|hex)>/g) || []).map((part) => {
    if (part === "<hex>") return hex(hexLength);
    const slug = Array.from(
      { length: slugLength },
      () => wordlist[random(wordlist.length)],
    ).join(config.slugSeparator ?? "_");
    return `${slug}_${hex(12)}`;
  });
  const separator = config.aliasSeparator ?? "_";
  const result = [config.prefix, ...parts, config.suffix]
    .filter(Boolean)
    .join(separator);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(result))
    throw new Error("Generated alias contains invalid characters.");
  return result;
}
