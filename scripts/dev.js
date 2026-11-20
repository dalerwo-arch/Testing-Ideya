"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const services = [
  {
    name: "Backend",
    command: path.join(root, "backend", "server.js"),
    cwd: path.join(root, "backend"),
  },
  {
    name: "Frontend",
    command: path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js"),
    args: ["--host", "0.0.0.0"],
    cwd: path.join(root, "frontend"),
  },
];

let stopping = false;
const children = services.map(({ name, command, args = [], cwd }) => {
  const child = spawn(process.execPath, [command, ...args], { cwd, stdio: "inherit" });

  child.on("error", (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code === 0 ? 0 : 1);
  });

  return child;
});

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
