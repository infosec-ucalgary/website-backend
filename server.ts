import { serveDir, serveFile } from "@std/http/file-server";

function addCORS(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:5173");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

Deno.serve(async (req) => {
  const pathname = new URL(req.url).pathname;

  if (req.method === "OPTIONS") {
    // Handle preflight request
    return addCORS(new Response(null, { status: 204 }));
  }

  if (req.method === "POST" && pathname === "/docs/upload") {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return addCORS(new Response("No file uploaded", { status: 400 }));
    }

    const filePath = `${Deno.cwd()}/docs/${file.name}`;
    const fileContent = await file.arrayBuffer();
    await Deno.writeFile(filePath, new Uint8Array(fileContent));
    return addCORS(new Response("File uploaded successfully", { status: 200 }));

  } else if (pathname === "/docs" || pathname === "/docs/") {
    const docsPath = `${Deno.cwd()}/docs`;
    const files = [];

    for await (const dirEntry of Deno.readDir(docsPath)) {
      if (!dirEntry.isDirectory) {
        files.push(dirEntry.name);
      }
    }

    const response = new Response(JSON.stringify(files), {
      headers: { "Content-Type": "application/json" },
    });
    return addCORS(response);

  } else if (pathname.startsWith("/docs/")) {
    const docsPath = `${Deno.cwd()}/docs`;
    const filePath = `${docsPath}/${decodeURIComponent(pathname.slice(6))}`;
    return addCORS(await serveFile(req, filePath));
  }  

  return addCORS(new Response());
});
