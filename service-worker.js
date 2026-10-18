"use strict";

const CACHE_NAME = "mission-edu-question-maker-v1";

const APP_FILES = [
"/",
"/index.html",
"/style.css",
"/script.js",
"/manifest.json",
"/logo.png"
];

self.addEventListener("install", (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then(async (cache) => {
await Promise.all(
APP_FILES.map(async (url) => {
try {
const response = await fetch(url);

        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn("تعذر تخزين الملف:", url);
      }
    })
  );

  await self.skipWaiting();
})

);
});

self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then(async (keys) => {
await Promise.all(
keys
.filter((key) => key !== CACHE_NAME)
.map((key) => caches.delete(key))
);

  await self.clients.claim();
})

);
});

self.addEventListener("fetch", (event) => {
const request = event.request;

if (request.method !== "GET") return;

const url = new URL(request.url);

if (url.origin !== self.location.origin) return;

event.respondWith(
caches.match(request).then(async (cachedResponse) => {
if (cachedResponse) return cachedResponse;

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (request.mode === "navigate") {
      const offlinePage = await caches.match("/index.html");

      if (offlinePage) return offlinePage;
    }

    return new Response(
      "أنت غير متصل بالإنترنت. افتح الموقع مرة واحدة بالإنترنت أولًا.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
})

);
});