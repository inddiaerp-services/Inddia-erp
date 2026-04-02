import { createServer } from "node:http";
import { getAdminApiPort, handleAdminApi } from "./adminApi.mjs";

createServer(async (req, res) => {
  const handled = await handleAdminApi(req, res);
  if (!handled) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found." }));
  }
}).listen(getAdminApiPort(), () => {
  console.log(`INDDIA admin API running on http://localhost:${getAdminApiPort()}`);
});
