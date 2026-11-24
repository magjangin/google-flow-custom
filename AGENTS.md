# google flow custom — 인수인계 문서 (AGENTS.md)

> 작성일 2026-11-24. `youtube studio custom`(GitHub `youtube-studio-tool`)과 같은 구조로 만든 Google Flow 전용 WebView2 뷰어.

## 0. 프로젝트 개요
- **무엇인가:** Google Flow(`https://flow.google.com/`)를 독립 창으로 띄우는 Avalonia WebView 앱(net10). 사용자 스크립트(`Scripts/flow-custom.js`)를 문서 생성 시점에 주입.
- **종류:** 게임 모드가 아닌 앱/도구 → 게임 버전 고정(Build ID/DepotDownloader/.acf)과 Mono/Il2Cpp 백엔드는 **해당 없음**.
- **원격 저장소:** `origin` = https://github.com/magjangin/google-flow-tool (공개, `main`), `local` = `H:\local-repos\google flow custom.git` (로컬 백업 bare 레포). 커밋 후 두 곳 모두 푸시할 것.
- **기술 스택:** .NET 10, Avalonia 12.0.5, `Avalonia.Controls.WebView` 12.0.1, `Microsoft.Web.WebView2` 1.0.3124.44 (youtube studio custom과 같은 버전).

## 1. 검증 상태 (2026-11-24 실측)
- 빌드 성공, 앱 실행 시 `flow.google.com` 로딩 확인 (로그인 전이라 `/about` 랜딩 → Google 로그인 화면 표시).
- 원격 디버깅 포트(CDP)로 확인: Flow 페이지에서 `window.__flowCustomInstalled === true`, `#flow-custom-style` 존재.
- CDP로 Blob 다운로드를 발생시켜 `%USERPROFILE%\Downloads\GoogleFlow_Downloads`에 저장되는 것 확인(테스트 파일은 삭제).
- **미확인:** 실제 Google 로그인 후 Flow 작업 화면, Flow에서 생성한 영상/이미지 다운로드. (로그인은 사용자가 직접 해야 함. youtube studio custom은 같은 WebView2 구성으로 Google 로그인이 되므로 될 것으로 예상.)

## 2. 설계 의도 (Rationale)
- **`GoogleFlowWebView.cs`에 Flow 관련 동작을 모으고 `MainWindow`는 연결만:** youtube studio custom의 `YoutubeStudioWebView`와 같은 분리.
- **전용 영구 프로필** `%LocalAppData%\GoogleFlowCustom\WebView2`, `ProfileName = "GoogleFlowCustom"`: 재시작해도 로그인 유지, 평소 브라우저와 분리.
- **다운로드 폴더** `%USERPROFILE%\Downloads\GoogleFlow_Downloads`: 형제 도구(`SoundCloud_Downloads`, `YouTube_Downloads`, `SteamTrailer_Downloads`) 규칙. Avalonia WebView 공용 API에 없으므로 `TryGetPlatformHandle()` → `ICoreWebView2` → `Profile.DefaultDownloadFolderPath`로 설정.
- **문서 생성 시점 스크립트 + XAML에 Source 미지정:** `AddScriptToExecuteOnDocumentCreatedAsync`는 비동기라, 등록이 끝난 뒤 `AdapterCreated`에서 `Source`를 지정해야 첫 페이지에도 적용된다(youtube studio custom `docs/bugfixes/2026-08-06-flicker-bug.md`와 같은 이유). `NavigationCompleted`의 `InvokeScript`는 2차 안전망.
- **스크립트 호스트 제한:** 문서 생성 스크립트는 `accounts.google.com` 로그인 페이지에서도 실행되므로 `location.hostname !== 'flow.google.com'`이면 즉시 return. 로그인 화면에 손대지 않기 위함.
- **`CUSTOM_CSS`는 비워 둠:** 숨길 요소는 사용자가 정할 일이고, Flow 클래스명은 추측하지 말고 로그인 후 실제 DOM에서 확인해야 한다.

## 3. 핵심 파일
- `google flow custom/GoogleFlowWebView.cs` — 환경(DevTools·프로필), `ConfigureCoreAsync`(다운로드 폴더 + 스크립트 등록), 2차 주입
- `google flow custom/MainWindow.axaml(.cs)` — `NativeWebView` 이벤트 연결
- `google flow custom/Scripts/flow-custom.js` — 임베디드 리소스로 들어가는 사용자 CSS/JS
- `google flow custom/Assets/icon.png|ico` — 앱 아이콘(Pillow로 생성)

## 4. 시도했다가 버린 것 / 주의 (Dead Ends)
- **`labs.google/fx/tools/flow`:** 예전 Flow 주소. 지금은 `https://flow.google.com/`로 308 리다이렉트된다. 시작 URL은 새 주소를 직접 쓴다.
- **빌드 경고 MSB3277 (WindowsBase 4.0 vs 5.0):** `Microsoft.Web.WebView2` 패키지의 WPF 어셈블리 참조 때문. youtube studio custom도 같은 경고가 나며 동작에는 영향 없음.
- **README 배지:** GitHub camo가 shields.io에 504를 내는 경우가 있어 `docs/badges/*.svg`로 저장해 상대 경로로 쓴다.

## 5. 실제 DOM 확인 방법
```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9334"; Start-Process "google flow custom\bin\Debug\net10.0\google flow custom.exe"
```
`http://127.0.0.1:9334/json`에서 `webSocketDebuggerUrl`을 얻어 `Runtime.evaluate`로 조회(Node 22+ 내장 `WebSocket`). 확인 후에는 포트 없이 다시 실행. 앱 안에서 F12도 가능.

## 6. 빌드 · 배포
```powershell
dotnet build "google flow custom.slnx"
dotnet publish "google flow custom/google flow custom.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o "publish/win-x64"
```
- `publish/`는 `.gitignore` 처리됨.
