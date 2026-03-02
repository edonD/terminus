import { preloadQuery, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import PostContent from "./PostContent";

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const post = await fetchQuery(api.posts.getBySlug, { slug });

    if (!post) {
        return {
            title: "Post Not Found — Terminus",
            description: "This post doesn't exist yet.",
        };
    }

    const description = post.excerpt
        || (post.content
            ? post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 160)
            : "");

    return {
        title: `${post.title} — Terminus`,
        description,
        openGraph: {
            title: post.title,
            description,
            type: "article",
            publishedTime: post.date,
            tags: post.tags,
            siteName: "Terminus",
        },
        twitter: {
            card: "summary",
            title: post.title,
            description,
        },
    };
}

export default async function PostPage({ params }) {
    const { slug } = await params;
    const preloadedPost = await preloadQuery(api.posts.getBySlug, { slug });

    return <PostContent preloadedPost={preloadedPost} slug={slug} />;
}
