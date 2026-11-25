# Google Flow Custom — PixAI Edition 🎨✨

<p align="center">
  <img src="google%20flow%20custom/Assets/icon.png" width="128" height="128" alt="Google Flow Custom Icon" />
</p>

<p align="center">
  <strong>Google Flow(flow.google.com) 전용 데스크톱 뷰어 & PixAI 감성 애니메/사이버펑크 커스텀</strong><br>
  PixAI 네온 테마 · 퀵 프롬프트 & 16:9 비율 헬퍼 · 영구 로그인 · 전용 다운로드 · 에이전트 MCP 오토메이션
</p>

<p align="center">
  <img src="docs/badges/dotnet.svg" alt=".NET 10" />
  <img src="docs/badges/avalonia.svg" alt="Avalonia UI 12.0.5" />
  <img src="docs/badges/webview2.svg" alt="WebView2" />
  <img src="docs/badges/platform.svg" alt="Platform Windows x64" />
  <img src="docs/badges/version.svg" alt="Version 1.1.0" />
</p>

---

## 💡 프로젝트 개요

**Google Flow Custom (PixAI Edition)**은 Google의 최신 생성 모델(Veo, Imagen 3, Nano Banana 등)을 구동하는 AI 크리에이티브 스튜디오 [Google Flow](https://flow.google.com/)를 독립 데스크톱 창으로 띄우고, **PixAI 감성의 감각적인 애니메/사이버펑크 다크 네온 테마 및 퀵 프롬프트 헬퍼**를 내장한 전문 창작 도구입니다.

일반 브라우저 탭 속 번잡함과 다운로드 파일 혼선을 없애고, 강력한 로컬 에이전트(Antigravity / Claude Code) 제어용 **MCP 서버(`mcp/index.mjs`)**를 기본 탑재하여 완전 자동화 파이프라인을 지원합니다.

---

## ✨ 핵심 기능

### 🎨 1. PixAI 감성 네온 다크 테마 & 애니메 스타일링
- **Deep Violet & Neon Accent**: 딥 바이올렛/네온 핑크/시안 컬러 팔레트(`--pixai-accent-purple`, `--pixai-accent-pink`, `--pixai-accent-cyan`).
- **카드 네온 글로우 & 호버 줌**: 미디어 카드 호버 시 부드러운 스케일 업 및 은은한 네온 림라이트 효과.
- **글래스모피즘 패널**: 반투명 블러 백드롭과 슬림 네온 스크롤바 디자인.
- **원클릭 테마 토글**: 헬퍼 위젯에서 언제든 순정 Flow 다크 테마와 PixAI 테마를 즉시 전환 가능 (설정 영구 저장).

### ⚡ 2. PixAI Studio Helper 툴바 위젯 (`Alt + P`)
- **📐 1클릭 화면 비율 변경**: 번거로운 팝업 메뉴 탐색 없이 `16:9 와이드`, `9:16 쇼츠`, `1:1 정사각`, `4:3 표준`을 1클릭으로 즉시 세팅.
- **🌟 Quality Boost 태그**: `masterpiece`, `best quality`, `ultra-detailed`, `sharp focus`, `detailed eyes`, `mrg style`, `cinematic lighting` 등 고품질 애니 일러스트 프롬프트 즉시 주입.
- **🎀 Anime Character & Style Presets**: `Zero Two`, `Hatsune Miku (Rabbit Hole)`, `1girl solo`, `cyberpunk` 등 대표 서브컬처 프리셋 지원.
- **단축키 지원**: `Alt + P`로 언제든 위젯을 접거나 펼칠 수 있어 작업 영역을 가리지 않습니다.

### 🔑 3. 영구 로그인 세션 (Isolated Session)
- 앱 전용 프로필(`%LocalAppData%\GoogleFlowCustom\WebView2`)을 사용하여 Google 로그인이 영구 유지됩니다.
- 평소 사용하는 메인 브라우저(Edge, Chrome 등)의 쿠키 및 프로필과 완벽히 격리됩니다.

### 📥 4. 전용 다운로드 폴더 자동 분리
- Flow에서 다운로드하는 고화질 이미지 및 영상은 모두 전용 폴더에 자동 저장됩니다:
  ```text
  %USERPROFILE%\Downloads\GoogleFlow_Downloads
  ```

### 🤖 5. Antigravity & Claude Code MCP 서버 내장 (`mcp/index.mjs`)
- Chrome DevTools Protocol(CDP, 포트 `9334`)을 통해 AI 코딩 에이전트가 Flow를 원격 제어할 수 있습니다:
  - `flow_launch`: 전용 앱 실행 및 CDP 연결
  - `flow_status`: 현재 화면 상태 및 로그인 여부 확인
  - `flow_type`: 프롬프트 입력 및 자동 생성 제출(`submit: true`)
  - `flow_click`: 물리 마우스 이벤트 기반 정확한 버튼 클릭
  - `flow_upload_media`: Image-to-Image 참조 합성을 위한 로컬 파일 일괄 업로드
  - `flow_screenshot`: 실시간 작업 화면 캡처 모니터링
  - `flow_get_downloads`: 다운로드된 생성물 목록 확인 및 수집

---

## 🛠️ 기술 스택

- **프레임워크**: [.NET 10](https://dotnet.microsoft.com/)
- **UI 툴킷**: [Avalonia UI 12.0.5](https://avaloniaui.net/) + `Avalonia.Controls.WebView 12.0.1`
- **웹 런타임**: [Microsoft.Web.WebView2 1.0.3124.44](https://developer.microsoft.com/microsoft-edge/webview2/) (Chromium)
- **에이전트 제어**: Node.js 내장 WebSocket 기반 Chrome DevTools Protocol (CDP)
- **대상 OS**: Windows 10 / 11 (64-bit)

---

## 🚀 빠른 시작

### 사전 요구 사항
- Windows 10 / 11 (x64)
- [.NET 10.0 SDK](https://dotnet.microsoft.com/download)
- Microsoft Edge WebView2 Runtime (Windows 기본 탑재)

### 빌드 및 실행

```powershell
# 저장소 클론
git clone https://github.com/magjangin/google-flow-custom.git
cd google-flow-custom

# 개발 모드 빌드 및 실행
dotnet run --project "google flow custom/google flow custom.csproj"

# 배포용 단일 실행 파일(Single-File) 빌드 → publish\win-x64\google flow custom.exe
dotnet publish "google flow custom/google flow custom.csproj" `
  -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:DebugType=none `
  -o "publish/win-x64"
```

---

## 🤖 MCP 서버 설정 (AI 에이전트 연동)

Antigravity 또는 Claude Code에서 Flow를 자율 조종할 수 있도록 `mcp_config.json`에 추가할 수 있습니다:

```json
{
  "mcpServers": {
    "google-flow-custom": {
      "command": "node",
      "args": ["H:/source/repos/google flow custom/mcp/index.mjs"]
    }
  }
}
```

---

## 📂 프로젝트 구조

```text
google-flow-custom/
├── google flow custom/
│   ├── App.axaml (.cs)             # Avalonia 애플리케이션 수명 주기
│   ├── MainWindow.axaml (.cs)      # 메인 윈도우 레이아웃 및 뷰어 바인딩
│   ├── GoogleFlowWebView.cs        # WebView2 환경 구성 (프로필, 다운로드, 스크립트 주입)
│   ├── Scripts/
│   │   └── flow-custom.js          # PixAI 테마 & 스튜디오 헬퍼 위젯 (임베디드 리소스)
│   └── Assets/
│       └── icon.png / icon.ico     # 애플리케이션 아이콘
├── mcp/
│   └── index.mjs                   # CDP 기반 Antigravity/Claude Code MCP 서버
├── publish/win-x64/                # 단일 실행 파일 빌드 산출물
├── docs/badges/                    # 로컬 렌더링용 SVG 배지
├── AGENTS.md                       # 멀티 에이전트 인수인계 문서
└── README.md                       # 메인 소개 문서
```

---

## 📜 라이선스 및 고지 사항

- Google Flow 및 관련 생성 AI 모델은 Google의 고유 상표 및 서비스입니다.
- 본 프로젝트는 Google과 공식적인 관련이 없으며, 창작 편의를 위해 개발된 비공식 오픈소스 도구입니다.
- 본 도구는 오픈소스 소프트웨어 라이선스에 따라 자유롭게 사용 및 수정할 수 있습니다.
