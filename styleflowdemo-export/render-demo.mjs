import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(flag, fallback = "") {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
}

const port = Number(getArg("--port", "9222"));
const pageUrl = getArg("--page");
const downloadDir = getArg("--downloadDir");
const fileName = getArg("--fileName", "jolofera-demo-promo.webm");
const timeoutMs = Number(getArg("--timeoutMs", "50000"));

if (!pageUrl || !downloadDir) {
  throw new Error("Missing --page or --downloadDir.");
}

const endpoint = `http://127.0.0.1:${port}/json/version`;
const outputPath = path.join(downloadDir, fileName);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDebuggerEndpoint() {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return response.json();
      }
    } catch {}
    await sleep(250);
  }
  throw new Error("Edge DevTools endpoint did not become available.");
}

async function main() {
  fs.mkdirSync(downloadDir, { recursive: true });
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { force: true });
  }

  const version = await waitForDebuggerEndpoint();
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let idCounter = 0;
  const pending = new Map();

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++idCounter;
      pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) {
        payload.sessionId = sessionId;
      }
      ws.send(JSON.stringify(payload));
    });
  }

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      return;
    }
    const task = pending.get(message.id);
    if (!task) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      task.reject(new Error(message.error.message));
      return;
    }
    task.resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  const target = await send("Target.createTarget", {
    url: pageUrl
  });

  const attachment = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true
  });

  const sessionId = attachment.sessionId;
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  const start = Date.now();
  while (Date.now() - start < 10000) {
    const ready = await send(
      "Runtime.evaluate",
      {
        expression: "document.readyState === 'complete' && typeof window.renderPromoBase64 === 'function'",
        returnByValue: true
      },
      sessionId
    );
    if (ready.result?.value) {
      break;
    }
    await sleep(300);
  }

  const result = await send(
    "Runtime.evaluate",
    {
      expression: "window.renderPromoBase64()",
      awaitPromise: true,
      returnByValue: true
    },
    sessionId
  );

  const dataUrl = result.result?.value;
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.includes(",")) {
    throw new Error("The browser did not return encoded video data.");
  }

  const base64 = dataUrl.split(",")[1];
  fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));
  const size = fs.statSync(outputPath).size;
  console.log(JSON.stringify({ outputPath, size }));

  try {
    await send("Browser.close");
  } catch {}
  ws.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
