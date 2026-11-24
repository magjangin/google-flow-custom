# Google Flow Custom (Google Flow Tool)

<p align="center">
  <img src="google%20flow%20custom/Assets/icon.png" width="128" height="128" alt="Google Flow Custom Icon" />
</p>

<p align="center">
  <strong>Google Flow(flow.google.com)를 전용 데스크톱 창으로 감싼 커스텀 뷰어</strong><br>
  로그인 유지 · 생성물 전용 다운로드 폴더 · 깜빡임 없는 사용자 CSS/JS 주입
</p>

<p align="center">
  <img src="docs/badges/dotnet.svg" alt=".NET 10" />
  <img src="docs/badges/avalonia.svg" alt="Avalonia UI 12.0.5" />
  <img src="docs/badges/webview2.svg" alt="WebView2" />
  <img src="docs/badges/platform.svg" alt="Platform Windows x64" />
  <img src="docs/badges/version.svg" alt="Version 1.0.0" />
</p>

---

## 💡 개발 배경

Google Flow는 Veo·Imagen 같은 Google 생성 모델로 영상과 이미지를 만드는 AI 크리에이티브 스튜디오입니다.
브라우저 탭에 섞여 있으면 찾기 번거롭고, 만든 결과물이 일반 다운로드 폴더에 뒤섞입니다.

**Google Flow Custom**은 [YouTube Studio Custom](https://github.com/magjangin/youtube-studio-tool)과 같은 방식으로
Flow를 독립 앱 창으로 띄우고, 필요한 화면 수정은 스크립트 한 파일로 추가할 수 있게 만든 도구입니다.

---

## ✨ 핵심 기능

- 🪟 **독립 앱 창**: 실행하면 바로 `https://flow.google.com/`이 열립니다.
- 🔑 **로그인 세션 영구 보존**: 앱 전용 프로필(`%LocalAppData%\GoogleFlowCustom\WebView2`)을 써서 한 번 로그인하면 계속 유지됩니다. 평소 쓰는 브라우저 프로필과는 분리됩니다.
- 📥 **생성물 전용 다운로드 폴더**: Flow에서 받은 영상·이미지는 `%USERPROFILE%\Downloads\GoogleFlow_Downloads`에 저장됩니다.
- ⚡ **깜빡임 없는 사용자 스크립트 주입**: WebView2 `AddScriptToExecuteOnDocumentCreatedAsync`로 페이지가 파싱되기 전에 `Scripts/flow-custom.js`를 넣습니다. 숨기거나 바꾸고 싶은 요소는 이 파일의 `CUSTOM_CSS`에 추가하면 첫 화면부터 적용됩니다.
  - `MutationObserver`로 Flow의 SPA 화면 전환에도 스타일이 유지됩니다.
  - 스크립트는 `flow.google.com`에서만 동작하며 Google 로그인 페이지는 건드리지 않습니다.
- 🛠️ **DevTools(F12) 내장**: 우클릭 "검사"로 실제 DOM을 확인해 selector를 찾을 수 있습니다.
- 🤖 **Antigravity MCP 서버 내장 (`mcp/index.mjs`)**: Chrome DevTools Protocol(CDP, 포트 9334)을 통해 에이전트가 Flow 창을 직접 실행·상태 확인·스크린샷 캡처·프롬프트 입력·생성물 자동 수집까지 프로그래밍 방식으로 조종할 수 있습니다.


---

## 🛠️ 기술 스택

- **프레임워크**: [.NET 10](https://dotnet.microsoft.com/)
- **UI 툴킷**: [Avalonia UI 12.0](https://avaloniaui.net/) + `Avalonia.Controls.WebView`
- **웹 런타임**: [Microsoft.Web.WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (Chromium 기반)
- **대상 OS**: Windows 10 / 11 (64-bit)

---

## 🚀 시작하기

### 사전 요구 사항
- Windows 10 / 11 (x64)
- [.NET 10.0 SDK](https://dotnet.microsoft.com/download)
- Microsoft Edge WebView2 Runtime (최신 Windows에 기본 탑재)

### 빌드 및 실행

```powershell
git clone https://github.com/magjangin/google-flow-tool.git
cd google-flow-tool

# 실행
dotnet run --project "google flow custom/google flow custom.csproj"

# 단일 실행 파일(Single-File) 배포 빌드 → publish\win-x64
dotnet publish "google flow custom/google flow custom.csproj" `
  -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:DebugType=none `
  -o "publish/win-x64"
```

### 화면 수정 추가하기

1. 앱에서 F12로 DevTools를 열어 바꾸고 싶은 요소의 selector를 확인합니다.
2. [`google flow custom/Scripts/flow-custom.js`](google%20flow%20custom/Scripts/flow-custom.js)의 `CUSTOM_CSS`에 규칙을 추가합니다.
3. 다시 빌드해서 실행합니다. 스크립트는 exe에 포함됩니다.

---

설계 의도와 주의사항은 [AGENTS.md](AGENTS.md)를 참고하세요.

> Google Flow 및 생성 모델은 Google의 서비스이며, 이 프로젝트는 Google과 관련이 없는 개인용 뷰어입니다.
