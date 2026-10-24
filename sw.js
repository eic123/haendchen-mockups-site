// Serves the decrypted mockups (put into Cache Storage by index.html) under ./app/.
var BUILD = "02a5b71cc2eb", CACHE = "site-" + BUILD;
var APP = new URL("app/", self.registration.scope).href;
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  var req = e.request, url = req.url.split("#")[0].split("?")[0];
  if (req.method !== "GET" || url.indexOf(APP) !== 0) return;
  if (url === APP) url += "index.html";
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(url); }).then(function (res) {
    if (!res) {
      // locked (or an old build): back to the password page
      if (req.mode === "navigate") return Response.redirect(self.registration.scope, 302);
      return new Response("", { status: 404 });
    }
    var range = req.headers.get("Range");
    if (!range) return res;
    // media (video) asks for byte ranges
    return res.arrayBuffer().then(function (buf) {
      var m = /bytes=(\d*)-(\d*)/.exec(range), size = buf.byteLength;
      var start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], size - 1) : size - 1;
      if (m && !m[1] && m[2]) { start = Math.max(size - +m[2], 0); end = size - 1; }
      if (start >= size || start > end) return new Response("", { status: 416, headers: { "Content-Range": "bytes */" + size } });
      return new Response(buf.slice(start, end + 1), { status: 206, headers: {
        "Content-Type": res.headers.get("Content-Type"), "Content-Length": String(end - start + 1),
        "Content-Range": "bytes " + start + "-" + end + "/" + size, "Accept-Ranges": "bytes" } });
    });
  }));
});
