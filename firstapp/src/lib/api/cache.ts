import { NextResponse } from "next/server";

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
  public?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
}

export function setCacheHeaders(response: NextResponse, options: CacheOptions = {}): NextResponse {
  const {
    maxAge = 0,
    sMaxAge = 0,
    staleWhileRevalidate = 0,
    private: isPrivate = false,
    public: isPublic = false,
    noStore = false,
    mustRevalidate = false,
  } = options;

  const directives: string[] = [];

  if (noStore) {
    directives.push('no-store');
  } else {
    if (isPrivate) directives.push('private');
    if (isPublic) directives.push('public');
    if (maxAge > 0) directives.push(`max-age=${maxAge}`);
    if (sMaxAge > 0) directives.push(`s-maxage=${sMaxAge}`);
    if (staleWhileRevalidate > 0) directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    if (mustRevalidate) directives.push('must-revalidate');
  }

  if (directives.length > 0) {
    response.headers.set('Cache-Control', directives.join(', '));
  }

  return response;
}

export function createCachedResponse(
  data: any, 
  options: { status?: number; cacheOptions?: CacheOptions } = {}
): NextResponse {
  const response = NextResponse.json(data, { status: options.status || 200 });
  
  if (options.cacheOptions) {
    return setCacheHeaders(response, options.cacheOptions);
  }
  
  return response;
}