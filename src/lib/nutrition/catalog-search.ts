export interface CatalogSearchItem {
  id: string;
  fdc_id: number;
  normalized_name: string;
  description: string;
  aliases: string[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCatalogSearchText(value: string): string {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " "),
  );
}

function tokenize(value: string): string[] {
  return normalizeCatalogSearchText(value)
    .split(" ")
    .filter(Boolean);
}

function allTermsPresent(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

function aliasAllTermsPresent(aliases: string[], terms: string[]): boolean {
  return aliases.some((alias) => allTermsPresent(alias, terms));
}

export interface RankedCatalogSearchItem extends CatalogSearchItem {
  rankScore: number;
}

export interface RankCatalogSearchOptions {
  recentFdcIds?: number[];
  limit?: number;
}

function recentBonus(fdcId: number, recentFdcIds: number[]): number {
  const index = recentFdcIds.indexOf(fdcId);
  if (index < 0) {
    return 0;
  }
  return Math.max(1, 40 - index);
}

function baseRank(item: CatalogSearchItem, normalizedQuery: string, terms: string[]): number {
  if (!normalizedQuery) {
    return 100;
  }

  const aliases = item.aliases.map(normalizeCatalogSearchText);
  const normalizedName = normalizeCatalogSearchText(item.normalized_name);

  if (normalizedName === normalizedQuery) {
    return 1200;
  }
  if (aliases.includes(normalizedQuery)) {
    return 1100;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 1000;
  }
  if (allTermsPresent(normalizedName, terms)) {
    return 900;
  }
  if (aliasAllTermsPresent(aliases, terms)) {
    return 800;
  }

  const matchedTerms = terms.filter((term) => normalizedName.includes(term)).length;
  if (matchedTerms > 0) {
    return 400 + matchedTerms * 10;
  }

  return 0;
}

export function rankCatalogSearchItems(
  items: CatalogSearchItem[],
  query: string,
  options: RankCatalogSearchOptions = {},
): RankedCatalogSearchItem[] {
  const normalizedQuery = normalizeCatalogSearchText(query);
  const terms = tokenize(normalizedQuery);
  const recentFdcIds = options.recentFdcIds ?? [];
  const limit = options.limit ?? 40;

  const ranked = items
    .map((item) => {
      const score = baseRank(item, normalizedQuery, terms) + recentBonus(item.fdc_id, recentFdcIds);
      return {
        ...item,
        rankScore: score,
      };
    })
    .filter((item) => (normalizedQuery ? item.rankScore > 0 : true))
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }
      const byName = left.normalized_name.localeCompare(right.normalized_name);
      if (byName !== 0) {
        return byName;
      }
      const byDescription = left.description.localeCompare(right.description);
      if (byDescription !== 0) {
        return byDescription;
      }
      return left.fdc_id - right.fdc_id;
    });

  return ranked.slice(0, limit);
}
