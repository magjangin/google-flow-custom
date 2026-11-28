// 사용: node mcp/scripts/check_typography_prompt.mjs [제목]
// index.mjs에서 handleFlowGenerateTypography만 떼어내 Flow 없이(크레딧 없이) 배치별 프롬프트의
// 위치 문장과 크기·여백 문장을 출력한다. 프롬프트 규칙을 고친 뒤 방향 충돌이 없는지 확인하는 용도.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "index.mjs"), "utf8");
const start = src.indexOf("async function handleFlowGenerateTypography");
if (start < 0) throw new Error("handleFlowGenerateTypography를 찾지 못했습니다.");
let depth = 0;
let i = src.indexOf("{", src.indexOf(")", start));
for (; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}" && --depth === 0) break;
}
const fnSrc = src.slice(start, i + 1);
const handleFlowType = async () => ({ stub: true }); // 실제 Flow 입력 대신
const fn = new Function("handleFlowType", `${fnSrc}; return handleFlowGenerateTypography;`)(handleFlowType);

const title = process.argv[2] || "드림모드";
const cases = [
  ["bottom (기본)", {}],
  ["top", { placement: "upper wide center foreground across the top" }],
  ["사용자 지정 위치", { placement: "right side next to the logo" }],
  ["slim + bottom", { sizeScale: "slim" }],
];
for (const [label, extra] of cases) {
  const r = await fn({ title, submit: false, ...extra });
  const p = JSON.parse(r.content[0].text).generatedPrompt;
  const pos = p.slice(p.indexOf("positioned at"), p.indexOf("PROPORTION")).trim();
  const end = p.indexOf("CRITICAL") >= 0 ? p.indexOf("CRITICAL") : p.indexOf("Typography text arrangement");
  const clr = p.slice(p.indexOf("PROPORTION"), end).trim();
  console.log(`=== ${label}\n${pos}\n${clr}\n`);
}
