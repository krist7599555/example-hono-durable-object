import { Hono } from "hono";

interface User {
  id: string;
  name: string;
}

function dostorage<V, K extends string, O extends { [key in K]: V }>(
  storage: DurableObjectStorage,
  do_class: O,
  key: K,
  default_value: V
) {
  return {
    async get_no_cache(): Promise<V> {
      // @ts-ignore
      do_class[key] = (await storage.get<V>(key)) ?? default_value;
      return do_class[key];
    },
    get(): V {
      return do_class[key];
    },
    async put(value: V): Promise<V> {
      await storage.put(key, value);
      // @ts-ignore
      do_class[key] = value;
      return value;
    },
    async update(fn: (data: V) => V | Promise<V>): Promise<V> {
      const new_val = await fn(this.get());
      return this.put(new_val);
    },
  };
}

export class Counter implements DurableObject {
  value: number = 0;
  users: User[] = [];
  app!: Hono;
  constructor(state: DurableObjectState) {
    const app = (this.app = new Hono());

    const users = dostorage(state.storage, this, "users", [] as User[]);
    const counter = dostorage(state.storage, this, "value", 0);

    state.blockConcurrencyWhile(async () => {
      this.value = await counter.get_no_cache();
      this.users = await users.get_no_cache();
    });

    app.get("/counter/inc", async (c) =>
      c.json({ counter: await counter.update((i) => i + 1) })
    );
    app.get("/counter/dec", async (c) =>
      c.json({ counter: await counter.update((i) => i - 1) })
    );
    app.get("/counter", async (c) => c.json({ counter: counter.get() }));
    app.get("/counter/inc/meme", async (c) => {
      // https://apimeme.com/?ref=apilist.fun
      const url = new URL("https://apimeme.com/meme");
      url.searchParams.set("meme", "Awkward-Moment-Sealion");
      url.searchParams.set("top", "Inc Counter");
      url.searchParams.set("bottom", `= ${await counter.update((i) => i + 1)}`);
      return c.redirect(url.href);
    });

    app.get("/users", (c) => c.json({ method: "GET", users: users.get() }));
    app.post("/users", async (c) => {
      const body = await c.req.json<User>();
      return c.json({ users: await users.update((xs) => [...xs, body]) });
    });
    app.put("/users", async (c) => {
      const body = await c.req.json<User[]>();
      return c.json({ users: await users.put(body) });
    });

    app.get("/", async (c) => {
      return c.json({
        counter: counter.get(),
        users: users.get(),
      });
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}
