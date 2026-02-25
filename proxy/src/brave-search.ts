export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

export async function braveWebSearch(
  query: string,
  apiKey: string,
  count: number = 10,
  freshness?: string  // "pd" | "pw" | "pm" | "py" | undefined (all time)
): Promise<BraveSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  // Only restrict freshness if explicitly requested — default is all-time for broader results
  if (freshness) {
    params.set("freshness", freshness);
  }

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

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(`Brave Search returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
  }

  const results: BraveSearchResult[] = (data.web?.results || [])
    .slice(0, count)
    .map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));

  return results;
}
