import assert from "node:assert/strict";
import test from "node:test";

import {
  isPrivateIpv4,
  parseHostArgument,
  privateLanCandidates,
  selectLanAddress,
} from "./dev-mobile.mjs";

test("recognizes only RFC 1918 IPv4 addresses", () => {
  assert.equal(isPrivateIpv4("10.20.30.40"), true);
  assert.equal(isPrivateIpv4("172.16.0.1"), true);
  assert.equal(isPrivateIpv4("172.31.255.254"), true);
  assert.equal(isPrivateIpv4("192.168.50.235"), true);
  assert.equal(isPrivateIpv4("172.32.0.1"), false);
  assert.equal(isPrivateIpv4("100.64.0.1"), false);
  assert.equal(isPrivateIpv4("203.0.113.1"), false);
  assert.equal(isPrivateIpv4("not-an-address"), false);
});

test("keeps physical private interfaces and rejects virtual or public ones", () => {
  const candidates = privateLanCandidates({
    en0: [
      { address: "192.168.50.235", family: "IPv4", internal: false },
      { address: "fe80::1", family: "IPv6", internal: false },
    ],
    Ethernet: [{ address: "10.0.0.8", family: "IPv4", internal: false }],
    lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
    docker0: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
    utun4: [{ address: "10.20.0.2", family: "IPv4", internal: false }],
    public0: [{ address: "203.0.113.4", family: "IPv4", internal: false }],
  });

  assert.deepEqual(candidates, [
    { address: "10.0.0.8", name: "Ethernet" },
    { address: "192.168.50.235", name: "en0" },
  ]);
});

test("requires an explicit choice when multiple LAN interfaces exist", () => {
  const candidates = [
    { address: "10.0.0.8", name: "Ethernet" },
    { address: "192.168.50.235", name: "Wi-Fi" },
  ];

  assert.throws(() => selectLanAddress(candidates), /More than one/);
  assert.deepEqual(selectLanAddress(candidates, "192.168.50.235"), candidates[1]);
  assert.throws(
    () => selectLanAddress(candidates, "192.168.1.99"),
    /not a detected private LAN address/,
  );
});

test("parses the supported host argument forms", () => {
  assert.equal(parseHostArgument([]), undefined);
  assert.equal(parseHostArgument(["--host", "192.168.1.23"]), "192.168.1.23");
  assert.equal(parseHostArgument(["-H", "192.168.1.23"]), "192.168.1.23");
  assert.equal(parseHostArgument(["--host=192.168.1.23"]), "192.168.1.23");
  assert.throws(() => parseHostArgument(["--port", "3002"]), /usage/);
});
