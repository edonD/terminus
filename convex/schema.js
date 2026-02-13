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
});
