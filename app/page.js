import { preloadQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";
import HomeContent from "./HomeContent";

export default async function HomePage() {
    const preloadedPosts = await preloadQuery(api.posts.list, { status: "published" });

    return <HomeContent preloadedPosts={preloadedPosts} />;
}
