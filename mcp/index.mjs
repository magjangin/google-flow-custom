import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const DEFAULT_PORT = 9334;
const DEFAULT_EXE_PATHS = [
  "H:\\source\\repos\\google flow custom\\publish\\win-x64\\google flow custom.exe",
  "H:\\source\\repos\\google flow custom\\google flow custom\\bin\Debug\\net10.0\\google flow custom.exe"
];
const DOWNLOADS_DIR = join(homedir(), "Downloads", "GoogleFlow_Downloads");

let activeWs = null;
let nextReqId = 1;

async function getPages(port = DEFAULT_PORT) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function ensureAppRunning(port = DEFAULT_PORT) {
  let pages = await getPages(port);
  if (pages && pages.length > 0) return { port, pages };

  let exePath = DEFAULT_EXE_PATHS.find(p => existsSync(p));
  if (!exePath) {
    throw new Error("google flow custom.exe 실행 파일을 찾을 수 없습니다.");
  }

  const child = spawn(exePath, [], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`
    }
  });
  child.unref();

  // 최대 15초 대기
  const start = Date.now();
  while (Date.now() - start < 15000) {
    await new Promise(r => setTimeout(r, 800));
    pages = await getPages(port);
    if (pages && pages.length > 0) {
      return { port, pages };
    }
  }

  throw new Error("Google Flow Custom 앱을 시작했으나 CDP 포트 응답을 받지 못했습니다.");
}

async function getActiveWs(port = DEFAULT_PORT) {
  if (activeWs && activeWs.readyState === WebSocket.OPEN) {
    return activeWs;
  }

  const pages = await getPages(port);
  if (!pages || pages.length === 0) {
    throw new Error("실행 중인 Flow 페이지를 찾을 수 없습니다. flow_launch를 먼저 호출해주세요.");
  }

  // flow.google.com 페이지 우선, 없으면 첫 번째 page 타입
  let target = pages.find(p => p.url && p.url.includes("flow.google.com") && p.webSocketDebuggerUrl);
  if (!target) {
    target = pages.find(p => p.type === "page" && p.webSocketDebuggerUrl);
  }
  if (!target) target = pages[0];

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  activeWs = ws;
  return ws;
}

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextReqId++;
    const timer = setTimeout(() => {
      ws.removeEventListener("message", handler);
      reject(new Error(`CDP 요청 시간 초과: ${method}`));
    }, 20000);

    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          clearTimeout(timer);
          ws.removeEventListener("message", handler);
          if (msg.error) {
            reject(new Error(`CDP 오류 (${method}): ${JSON.stringify(msg.error)}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        // ignore parse error
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// ================= Tool Handlers =================

async function handleFlowLaunch(args) {
  const port = args?.port || DEFAULT_PORT;
  const { pages } = await ensureAppRunning(port);
  const target = pages.find(p => p.type === "page") || pages[0];
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        message: "Google Flow Custom 앱이 연결되었습니다.",
        port,
        targetTitle: target?.title,
        targetUrl: target?.url
      }, null, 2)
    }]
  };
}

async function handleFlowStatus() {
  const ws = await getActiveWs();
  const evalRes = await sendCdp(ws, "Runtime.evaluate", {
    expression: `(() => {
      return {
        url: location.href,
        title: document.title,
        isLoginNeeded: location.hostname === 'accounts.google.com',
        isFlow: location.hostname === 'flow.google.com',
        bodyTextSnippet: document.body ? document.body.innerText.slice(0, 300) : ''
      };
    })()`,
    returnByValue: true
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify(evalRes?.result?.value || evalRes, null, 2)
    }]
  };
}

async function handleFlowNavigate(args) {
  const url = args?.url || "https://flow.google.com/";
  const ws = await getActiveWs();
  await sendCdp(ws, "Page.navigate", { url });
  return {
    content: [{
      type: "text",
      text: `페이지를 ${url} 로 이동했습니다.`
    }]
  };
}

async function handleFlowEval(args) {
  const script = args?.script;
  if (!script) throw new Error("script 매개변수가 필요합니다.");
  const ws = await getActiveWs();
  const res = await sendCdp(ws, "Runtime.evaluate", {
    expression: script,
    returnByValue: true,
    awaitPromise: true
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify(res?.result?.value ?? res?.result ?? res, null, 2)
    }]
  };
}

async function handleFlowClick(args) {
  const { selector } = args;
  if (!selector) throw new Error("selector 매개변수가 필요합니다.");
  const ws = await getActiveWs();
  
  // 1. 요소 위치 및 태그 정보 조회
  const locateScript = `(() => {
    let el = document.querySelector(${JSON.stringify(selector)});
    if (!el) {
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [aria-label]'));
      el = buttons.find(b => (b.innerText || '').includes(${JSON.stringify(selector)}) || b.getAttribute('aria-label') === ${JSON.stringify(selector)});
    }
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName,
      text: el.innerText,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  })()`;

  const locateRes = await sendCdp(ws, "Runtime.evaluate", {
    expression: locateScript,
    returnByValue: true
  });

  const targetInfo = locateRes?.result?.value;
  if (!targetInfo) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: false, error: '요소를 찾을 수 없습니다: ' + selector }, null, 2)
      }]
    };
  }

  // 2. CDP 마우스 이벤트로 정확한 물리 클릭 발생 (Angular/Material/ProseMirror 대응)
  if (targetInfo.x > 0 && targetInfo.y > 0) {
    await sendCdp(ws, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: Math.round(targetInfo.x),
      y: Math.round(targetInfo.y),
      button: "left",
      clickCount: 1
    });
    await sendCdp(ws, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: Math.round(targetInfo.x),
      y: Math.round(targetInfo.y),
      button: "left",
      clickCount: 1
    });
  }

  // 3. JS 클릭도 폴백으로 트리거
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `(() => {
      let el = document.querySelector(${JSON.stringify(selector)});
      if (!el) {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [aria-label]'));
        el = buttons.find(b => (b.innerText || '').includes(${JSON.stringify(selector)}) || b.getAttribute('aria-label') === ${JSON.stringify(selector)});
      }
      if (el) el.click();
    })()`
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({ success: true, ...targetInfo }, null, 2)
    }]
  };
}

async function handleFlowType(args) {
  const { selector, text, submit = false, autoOptimize = true } = args;
  if (!text) throw new Error("text 매개변수가 필요합니다.");
  const ws = await getActiveWs();
  
  // Danbooru 태그(character:, copyright:, mrg style 등) 감지 시 2D 애니 원화 최적화 변환 적용
  const script = `(() => {
    let inputStr = ${JSON.stringify(text)};
    if (${autoOptimize} && (inputStr.includes('character:') || inputStr.includes('copyright:') || inputStr.includes('mrg style') || inputStr.includes('rabbit hole'))) {
      if (typeof window.__flowOptimizeDanbooruPrompt === 'function') {
        inputStr = window.__flowOptimizeDanbooruPrompt(inputStr);
      } else {
        // 내장 폴백 변환기
        let charMatch = inputStr.match(/character:\\s*([^,\\n]+)/i);
        let copyMatch = inputStr.match(/copyright:\\s*([^,\\n]+)/i);
        let char = charMatch ? charMatch[1].replace(/\\([^)]+\\)/g, '').replace(/_/g, ' ').trim() : '';
        let copy = copyMatch ? copyMatch[1].replace(/_/g, ' ').trim() : '';
        let rest = inputStr.replace(/character:\\s*[^,\\n]+/gi, '').replace(/copyright:\\s*[^,\\n]+/gi, '').replace(/^[,\\s]+|[,\\s]+$/g, '');
        rest = rest.replace(/\\bmrg style\\b/gi, 'Rabbit Hole MV anime key visual style').replace(/\\brabbit hole\\b/gi, 'Rabbit Hole theme, vibrant hot pink circular spotlight, bunny girl, fishnet stockings');
        inputStr = '2D anime illustration, masterpiece, high-end Japanese anime key visual, clean sharp outlines, cell shaded' + (char ? ', ' + char : '') + (copy ? ' from ' + copy : '') + ', ' + rest;
      }
    }

    let el = ${selector ? `document.querySelector(${JSON.stringify(selector)})` : `document.activeElement`};
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) {
      const inputs = Array.from(document.querySelectorAll('.ProseMirror, textarea, input[type="text"], [contenteditable="true"]'));
      if (inputs.length > 0) el = inputs[0];
    }
    if (!el) return { success: false, error: '입력 필드를 찾을 수 없습니다.' };
    el.focus();
    
    if (el.classList.contains('ProseMirror') || el.isContentEditable) {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, inputStr);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.value = inputStr;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return { success: true, original: ${JSON.stringify(text)}, appliedPrompt: inputStr };
  })()`;

  const res = await sendCdp(ws, "Runtime.evaluate", {
    expression: script,
    returnByValue: true
  });

  if (submit) {
    await new Promise(r => setTimeout(r, 200));
    await handleFlowClick({ selector: '[aria-label="생성 시작"]' });
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify(res?.result?.value || res, null, 2)
    }]
  };
}

async function handleFlowUploadMedia(args) {
  const { files, selector = 'input[type="file"]' } = args;
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("files 매개변수(파일 경로 배열)가 필요합니다.");
  }

  // 모든 파일 경로 존재 여부 검사
  for (const file of files) {
    if (!existsSync(file)) {
      throw new Error(`파일을 찾을 수 없습니다: ${file}`);
    }
  }

  const ws = await getActiveWs();
  await sendCdp(ws, "DOM.enable");
  const doc = await sendCdp(ws, "DOM.getDocument", { depth: -1 });

  let queryRes;
  try {
    queryRes = await sendCdp(ws, "DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector
    });
  } catch (err) {
    throw new Error(`파일 입력 요소를 찾는 중 오류 발생 (${selector}): ${err.message}`);
  }

  if (!queryRes || !queryRes.nodeId || queryRes.nodeId === 0) {
    throw new Error(`화면에서 파일 입력 요소(${selector})를 찾을 수 없습니다. 미디어 추가 버튼을 먼저 클릭해야 할 수 있습니다.`);
  }

  await sendCdp(ws, "DOM.setFileInputFiles", {
    nodeId: queryRes.nodeId,
    files
  });

  // input/change 이벤트 트리거
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        message: "미디어 파일이 성공적으로 업로드(주입)되었습니다.",
        uploadedFiles: files,
        targetSelector: selector
      }, null, 2)
    }]
  };
}

async function handleFlowScreenshot(args) {
  const ws = await getActiveWs();
  const cdpRes = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const buffer = Buffer.from(cdpRes.data, "base64");
  const filename = `flow_screenshot_${Date.now()}.png`;
  const outPath = args?.savePath || join(tmpdir(), filename);
  await import("node:fs/promises").then(fs => fs.writeFile(outPath, buffer));

  return {
    content: [
      {
        type: "text",
        text: `스크린샷이 저장되었습니다: ${outPath}`
      }
    ]
  };
}

async function handleFlowGetDownloads(args) {
  if (!existsSync(DOWNLOADS_DIR)) {
    return { content: [{ type: "text", text: `다운로드 폴더가 아직 존재하지 않습니다: ${DOWNLOADS_DIR}` }] };
  }

  const files = readdirSync(DOWNLOADS_DIR)
    .map(name => {
      const fullPath = join(DOWNLOADS_DIR, name);
      const stat = statSync(fullPath);
      return { name, path: fullPath, mtime: stat.mtimeMs, size: stat.size };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const destFolder = args?.destinationFolder;
  let copied = [];
  if (destFolder && files.length > 0) {
    if (!existsSync(destFolder)) mkdirSync(destFolder, { recursive: true });
    // 가장 최근 파일 1개(또는 요청된 만큼) 복사
    const latest = files[0];
    const targetPath = join(destFolder, latest.name);
    copyFileSync(latest.path, targetPath);
    copied.push({ source: latest.path, destination: targetPath });
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        downloadsDir: DOWNLOADS_DIR,
        recentFiles: files.slice(0, 5),
        copied
      }, null, 2)
    }]
  };
}

// ================= MCP Server JSON-RPC Protocol =================

const TOOLS = [
  {
    name: "flow_launch",
    description: "Google Flow Custom 데스크톱 앱을 CDP 디버깅 모드로 실행하고 연결을 초기화합니다.",
    inputSchema: {
      type: "object",
      properties: {
        port: { type: "number", description: "CDP 원격 디버깅 포트 (기본값: 9334)" }
      }
    }
  },
  {
    name: "flow_status",
    description: "현재 Google Flow 페이지의 URL, 제목, 로그인 상태, DOM 요약 정보를 확인합니다.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "flow_navigate",
    description: "Google Flow 창 내에서 지정된 URL로 이동합니다.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "이동할 URL (기본값: https://flow.google.com/)" }
      }
    }
  },
  {
    name: "flow_eval",
    description: "Google Flow 웹페이지 콘텍스트에서 임의의 JavaScript 코드를 실행하고 반환값을 얻습니다.",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "실행할 JavaScript 코드" }
      },
      required: ["script"]
    }
  },
  {
    name: "flow_click",
    description: "Flow 페이지의 특정 버튼이나 요소를 클릭합니다. CSS 선택자 또는 텍스트로 지정 가능합니다.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS 선택자 또는 버튼 텍스트" }
      },
      required: ["selector"]
    }
  },
  {
    name: "flow_type",
    description: "Flow 페이지의 입력 필드(프롬프트 창 등)에 텍스트를 입력합니다.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "입력할 텍스트(프롬프트)" },
        selector: { type: "string", description: "대상 CSS 선택자 (생략 시 첫 번째 입력 필드 또는 활성 요소)" },
        submit: { type: "boolean", description: "입력 후 생성 시작 버튼을 자동으로 클릭할지 여부 (기본값: false)" }
      },
      required: ["text"]
    }
  },
  {
    name: "flow_upload_media",
    description: "Google Flow 웹 화면에 로컬 이미지 파일들을 업로드(미디어/소재 추가)합니다. Image-to-Image 참조 합성을 위해 기준 배경 및 대상 썸네일을 등록할 때 사용합니다.",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "업로드할 로컬 이미지 파일의 절대 경로 배열"
        },
        selector: {
          type: "string",
          description: "파일 입력 input 요소의 CSS 선택자 (기본값: input[type=\"file\"])"
        }
      },
      required: ["files"]
    }
  },
  {
    name: "flow_screenshot",
    description: "현재 Google Flow 창의 실제 화면을 캡처하여 이미지 파일로 저장하고 경로를 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        savePath: { type: "string", description: "저장할 파일 경로 (생략 시 임시 폴더에 png로 저장)" }
      }
    }
  },
  {
    name: "flow_get_downloads",
    description: "Google Flow 다운로드 폴더(Downloads/GoogleFlow_Downloads)의 최신 생성물 파일 목록을 조회하고 지정된 폴더(composites 등)로 복사합니다.",
    inputSchema: {
      type: "object",
      properties: {
        destinationFolder: { type: "string", description: "복사할 대상 폴더 경로 (예: H:\\source\\repos\\image\\composites)" }
      }
    }
  }
];

// Stdio JSON-RPC 핸들러
let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop(); // 마지막 불완전 라인 유지

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req = JSON.parse(trimmed);
      handleRpc(req);
    } catch (e) {
      // JSON 파싱 에러 무시
    }
  }
});

async function handleRpc(req) {
  const { id, method, params } = req;
  if (!method) return;

  if (method === "initialize") {
    sendResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "google-flow-custom",
        version: "1.0.0"
      }
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    sendResponse(id, { tools: TOOLS });
    return;
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      let res;
      switch (name) {
        case "flow_launch": res = await handleFlowLaunch(args); break;
        case "flow_status": res = await handleFlowStatus(args); break;
        case "flow_navigate": res = await handleFlowNavigate(args); break;
        case "flow_eval": res = await handleFlowEval(args); break;
        case "flow_click": res = await handleFlowClick(args); break;
        case "flow_type": res = await handleFlowType(args); break;
        case "flow_upload_media": res = await handleFlowUploadMedia(args); break;
        case "flow_screenshot": res = await handleFlowScreenshot(args); break;
        case "flow_get_downloads": res = await handleFlowGetDownloads(args); break;
        default:
          throw new Error(`알 수 없는 도구: ${name}`);
      }
      sendResponse(id, res);
    } catch (err) {
      sendResponse(id, {
        content: [{ type: "text", text: `오류 발생: ${err.message}` }],
        isError: true
      });
    }
    return;
  }

  // 지원하지 않는 메소드
  if (id !== undefined) {
    sendResponse(id, { error: { code: -32601, message: "Method not found" } });
  }
}

function sendResponse(id, resultOrObj) {
  if (id === undefined) return;
  const payload = resultOrObj.error
    ? { jsonrpc: "2.0", id, error: resultOrObj.error }
    : { jsonrpc: "2.0", id, result: resultOrObj };
  process.stdout.write(JSON.stringify(payload) + "\n");
}
