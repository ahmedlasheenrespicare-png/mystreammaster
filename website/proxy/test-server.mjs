/* سيرفر اختبار محلي — يغلّف worker.js بواجهة Node لتجربته قبل النشر */
import http from "node:http";
import worker from "./worker.js";

const PORT = Number(process.env.PORT || 8787);
/* الاستماع على 127.0.0.1 افتراضياً — الافتراضي في Node هو كل الواجهات
   فيصبح الوسيط متاحاً لأي جهاز على شبكتك المحلية أثناء التطوير.
   للتجاوز (مثلاً للتجربة من الجوال): HOST=0.0.0.0 node proxy/test-server.mjs */
const HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
    }
    const request = new Request(url, { method: req.method, headers });
    const resp = await worker.fetch(request);

    const outHeaders = {};
    resp.headers.forEach((v, k) => (outHeaders[k] = v));
    res.writeHead(resp.status, outHeaders);

    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✓ وسيط الاختبار يعمل على http://${HOST}:${PORT}`);
});
