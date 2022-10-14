// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type RestParams<T> = Partial<Record<keyof T, string>>;

export class RestService<T extends { id: string }> {
  constructor(
    readonly collection: string,
    readonly baseUrl = "http://localhost:8080/api"
  ) {}

  /**
   * Construct a URL object against the collection backing this RestService.
   */
  protected url({
    id = "",
    adverb = "",
    params = {},
  }: { id?: string; adverb?: string; params?: RestParams<T> } = {}) {
    let item = id;
    if (adverb.length > 0) {
      item += ":" + adverb;
    }
    const url = new URL(`${this.baseUrl}/${this.collection}/${item}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, v);
    }
    return url;
  }

  /**
   *
   * @param url to send the request, generated by this.url()
   * @param request fetch RequestInit options for the operation.
   * @returns a promise resolved with the response data, if the response is
   *          status 200, or a promise rejected with the entire response.
   */
  protected async fetch<R>(url: URL, request: RequestInit = {}): Promise<R> {
    const headers: Record<string, string> = Array.isArray(request.headers)
      ? request.headers.reduce((h, [k, v]) => {
          h[k] = v;
          return h;
        }, {} as Record<string, string>)
      : request.headers === undefined
      ? {}
      : (request.headers as Record<string, string>);
    if (request.body) {
      headers["content-type"] = "application/json";
    }
    const response = await fetch(url, { ...request, headers });
    if (response.status === 200) {
      return response.json() as Promise<R>;
    }
    return Promise.reject(response);
  }

  /**
   * Send a POST request to the base collection URL, with a body including
   * necessary item fields _except_ `id`. `id` will be provided by the server
   * response. The server is expected to create the resource, and return the
   * complete entity.
   */
  async create(item: Omit<T, "id">): Promise<T> {
    return this.fetch(this.url(), {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  /** Send a GET request to the collection root URL, retrieving a list of all items in the collection. Optionally include query parameters to narrow the requested list. */
  async list(params: RestParams<T> = {}): Promise<T[]> {
    return this.fetch(this.url(params));
  }

  /** Send a GET request to a specific ID in the collection, retrieving that single item. Optionally include query parameters to narrow the requested item. */
  async retrieve(id: string, params: RestParams<T> = {}): Promise<T> {
    return this.fetch(this.url({ id, params }));
  }

  /** Send a PUT request to a specific ID in the collection, replacing it with the provided body. */
  async update(id: string, body: Partial<T>): Promise<T> {
    return this.fetch(this.url({ id }), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /** Send a DELETE request to a specific ID in the collection. */
  async delete(id: string): Promise<void> {
    return this.fetch(this.url({ id }), { method: "DELETE" });
  }
}
