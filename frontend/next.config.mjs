import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone", // minimal server.js for the Docker image (nested under frontend/, see Dockerfile)
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default config;
