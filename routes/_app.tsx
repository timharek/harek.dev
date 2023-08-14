import { Head } from "$fresh/runtime.ts";
import { AppProps } from "$fresh/server.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { ServerState } from "./_middleware.ts";

export default function App(props: AppProps) {
  const Component = props.Component;
  const state = props.data as ServerState;
  const currentPath = new URL(props.url).pathname;

  return (
    <html>
      <Head>
        <meta
          name="description"
          content={state.description}
        />
        <title>{state.title}</title>
      </Head>
      <body class="bg-bg text-white">
        <Header currentPath={currentPath} breadcrumbs={state.breadcrumbs} />
        <main id="main">
          <Component />
        </main>
        <Footer currentPath={currentPath} />
      </body>
    </html>
  );
}
