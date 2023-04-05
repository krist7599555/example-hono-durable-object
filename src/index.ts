/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
}

import { Hono } from "hono";
export { Counter } from "./counter";

type Bindings = {
  COUNTER: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all("*", async (c) => {
  const id = c.env.COUNTER.idFromName("A");
  const obj = c.env.COUNTER.get(id);
  const resp = await obj.fetch(c.req.raw);
  if (resp.status === 404) {
    return c.text("404 Not Found", 404);
  }
  return resp;

  const count = parseInt(await resp.text());
  return c.text(`Count is ${count} v2`);
});

export default app;
