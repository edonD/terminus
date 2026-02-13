import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ── Queries ── */

export const list = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let posts;
        if (args.status) {
            posts = await ctx.db
                .query("posts")
                .withIndex("by_status", (q) => q.eq("status", args.status))
                .collect();
        } else {
            posts = await ctx.db.query("posts").collect();
        }
        // Sort by date descending (format "2026.02.11" sorts lexicographically)
        posts.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
        return posts;
    },
});

export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("posts")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();
    },
});

export const getById = query({
    args: { id: v.id("posts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/* ── Mutations ── */

export const create = mutation({
    args: {
        slug: v.string(),
        title: v.string(),
        subtitle: v.optional(v.string()),
        excerpt: v.string(),
        content: v.optional(v.string()),
        date: v.string(),
        readTime: v.string(),
        wordCount: v.number(),
        tags: v.array(v.string()),
        status: v.string(),
        views: v.number(),
        featured: v.optional(v.boolean()),
        blocks: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("posts", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("posts"),
        slug: v.optional(v.string()),
        title: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        date: v.optional(v.string()),
        readTime: v.optional(v.string()),
        wordCount: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        status: v.optional(v.string()),
        views: v.optional(v.number()),
        featured: v.optional(v.boolean()),
        blocks: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        // Remove undefined fields
        const updates = {};
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                updates[key] = value;
            }
        }
        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("posts") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const incrementViews = mutation({
    args: { id: v.id("posts") },
    handler: async (ctx, args) => {
        const post = await ctx.db.get(args.id);
        if (post) {
            await ctx.db.patch(args.id, { views: (post.views || 0) + 1 });
        }
    },
});
