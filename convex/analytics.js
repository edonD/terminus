import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ── Helpers ── */

function daysAgoMs(days) {
    return Date.now() - days * 24 * 60 * 60 * 1000;
}

function toDateStr(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Mutation ── */

export const trackPageview = mutation({
    args: {
        path: v.string(),
        slug: v.optional(v.string()),
        postId: v.optional(v.id("posts")),
        sessionId: v.string(),
        referrer: v.optional(v.string()),
        deviceType: v.optional(v.string()),
        browser: v.optional(v.string()),
        os: v.optional(v.string()),
        screenWidth: v.optional(v.number()),
        country: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("pageviews", {
            ...args,
            timestamp: Date.now(),
        });
        // Backward compat: increment post.views
        if (args.postId) {
            const post = await ctx.db.get(args.postId);
            if (post) {
                await ctx.db.patch(args.postId, { views: (post.views || 0) + 1 });
            }
        }
    },
});

/* ── Queries ── */

export const dailyViews = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 30;
        const since = daysAgoMs(days);
        const rows = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
            .collect();

        // Bucket by date
        const buckets = {};
        const sessions = {};
        for (let i = 0; i < days; i++) {
            const d = toDateStr(Date.now() - (days - 1 - i) * 86400000);
            buckets[d] = { date: d, views: 0, visitors: 0 };
            sessions[d] = new Set();
        }
        for (const r of rows) {
            const d = toDateStr(r.timestamp);
            if (buckets[d]) {
                buckets[d].views++;
                sessions[d].add(r.sessionId);
            }
        }
        return Object.values(buckets).map((b) => ({
            ...b,
            visitors: sessions[b.date]?.size || 0,
        }));
    },
});

export const allPostSparklines = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 7;
        const since = daysAgoMs(days);
        const rows = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
            .collect();

        // Only post pages (have slug)
        const slugBuckets = {};
        for (const r of rows) {
            if (!r.slug) continue;
            if (!slugBuckets[r.slug]) slugBuckets[r.slug] = {};
            const dayIdx = Math.min(
                days - 1,
                Math.floor((Date.now() - r.timestamp) / 86400000)
            );
            const key = days - 1 - dayIdx; // 0 = oldest
            slugBuckets[r.slug][key] = (slugBuckets[r.slug][key] || 0) + 1;
        }

        // Convert to arrays
        const result = {};
        for (const [slug, dayMap] of Object.entries(slugBuckets)) {
            result[slug] = Array.from({ length: days }, (_, i) => dayMap[i] || 0);
        }
        return result;
    },
});

export const topPages = query({
    args: { days: v.optional(v.number()), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 30;
        const limit = args.limit || 10;
        const since = daysAgoMs(days);
        const rows = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
            .collect();

        const pages = {};
        for (const r of rows) {
            if (!pages[r.path]) pages[r.path] = { path: r.path, views: 0, visitors: new Set() };
            pages[r.path].views++;
            pages[r.path].visitors.add(r.sessionId);
        }
        return Object.values(pages)
            .map((p) => ({ path: p.path, views: p.views, visitors: p.visitors.size }))
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    },
});

export const referrerBreakdown = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 30;
        const since = daysAgoMs(days);
        const rows = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
            .collect();

        const refs = {};
        for (const r of rows) {
            const src = r.referrer || "Direct";
            refs[src] = (refs[src] || 0) + 1;
        }
        return Object.entries(refs)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count);
    },
});

export const deviceBreakdown = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 30;
        const since = daysAgoMs(days);
        const rows = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
            .collect();

        const devices = {};
        const browsers = {};
        const oses = {};
        const countries = {};
        for (const r of rows) {
            if (r.deviceType) devices[r.deviceType] = (devices[r.deviceType] || 0) + 1;
            if (r.browser) browsers[r.browser] = (browsers[r.browser] || 0) + 1;
            if (r.os) oses[r.os] = (oses[r.os] || 0) + 1;
            if (r.country) countries[r.country] = (countries[r.country] || 0) + 1;
        }
        const toArr = (obj) =>
            Object.entries(obj)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);
        return {
            devices: toArr(devices),
            browsers: toArr(browsers),
            os: toArr(oses),
            countries: toArr(countries),
        };
    },
});

export const summary = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const weekAgo = now - 7 * 86400000;
        const twoWeeksAgo = now - 14 * 86400000;

        const thisWeek = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", weekAgo))
            .collect();

        const lastWeek = await ctx.db
            .query("pageviews")
            .withIndex("by_timestamp", (q) =>
                q.gte("timestamp", twoWeeksAgo).lt("timestamp", weekAgo)
            )
            .collect();

        const viewsThisWeek = thisWeek.length;
        const viewsLastWeek = lastWeek.length;

        const visitorsThisWeek = new Set(thisWeek.map((r) => r.sessionId)).size;

        const weekDelta =
            viewsLastWeek === 0
                ? viewsThisWeek > 0
                    ? 100
                    : 0
                : Math.round(((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100);

        return { viewsThisWeek, visitorsThisWeek, weekDelta };
    },
});
