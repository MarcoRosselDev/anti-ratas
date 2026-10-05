#!/usr/bin/env node
/**
 * Proyecto anti-ratas (JavaScript, Node 18+)
 *
 * Uso:
 *   export GITHUB_TOKEN=ghp_xxx           # token con scope user:follow
 *   node anti_ratas.mjs                    # solo lista (simulación)
 *   node anti_ratas.mjs --unfollow         # deja de seguir de verdad
 *   node anti_ratas.mjs --whitelist=amigo1,amigo2
 *   (también puedes poner usuarios a salvo, uno por línea, en whitelist.txt)
 *
 * No requiere dependencias: usa fetch nativo.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";

process.loadEnvFile()
const RATAS_FILE = new URL("./ratas.txt", import.meta.url);
const API = "https://api.github.com";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("Falta la variable de entorno GITHUB_TOKEN");
  process.exit(1);
}

function logRata(login) {
  const fecha = new Date().toISOString().slice(0, 10);
  appendFileSync(RATAS_FILE, `${login} | ${fecha}\n`, "utf8");
}

const args = process.argv.slice(2);
const doUnfollow = args.includes("--unfollow");
const wlArg = args.find((a) => a.startsWith("--whitelist="));
const delayArg = args.find((a) => a.startsWith("--delay="));
const delayMs = (delayArg ? Number(delayArg.split("=")[1]) : 2) * 1000;

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAllLogins(path) {
  const logins = [];
  let url = `${API}${path}?per_page=100`;
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    logins.push(...(await res.json()).map((u) => u.login));
    // El header Link trae la siguiente página: <url>; rel="next"
    const next = (res.headers.get("link") || "").match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return logins;
}

function loadWhitelist() {
  const set = new Set();
  if (wlArg) wlArg.split("=")[1].split(",").forEach((n) => n && set.add(n.toLowerCase()));
  if (existsSync("whitelist.txt")) {
    readFileSync("whitelist.txt", "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((l) => set.add(l.toLowerCase()));
  }
  return set;
}

async function unfollow(login) {
  const res = await fetch(`${API}/user/following/${login}`, { method: "DELETE", headers });
  if (res.status === 204) return true;
  if (res.status === 403 || res.status === 429) {
    const wait = Number(res.headers.get("retry-after") || 60);
    console.log(`  Límite de uso alcanzado, esperando ${wait}s...`);
    await sleep(wait * 1000);
    return unfollow(login);
  }
  console.log(`  Error ${res.status} con ${login}: ${await res.text()}`);
  return false;
}

const me = await fetch(`${API}/user`, { headers });
if (!me.ok) throw new Error(`${me.status} ${await me.text()}`);
console.log(`Usuario autenticado: ${(await me.json()).login}`);

const followers = new Set((await getAllLogins("/user/followers")).map((l) => l.toLowerCase()));
const following = await getAllLogins("/user/following");
const safe = loadWhitelist();

const ratas = following.filter((l) => !followers.has(l.toLowerCase()) && !safe.has(l.toLowerCase()));

console.log(`Te siguen: ${followers.size} | Sigues: ${following.length} | No te siguen de vuelta: ${ratas.length}\n`);
ratas.forEach((l) => console.log(`  https://github.com/${l}`));

if (ratas.length === 0) process.exit(0);
if (!doUnfollow) {
  console.log("\nModo simulación: no se hizo ningún cambio. Usa --unfollow para ejecutar.");
  process.exit(0);
}

console.log("\nDejando de seguir...");
let done = 0;
for (const l of ratas) {
  if (await unfollow(l)) {
    done++;
    logRata(l);
    console.log(`  ✔ ${l}`);
  }
  await sleep(delayMs);
}
console.log(`\nListo: ${done}/${ratas.length} usuarios dejados de seguir.`);
