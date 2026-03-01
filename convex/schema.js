import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    posts: defineTable({
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
        sections: v.optional(v.any()),
    })
        .index("by_slug", ["slug"])
        .index("by_status", ["status"]),

    pageviews: defineTable({
        path: v.string(),
        slug: v.optional(v.string()),
        postId: v.optional(v.id("posts")),
        timestamp: v.number(),
        sessionId: v.string(),
        referrer: v.optional(v.string()),
        deviceType: v.optional(v.string()),
        browser: v.optional(v.string()),
        os: v.optional(v.string()),
        screenWidth: v.optional(v.number()),
        country: v.optional(v.string()),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_path_timestamp", ["path", "timestamp"])
        .index("by_slug_timestamp", ["slug", "timestamp"])
        .index("by_session", ["sessionId"]),
});
