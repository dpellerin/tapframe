#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const EXCLUDED_INTERFACE =
  /^(?:lo|docker|br-|veth|virbr|vmnet|vboxnet|utun|tun\d|tap\d|wg\d|tailscale|zt)/i;

export function isPrivateIpv4(address) {
  const octets = address.split(".").map(Number);

  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

export function privateLanCandidates(interfaces) {
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses || EXCLUDED_INTERFACE.test(name) || /vEthernet/i.test(name)) {
      continue;
    }

    for (const address of addresses) {
      if (
        address.family === "IPv4" &&
        !address.internal &&
        isPrivateIpv4(address.address)
      ) {
        candidates.push({ address: address.address, name });
      }
    }
  }

  return candidates.sort((left, right) =>
    left.address.localeCompare(right.address, "en", { numeric: true }),
  );
}

export function parseHostArgument(args) {
  if (args.length === 0) {
    return undefined;
  }

  if (args.length === 1 && args[0].startsWith("--host=")) {
    return args[0].slice("--host=".length);
  }

  if (args.length === 2 && (args[0] === "--host" || args[0] === "-H")) {
    return args[1];
  }

  throw new Error("usage: pnpm dev:mobile [--host PRIVATE_LAN_IP]");
}

export function selectLanAddress(candidates, requestedHost) {
  if (requestedHost) {
    const selected = candidates.find(({ address }) => address === requestedHost);
    if (!selected) {
      throw new Error(
        `${requestedHost} is not a detected private LAN address on this machine.`,
      );
    }
    return selected;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length === 0) {
    throw new Error(
      "No private LAN address was detected. Connect to a trusted private network and try again.",
    );
  }

  const choices = candidates
    .map(
      ({ address, name }) =>
        `  ${name}: ${address}\n    pnpm dev:mobile --host ${address}`,
    )
    .join("\n");

  throw new Error(`More than one private LAN address was detected:\n${choices}`);
}

export async function runMobileDev(args = process.argv.slice(2)) {
  const requestedHost = parseHostArgument(args);
  const selected = selectLanAddress(
    privateLanCandidates(networkInterfaces()),
    requestedHost,
  );
  const require = createRequire(import.meta.url);
  const nextCli = require.resolve("next/dist/bin/next");

  console.log(`Tapframe mobile development: http://${selected.address}:3001`);
  console.log(`Network interface: ${selected.name}`);
  console.log("This server is available to devices on the selected network.\n");

  const child = spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", selected.address, "--port", "3001"],
    {
      stdio: "inherit",
    },
  );

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(0);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    process.exitCode = await runMobileDev();
  } catch (error) {
    console.error(`tapframe: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
