import { readdir, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const viteBin = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");
const adminServerEntrypoint = resolve(projectRoot, "server", "adminServer.mjs");
const tempFilePatterns = [
  /^vite\.config\.js\.timestamp-.*\.mjs$/,
  /^vite\.config\.ts\.timestamp-.*\.mjs$/,
];

const isTempConfigFile = (filename) =>
  tempFilePatterns.some((pattern) => pattern.test(filename));

const cleanupViteTempFiles = async () => {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  const filesToDelete = entries
    .filter((entry) => entry.isFile() && isTempConfigFile(entry.name))
    .map((entry) => resolve(projectRoot, entry.name));

  await Promise.all(
    filesToDelete.map(async (filepath) => {
      try {
        await unlink(filepath);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return;
        }
        throw error;
      }
    }),
  );
};

await cleanupViteTempFiles();

const adminServer = spawn(process.execPath, [adminServerEntrypoint], {
  cwd: projectRoot,
  stdio: "inherit",
});

const viteServer = spawn(process.execPath, [viteBin, "--host", "0.0.0.0"], {
  cwd: projectRoot,
  stdio: "inherit",
});

let cleanedUp = false;

const cleanupAndExit = async (code = 0) => {
  if (cleanedUp) return;
  cleanedUp = true;
  adminServer.kill("SIGTERM");
  viteServer.kill("SIGTERM");
  await cleanupViteTempFiles();
  process.exit(code);
};

process.on("SIGINT", async () => {
  adminServer.kill("SIGINT");
  viteServer.kill("SIGINT");
  await cleanupAndExit(0);
});

process.on("SIGTERM", async () => {
  adminServer.kill("SIGTERM");
  viteServer.kill("SIGTERM");
  await cleanupAndExit(0);
});

adminServer.on("exit", async (code, signal) => {
  if (cleanedUp) return;
  if (signal) {
    await cleanupAndExit(0);
    return;
  }

  console.error(`Admin API exited with code ${code ?? 0}. Shutting down dev environment.`);
  await cleanupAndExit(code ?? 0);
});

viteServer.on("exit", async (code, signal) => {
  if (cleanedUp) return;
  if (signal) {
    await cleanupAndExit(0);
    return;
  }

  await cleanupAndExit(code ?? 0);
});
