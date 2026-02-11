export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

export async function braveWebSearch(
  query: string,
  apiKey: string,
  count: number = 5
): Promise<BraveSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brave Search API error (${res.status}): ${err}`);
  }

  const data = await res.json();

  const results: BraveSearchResult[] = (data.web?.results || [])
    .slice(0, count)
    .map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));

  return results;
}
