import { Handlers, PageProps, STATUS_CODE } from "$fresh/server.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import { getPage } from "../src/content.ts";
import { ServerState } from "./_middleware.ts";
import { CVSchema, Project } from "./cv.tsx";
import { Head } from "$fresh/runtime.ts";
import { Link } from "../components/Link.tsx";
import { css } from "../src/markdown.ts";
import * as TOML from "@std/toml";
import { jsonResponse } from "../src/utils.ts";

interface Projects {
  page: Page;
  projects: Project[];
  filter: {
    year: string | null;
    tag: string | null;
  };
}

export const handler: Handlers<Projects, ServerState> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const filter = {
      year: url.searchParams.get("year"),
      tag: url.searchParams.get("tag"),
    };

    const headers = req.headers.get("accept");
    const isRequestingHtml = headers?.includes("text/html");

    try {
      const cvPath = new URL("../static/api/cv_.toml", import.meta.url);
      const cvRaw = await Deno.readTextFile(cvPath);
      const cv = CVSchema.parse(TOML.parse(cvRaw));
      if (!isRequestingHtml) {
        return new Response(JSON.stringify(cv, null, 2));
      }
      const page = await getPage({ slug: "projects" });
      ctx.state.title = `${page.title} - ${ctx.state.title}`;
      if (page.description) {
        ctx.state.description = page.description;
      }
      ctx.state.breadcrumbs = [
        {
          title: "Home",
          path: "/",
        },
        {
          title: page.title,
          path: url.pathname,
        },
      ];
      let projects = cv.projects.sort((a, b) => {
        if (!a.endDate && !b.endDate) {
          return 0;
        }
        if (!a.endDate) {
          return 1;
        }
        if (!b.endDate) {
          return -1;
        }

        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);

        return dateA.getTime() - dateB.getTime();
      }).reverse();

      if (filter.year) {
        projects = projects.filter((project) =>
          new Date(project.startDate).getFullYear().toString() === filter.year
        );
      }

      if (filter.tag) {
        const tag = filter.tag;
        projects = projects.filter((project) =>
          project.keywords.some((keyword) =>
            keyword.toLowerCase() === tag.toLowerCase()
          )
        );
      }

      return ctx.render({ projects, page, filter });
    } catch (error) {
      console.error(error);
      if (!isRequestingHtml) {
        return jsonResponse(
          { message: "error" },
          STATUS_CODE.InternalServerError,
        );
      }
      return ctx.renderNotFound();
    }
  },
};

export default function CV({ data }: PageProps<Projects & ServerState>) {
  const { projects, page, filter } = data;

  return (
    <>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>
      <div class="max-w-screen-md mx-auto px-4 mb-4 space-y-4">
        <PageHeader title="Projects" />
        <div
          data-color-mode="dark"
          data-dark-theme="dark"
          class="markdown-body"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
        {(filter.year || filter.tag) &&
          (
            <p class="">
              Showing {projects.length} results:
            </p>
          )}
        <ul class="divide-y-2 divide-slate-600">
          {projects.map((project) => (
            <li>
              <ProjectWrapper project={project} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ProjectWrapper({ project }: { project: Project }) {
  const dates = {
    start: new Date(project.startDate),
    end: project.endDate ? new Date(project.endDate) : undefined,
  };

  const isJSRModule = project.keywords.includes("JSR");
  const isGoPackage = project.keywords.includes("Go") &&
    project.keywords.includes("Package");
  return (
    <div class="py-4 md:grid grid-cols-[0.25fr_1fr]">
      <ProjectDates start={dates.start} end={dates.end} />
      <div class="space-y-4">
        <h2 class="text-xl">
          {project.url
            ? <Link href={project.url} label={project.name} target="_blank" />
            : project.name} {project.client && "- " + project.client}
        </h2>
        {isJSRModule && project.url && <JSRDetails url={project.url} />}
        {isGoPackage && project.url && <GoDetails sources={project.sources} />}
        <p class="">{project.description}</p>
        {project.sources && (
          <Link href={project.sources[0]} label="Source code" target="_blank" />
        )}
        <ul class="flex flex-wrap gap-2">
          {project.keywords.map((keyword) => (
            <li class="">
              <a href={`/projects?tag=${keyword.toLowerCase()}`}>
                #{keyword.toLowerCase().replaceAll(" ", "-")}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProjectDates({ start, end }: { start: Date; end?: Date }) {
  if (end && start.getFullYear() === end.getFullYear()) {
    return (
      <time
        class="block"
        dateTime={start.toISOString()}
        aria-label={`From ${start.toISOString()}`}
        title={`From ${start.toISOString()}`}
      >
        {start.getFullYear()}
      </time>
    );
  }
  return (
    <div class="">
      <time
        dateTime={start.toISOString()}
        aria-label={`From ${start.toISOString()}`}
        title={`From ${start.toISOString()}`}
      >
        {start.getFullYear()}
      </time>{" "}
      – {end
        ? (
          <time
            dateTime={end.toISOString()}
            aria-label={`To ${end.toISOString()}`}
            title={`To ${end.toISOString()}`}
          >
            {end.getFullYear()}
          </time>
        )
        : "present"}
    </div>
  );
}

function JSRDetails({ url }: { url: string }) {
  const scopeRegex = /@([^/]+)/;
  const scopeMatch = url.match(scopeRegex);
  const scope = scopeMatch ? scopeMatch[0] : null;

  const moduleRegex = /\/([^/]+)$/;
  const moduleMatch = url.match(moduleRegex);
  const module = moduleMatch ? moduleMatch[1] : null;

  const versionBadgeURL = `https://jsr.io/badges/${scope}/${module}`;
  const scoreBadgeURL = `${versionBadgeURL}/score`;

  return (
    <div className="flex gap-2">
      <a href={url}>
        <img src={versionBadgeURL} alt="" />
      </a>
      <a href={url}>
        <img src={scoreBadgeURL} alt="" />
      </a>
    </div>
  );
}

function GoDetails({ sources }: { sources?: string[] }) {
  if (!sources) {
    return <></>;
  }
  const source = sources[0].replaceAll("https://", "");
  const goReference = `https://pkg.go.dev/${source}/`;
  const goReferenceBadge = `https://pkg.go.dev/badge/${source}/.svg`;

  return (
    <div className="flex gap-2">
      <a href={goReference}>
        <img src={goReferenceBadge} alt="Go reference" />
      </a>
    </div>
  );
}
