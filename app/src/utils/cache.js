import {redis} from '../common';

export class CacheManager {
  constructor (type, ttl, id = null) {
    this.id = id;
    this.type = type;
    this.ttl = ttl;
    this.disabled = false;
  }

  key () {
    return `cm:${this.type}:${this.id}`;
  }

  async cached (fn) {
    const k = this.key();
    let value = await redis.get(k);
    if (value !== null) return JSON.parse(value);
    value = await (fn instanceof Promise ? fn : fn());
    // console.log(this.disabled, k, this.ttl, JSON.stringify(value));
    if (!this.disabled) {
      await redis.setex(k, this.ttl, JSON.stringify(value));
    }
    return value;
  }

  async purge () {
    await redis.del(this.key());
  }

  route (idExtractFromReq, isDisabledFn) {
    return async (req, res, next) => {
      const cm = new CacheManager(this.type, this.ttl, idExtractFromReq(req));
      req.cm = cm;
      if (isDisabledFn && isDisabledFn(req)) {
        cm.disabled = true;
        return next();
      }
      cm.disabled = false;
      const value = await redis.get(this.key());
      if (value !== null) return res.send(JSON.parse(value));
      return next();
    };
  }

  routeWithoutCache (idExtractFromReq) {
    return (req, res, next) => {
      const cm = new CacheManager(this.type, this.ttl, idExtractFromReq(req));
      req.cm = cm;
      return next();
    };
  }
}
