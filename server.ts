import { serveDir, serveFile } from "@std/http/file-server";

Deno.serve(async (req) => {
  const pathname = new URL(req.url).pathname;

  if (pathname === "/docs" || pathname === "/docs/") {
    const docsPath = `${Deno.cwd()}/docs`;
    const files = [];
    for await (const dirEntry of Deno.readDir(docsPath)) {
      if (!dirEntry.isDirectory) {
        files.push(dirEntry.name);
      }
    }

    const response = new Response(JSON.stringify(files), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", 
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });

    return response;
  } else if (pathname.startsWith("/docs/")) {
    const docsPath = `${Deno.cwd()}/docs`;
    const filePath = `${docsPath}/${pathname.slice(6)}`;
    return await serveFile(req, filePath);
  }

  return new Response();
});