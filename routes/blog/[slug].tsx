import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { getPost } from "../../src/content.ts";
import { ServerState } from "../_middleware.ts";
import { PageHeader } from "../../components/PageHeader.tsx";
import { config } from "../../config.ts";
import { Link } from "../../components/Link.tsx";
import { Icon } from "../../components/Icons.tsx";
import { css } from "../../src/markdown.ts";
import { getReplyToLink } from "../../src/utils.ts";
import { jsonResponse } from "../../src/utils.ts";

interface BlogPostProps {
  post: Post;
}

export const handler: Handlers<BlogPostProps, ServerState> = {
  async GET(req, ctx) {
    const slug = ctx.params.slug;

    const post = await getPost(slug);

    if (!post) {
      return ctx.renderNotFound();
    }
    const headers = req.headers.get("accept");
    const isRequestionJSON = headers?.includes("application/json");

    if (isRequestionJSON) {
      return jsonResponse(post);
    }

    const url = new URL(req.url);
    ctx.state.title = `${post.title} - ${ctx.state.title}`;
    ctx.state.breadcrumbs = [
      {
        title: "Home",
        path: "/",
      },
      {
        title: "Blog",
        path: "/blog",
      },
      {
        title: post.title,
        path: url.pathname,
      },
    ];
    if (post.description) {
      ctx.state.description = post.description;
    }
    if (post.language) {
      ctx.state.language = post.language;
    }

    const resp = ctx.render({ post });
    return resp;
  },
};

export default function BlogPost({ data }: PageProps<BlogPostProps>) {
  const { post } = data;
  const title = post.title;

  return (
    <>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>
      <article
        data-color-mode="dark"
        data-dark-theme="dark"
        class="max-w-screen-md mx-auto px-4 mb-4 h-entry"
      >
        <PageHeader
          title={title}
          date={post.createdAt}
          updated={post.updatedAt}
          readingTime={post.readingTime}
          draft={post.draft}
        />
        <div
          class="markdown-body e-content"
          dangerouslySetInnerHTML={{ __html: post.html }}
        >
        </div>
        <Metadata
          tags={post.tags}
          postTitle={title}
          wordCount={post.wordCount}
        />
      </article>
    </>
  );
}

interface MetadataProps {
  tags?: Tag[];
  postTitle: string;
  wordCount: number;
}

function Metadata({ tags, postTitle, wordCount }: MetadataProps) {
  return (
    <div class="border-y-2 border-primary py-4 mt-4 flex flex-wrap gap-4 justify-between items-center">
      <div class="space-y-4">
        <div class="flex gap-2 flex-wrap">
          {tags && (
            <>
              <div class="flex gap-2">
                {tags?.length > 1
                  ? <Icon.Tags aria-hidden="true" />
                  : <Icon.Tag aria-hidden="true" />}
                <h2>Tagged with</h2>
              </div>
              <ul class="flex gap-1 flex-wrap">
                {tags.sort((a, b) => a.title.localeCompare(b.title)).map((
                  tag,
                ) => (
                  <li>
                    <Link
                      href={`/${tag.path}`}
                      label={`#${tag.slug}`}
                      className="p-category"
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div class="flex gap-2">
          <Icon.Script aria-hidden="true" />
          <h2>{wordCount} words</h2>
        </div>
      </div>
      <a
        class="print:hidden border-2 border-primary px-3 py-2 rounded-lg text-primary hover:text-bg hover:bg-primary transition-all duration-150"
        href={getReplyToLink(config.author.email, postTitle)}
      >
        <span class="flex gap-2">
          <Icon.Mail aria-hidden="true" />
          Reply via email
        </span>
      </a>
    </div>
  );
}
