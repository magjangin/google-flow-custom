# google flow custom — 인수인계 문서 (AGENTS.md)

> 갱신일: 2026-11-25. `youtube studio custom`(GitHub `youtube-studio-tool`)과 같은 구조로 만든 Google Flow 전용 WebView2 뷰어 & PixAI 에디션.

## 0. 프로젝트 개요
- **무엇인가:** Google Flow(`https://flow.google.com/`)를 독립 창으로 띄우는 Avalonia WebView 앱(net10). 사용자 스크립트(`Scripts/flow-custom.js`)를 문서 생성 시점에 주입하여 **PixAI 스타일 애니메/사이버 다크 네온 테마 및 퀵 프롬프트/비율 헬퍼 위젯** 제공.
- **MCP 연동:** `mcp/index.mjs`에 Antigravity/Claude Code용 MCP 서버 내장(`google-flow-custom`). Antigravity 쿼터 보존 또는 자동화 시 CDP(`--remote-debugging-port=9334`)를 통해 에이전트가 직접 Flow를 조종하여 프롬프트 입력, 16:9 비율 변경, 소재 업로드, 자동 생성 및 다운로드 파이프라인 수행.
- **종류:** 게임 모드가 아닌 앱/도구 → 게임 버전 고정(Build ID/DepotDownloader/.acf)과 Mono/Il2Cpp 백엔드는 **해당 없음**.
- **원격 저장소:** `origin` = https://github.com/magjangin/google-flow-custom (공개, `main`), `local` = `H:\local-repos\google flow custom.git` (로컬 백업 bare 레포). 커밋 후 두 곳 모두 푸시할 것.
- **기술 스택:** .NET 10, Avalonia 12.0.5, `Avalonia.Controls.WebView` 12.0.1, `Microsoft.Web.WebView2` 1.0.3124.44.

## 1. 검증 상태 (2026-11-25 실측)
- **로그인 및 작업 화면:** 실제 Google 로그인 세션 유지 상태에서 Flow 프로젝트 생성 및 작업 화면 접근 정상 작동 확인.
- **16:9 와이드 이미지 생성:** Nano Banana 2.1 모델로 16:9 비율(1376×768 해상도) 이미지 2장 동시 생성 실측 완료 (Zero Two 및 Hatsune Miku Rabbit Hole 고화질 일러스트).
- **자동 다운로드 파이프라인:** 웹 상에서 fetch -> Blob 생성 -> `%USERPROFILE%\Downloads\GoogleFlow_Downloads`로 자동 수집 및 MCP `flow_get_downloads` 연동 검증.
- **PixAI Edition 기능 검증:**
  - `flow-custom.js`: 딥 바이올렛/네온 다크 테마(CSS), 카드 호버 네온 글로우, 슬림 스크롤바.
  - PixAI Studio Helper 위젯: 1클릭 16:9/9:16/1:1/4:3 비율 변경, Quality Boost 태그, 애니메 프리셋, 테마 ON/OFF 스위치, `Alt + P` 단축키 토글.
  - MCP `handleFlowClick` / `handleFlowType`: Angular/ProseMirror 대응 물리 마우스 이벤트 및 `insertText` 주입, `submit: true` 지원.

## 2. 설계 의도 (Rationale)
- **`GoogleFlowWebView.cs`에 Flow 관련 동작을 모으고 `MainWindow`는 연결만:** youtube studio custom의 `YoutubeStudioWebView`와 같은 분리.
- **전용 영구 프로필** `%LocalAppData%\GoogleFlowCustom\WebView2`, `ProfileName = "GoogleFlowCustom"`: 재시작해도 로그인 유지, 평소 브라우저와 분리.
- **다운로드 폴더** `%USERPROFILE%\Downloads\GoogleFlow_Downloads`: 형제 도구(`SoundCloud_Downloads`, `YouTube_Downloads`, `SteamTrailer_Downloads`) 규칙. Avalonia WebView 공용 API에 없으므로 `TryGetPlatformHandle()` → `ICoreWebView2` → `Profile.DefaultDownloadFolderPath`로 설정.
- **문서 생성 시점 스크립트 + XAML에 Source 미지정:** `AddScriptToExecuteOnDocumentCreatedAsync`는 비동기라, 등록이 끝난 뒤 `AdapterCreated`에서 `Source`를 지정해야 첫 페이지에도 적용된다(youtube studio custom `docs/bugfixes/2026-08-06-flicker-bug.md`와 같은 이유). `NavigationCompleted`의 `InvokeScript`는 2차 안전망.
- **스크립트 호스트 제한:** 문서 생성 스크립트는 `accounts.google.com` 로그인 페이지에서도 실행되므로 `location.hostname !== 'flow.google.com'`이면 즉시 return. 로그인 화면에 손대지 않기 위함.
- **ProseMirror 입력 특성:** 일반 DOM `input.value = ...`나 `innerText = ...`만으로는 내부 state가 갱신되지 않아 빈 프롬프트로 인식됨. 반드시 `editor.focus()` 후 `document.execCommand('insertText')` 및 CDP `Input.dispatchMouseEvent`로 좌표 클릭을 쏴야 생성 버튼이 정확히 활성화/트리거됨.

## 3. 핵심 파일
- `google flow custom/GoogleFlowWebView.cs` — 환경(DevTools·프로필), `ConfigureCoreAsync`(다운로드 폴더 + 스크립트 등록), 2차 주입
- `google flow custom/MainWindow.axaml(.cs)` — `NativeWebView` 이벤트 연결
- `google flow custom/Scripts/flow-custom.js` — PixAI 스타일 테마 및 퀵 프롬프트 헬퍼 위젯 (임베디드 리소스)
- `google flow custom/Assets/icon.png|ico` — 앱 아이콘
- `mcp/index.mjs` — Antigravity/Claude Code 연동용 MCP 서버 (CDP 원격 제어: 실행, 상태, 물리 클릭, 프롬프트 입력/제출, 미디어 업로드, 다운로드 수집)

## 4. 합성 품질 이슈 및 Image-to-Image 참조 필수 원칙
- **문제 진단:** Text-to-Image(순수 텍스트 프롬프트)만 주입할 경우 모델이 텍스트 설명만 보고 캐릭터를 처음부터 다시 그려 원작의 고유 선화·그림체·채색 스타일이 왜곡되는 이질감 발생.
- **해결 방안:** 기준 이미지와 대상 썸네일 2장을 **Flow 프로젝트의 '미디어 업로드(소재 추가)'로 등록**한 뒤 참조 소재로 지정하여 생성해야 1:1 원화 보존 품질 달성 가능.
- **MCP 지원:** `flow_upload_media` 도구를 통해 CDP(`DOM.setFileInputFiles`)로 Flow 웹 화면의 `<input type="file">`에 로컬 이미지 2장을 직접 업로드하고 프롬프트 참조로 연결 가능.

## 5. 시도했다가 버린 것 / 주의 (Dead Ends)
- **`labs.google/fx/tools/flow`:** 예전 Flow 주소. 지금은 `https://flow.google.com/`로 308 리다이렉트된다. 시작 URL은 새 주소를 직접 쓴다.
- **빌드 경고 MSB3277 (WindowsBase 4.0 vs 5.0):** `Microsoft.Web.WebView2` 패키지의 WPF 어셈블리 참조 때문. 동작에는 영향 없음.
- **일반 button.click() 트리거 실패:** Angular Material Button 및 ProseMirror 상호작용 시 단순 `btn.click()`이 무시될 수 있음. CDP의 `Input.dispatchMouseEvent`로 바운딩 렉트 중심 좌표를 쏴야 안정적으로 동작함.

## 6. 실제 DOM 확인 방법
```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9334"; Start-Process "google flow custom\bin\Debug\net10.0\google flow custom.exe"
```
`http://127.0.0.1:9334/json`에서 `webSocketDebuggerUrl`을 얻어 `Runtime.evaluate`로 조회. 앱 안에서 F12도 가능.

## 7. 빌드 · 배포
```powershell
dotnet build "google flow custom.slnx"
dotnet publish "google flow custom/google flow custom.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o "publish/win-x64"
```
- `publish/`는 `.gitignore` 처리됨.
