import { serveFile } from "@std/http/file-server";
import { config } from "https://deno.land/x/dotenv/mod.ts";

import { verify } from "@ts-rex/bcrypt";

// Load environment variables
const env = config();
const USERNAME = env.USERNAME;
const HASHED_PASSWORD = env.PASSWORD; // Pre-hashed password in .env
const writeupsPath = `${Deno.cwd()}/writeups`;
const infoFilePath = `${writeupsPath}/info.json`;

// Helper function to load `info.json`
async function loadInfoFile() {
  try {
    const data = await Deno.readTextFile(infoFilePath);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper function to save `info.json`
async function saveInfoFile(info: any) {
  await Deno.writeTextFile(infoFilePath, JSON.stringify(info, null, 2));
}

// Helper function to check for duplicate filenames and rename if necessary
async function generateUniqueFilename(filename: string) {
  let uniqueFilename = filename;
  let counter = 0;
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  const baseName = filename.includes(".")
    ? filename.slice(0, filename.lastIndexOf("."))
    : filename;

  while (
    await Deno.stat(`${writeupsPath}/${uniqueFilename}`).catch(() => false)
  ) {
    uniqueFilename = `${baseName}_${counter}${extension ? "." + extension : ""}`;
    counter++;
  }
  return uniqueFilename;
}

function addCORS(response: Response) {
  // response.headers.set("Access-Control-Allow-Origin", "http://localhost:5173");
  response.headers.set(
    "Access-Control-Allow-Origin",
    "https://cybersec-ucalgary.club",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, DELETE",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

Deno.serve(async (req) => {
  const pathname = new URL(req.url).pathname;

  if (req.method === "OPTIONS") {
    return addCORS(new Response(null, { status: 204 }));
  }

  // Handle delete request
  if (req.method === "POST" && pathname === "/writeups/delete") {
    try {
      const { title, author, category, description } = await req.json();

      if (!title || !author || !category || !description) {
        return addCORS(
          new Response("Missing required fields", { status: 400 }),
        );
      }

      // Load existing info
      const info = await loadInfoFile();

      // Find the entry to delete
      const entryIndex = info.findIndex(
        (entry: any) =>
          entry.title === title &&
          entry.author === author &&
          entry.category === category &&
          entry.description === description,
      );

      if (entryIndex === -1) {
        return addCORS(new Response("Document not found", { status: 404 }));
      }

      // Get the filename before removing the entry
      const filename = info[entryIndex].filename;

      // Delete the physical file
      try {
        await Deno.remove(`${writeupsPath}/${filename}`);
      } catch (error) {
        console.error("Error deleting file:", error);
        return addCORS(new Response("Error deleting file", { status: 500 }));
      }

      // Remove the entry from info array
      info.splice(entryIndex, 1);

      // Save the updated info.json
      await saveInfoFile(info);

      return addCORS(
        new Response(
          JSON.stringify({
            success: true,
            message: "Document deleted successfully",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    } catch (error) {
      console.error("Delete error:", error);
      return addCORS(
        new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
  }

  // Handle login
  if (req.method === "POST" && pathname === "/login") {
    try {
      const { username, password: password } = await req.json();

      // Validate username and hashed password
      if (username === USERNAME && verify(password, HASHED_PASSWORD)) {
        const response = new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
        return addCORS(response);
      } else {
        return addCORS(
          new Response("Invalid username or password", { status: 401 }),
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      return addCORS(new Response("Invalid login request", { status: 400 }));
    }
  }

  // Handle file upload
  if (req.method === "POST" && pathname === "/writeups/upload") {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const title = formData.get("title") as string;
      const author = formData.get("author") as string;
      const category = formData.get("category") as string;
      const description = formData.get("description") as string;

      if (
        !file ||
        !title ||
        !author ||
        !category ||
        !description ||
        file.name.includes("/") ||
        file.name.includes("..")
      ) {
        return addCORS(
          new Response(
            "Missing title, author, category, description, or file",
            { status: 400 },
          ),
        );
      }

      // Check if the file is either .md or .txt
      const allowedExtensions = ["md", "txt"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return addCORS(
          new Response(
            "Invalid file type. Only .md and .txt files are allowed.",
            { status: 400 },
          ),
        );
      }

      // Load existing info
      const info = await loadInfoFile();

      // Check if an entry with the same title, description, and category exists
      const existingEntry = info.find(
        (entry: any) =>
          entry.title === title &&
          entry.author === author &&
          entry.description === description &&
          entry.category === category,
      );

      let finalFilename: string;

      if (existingEntry) {
        // Delete old file if exists
        try {
          await Deno.remove(`${writeupsPath}/${existingEntry.filename}`);
        } catch (error) {
          console.error("Error deleting old file:", error);
        }
        // Use the original filename for overwrite
        finalFilename = file.name;
        // Update entry
        existingEntry.filename = finalFilename;
      } else {
        // Generate a unique filename for the new file
        finalFilename = await generateUniqueFilename(file.name);
        // Add new entry to info
        info.push({
          title,
          author,
          description,
          category,
          filename: finalFilename,
        });
      }

      // Save the updated info.json
      await saveInfoFile(info);

      // Write the file with the final filename
      const fileContent = await file.arrayBuffer();
      const filePath = `${writeupsPath}/${finalFilename}`;
      await Deno.writeFile(filePath, new Uint8Array(fileContent));

      return addCORS(
        new Response(
          JSON.stringify({
            success: true,
            filename: finalFilename,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    } catch (error) {
      console.error("Upload error:", error);
      return addCORS(
        new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
  }

  // Serve info.json at /writeups
  if (pathname === "/writeups" || pathname === "/writeups/") {
    const info = await loadInfoFile();
    const response = new Response(JSON.stringify(info), {
      headers: { "Content-Type": "application/json" },
    });
    return addCORS(response);
  }

  // Serve individual file content
  if (pathname.startsWith("/writeups/")) {
    const filePath = `${writeupsPath}/${decodeURIComponent(pathname.slice(10))}`;
    return addCORS(await serveFile(req, filePath));
  }

  return addCORS(new Response("Not found", { status: 404 }));
});
