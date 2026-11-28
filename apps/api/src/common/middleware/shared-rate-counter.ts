import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { RedisConnectionFactory } from "../../modules/jobs/redis-connection.factory";

const incrementWindow = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
  return {count, redis.call("PTTL", KEYS[1])}
`;

@Injectable()
export class SharedRateCounter implements OnModuleDestroy {
  private readonly client?: Redis;
  private readonly prefix: string;

  constructor(factory: RedisConnectionFactory) {
    this.prefix = factory.queuePrefix() + ":http-rate:";
    if (factory.isConfigured()) {
      this.client = new Redis({ ...factory.createProducerConnection(), commandTimeout: 2000 });
      this.client.on("error", () => { /* Requests fail closed while Redis reconnects. */ });
    }
  }

  get configured() {
    return Boolean(this.client);
  }

  async increment(key: string, windowMs: number) {
    if (!this.client) throw new Error("Shared counter requires Redis.");
    const [count, ttl] = await this.client.eval(incrementWindow, 1, this.prefix + key, windowMs) as [number, number];
    return { count, resetAt: Date.now() + ttl };
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
