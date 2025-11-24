const counters = new Map();
export function rateLimit(key, limit = 10, windowMs = 5000) {
    const now = Date.now();
    const item = counters.get(key);
    if (!item || now - item.ts > windowMs) {
        counters.set(key, { count: 1, ts: now });
        return { allowed: true };
    }
    if (item.count >= limit)
        return { allowed: false };
    item.count += 1;
    return { allowed: true };
}
// Note: This is per-instance memory. For multi-instance, use Firestore counters, Redis, or Cloud Armor.
