import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const previewRoot = join(root, "preview");
const port = Number(process.env.PORT || 3000);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function candidatePath(urlPath) {
  if (urlPath === "/") {
    return join(previewRoot, "index.html");
  }

  if (urlPath === "/privacy") {
    return join(previewRoot, "privacy.html");
  }

  if (urlPath.startsWith("/data/")) {
    return join(root, normalize(urlPath));
  }

  return join(previewRoot, normalize(urlPath));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const filePath = candidatePath(url.pathname);
  const allowed = filePath.startsWith(previewRoot) || filePath.startsWith(join(root, "data"));

  if (!allowed || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`CinemaCalmly preview: http://localhost:${port}`);
});
