# google flow custom — 인수인계 문서 (AGENTS.md)

> 갱신일: 2026-11-25. `youtube studio custom`(GitHub `youtube-studio-tool`)과 같은 구조로 만든 Google Flow 전용 WebView2 뷰어.

## 0. 프로젝트 개요
- **무엇인가:** Google Flow(`https://flow.google.com/`)를 독립 창으로 띄우는 Avalonia WebView 앱(net10). 사용자 스크립트(`Scripts/flow-custom.js`)를 문서 생성 시점에 주입.
- **MCP 연동:** `mcp/index.mjs`에 Antigravity/Claude Code용 MCP 서버 내장(`google-flow-custom`). CDP(`--remote-debugging-port=9334`)를 통해 에이전트가 직접 Flow를 조종하여 프롬프트 입력, 16:9 와이드 비율 생성, 소재 DataTransfer 업로드, 알잘딱 타이포그래피 생성 및 다운로드 파이프라인 수행.
- **종류:** 게임 모드가 아닌 앱/도구 → 게임 버전 고정(Build ID/DepotDownloader/.acf)과 Mono/Il2Cpp 백엔드는 **해당 없음**.
- **원격 저장소:** `origin` = https://github.com/magjangin/google-flow-custom (공개, `main`), `local` = `H:\local-repos\google flow custom.git` (로컬 백업 bare 레포). 커밋 후 두 곳 모두 푸시할 것.
- **기술 스택:** .NET 10, Avalonia 12.0.5, `Avalonia.Controls.WebView` 12.0.1, `Microsoft.Web.WebView2` 1.0.3124.44.

## 1. 검증 상태 (2026-11-25 실측)
- **로그인 및 작업 화면:** 실제 Google 로그인 세션 유지 상태에서 Flow 프로젝트 생성 및 작업 화면 접근 정상 작동 확인.
- **16:9 와이드 이미지 생성:** Nano Banana 2.1 모델로 16:9 비율(1376×768 해상도) 이미지 2장 동시 생성 실측 완료 (Zero Two, Hatsune Miku, Kasane Teto).
- **자동 다운로드 파이프라인:** 웹 상에서 fetch -> Blob 생성 -> `%USERPROFILE%\Downloads\GoogleFlow_Downloads`로 자동 수집 및 MCP `flow_get_downloads` 연동 검증.
- **MCP 제어 검증:**
  - `handleFlowClick`: Angular Material Button 및 ProseMirror 대응 물리 마우스 이벤트(`Input.dispatchMouseEvent`) 중심 좌표 클릭 성공.
  - `handleFlowType`: ProseMirror `insertText` 주입 및 `submit: true` 연동 정상 동작. 상세 편집 모드에서 `.ProseMirror` 최우선 타깃 탐색 적용.
  - `handleFlowUploadMedia`: CDP DataTransfer(`dragenter`, `dragover`, `drop`) 기반 로컬 다중 파일 업로드 지원.
  - `handleFlowGenerateTypography`: 유튜브 썸네일 & 리듬게임 커스텀 차트 전용 알잘딱 타이포그래피(하단 와이드 2열 배치, 네온 아우터 글로우, 이중 외곽선, 네거티브 스페이스 심볼 음각) 생성 자동화. 카사네 테토 **「TETORIS」**, 제로투 **「ZERO TWO」**, 카사네 테토 **「YARARARA」**, 동방 **「BAD APPLE!!」 × `CUSTOM CHART`** 썸네일 100% 원화 보존 실측 성공.

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
- `google flow custom/Scripts/flow-custom.js` — 임베디드 리소스로 들어가는 사용자 CSS/JS
- `google flow custom/Assets/icon.png|ico` — 앱 아이콘
- `mcp/index.mjs` — Antigravity/Claude Code 연동용 MCP 서버 (CDP 원격 제어: 실행, 상태, 물리 클릭, 프롬프트 입력/제출, 미디어 업로드, 다운로드 수집)

## 4. 합성 품질 이슈 및 Image-to-Image 참조 필수 원칙
- **문제 진단:** Text-to-Image(순수 텍스트 프롬프트)만 주입할 경우 모델이 텍스트 설명만 보고 캐릭터를 처음부터 다시 그려 원작의 고유 선화·그림체·채색 스타일이 왜곡되는 이질감 발생.
- **해결 방안:** 기준 이미지와 대상 썸네일 2장을 **Flow 프로젝트의 '미디어 업로드(소재 추가)'로 등록**한 뒤 참조 소재로 지정하여 생성해야 1:1 원화 보존 품질 달성 가능.
- **MCP 지원:** `flow_upload_media` 도구를 통해 CDP DataTransfer 드래그앤드롭 이벤트로 Flow 웹 화면에 로컬 이미지 2장을 직접 업로드하고 프롬프트 참조로 연결 가능.

## 5. 썸네일 알잘딱 타이포그래피 & 멀티모달 테마 추론 파이프라인 (2026-11-25 실측 정립)
- **추론 및 제안 4단계 워크플로:**
  1. **멀티모달 시각 분석:** 합성된 캐릭터와 배경의 시각적 요소(캐릭터 외형, 복장, 소품, 배경 테마 등)를 자체 시각 역량으로 정밀 분석.
  2. **지식/웹 검색 기반 곡명 및 테마 연동:** 해당 캐릭터/장면과 가장 긴밀하게 연결되는 보컬로이드/동방/서브컬처 곡명 및 메인 모티브(예: 테트리스 블록, 토끼, 사과, 최면 나선, 별 등)를 웹 검색 및 지식 기반으로 탐색/매칭.
  3. **사용자 추론 과정 공개 & 선택 제안:**
     > *"이 이미지의 캐릭터(예: 중독성 있는 아케이드/테트리스 모티브)와 배경을 분석한 결과, 곡명은 **[TETORIS]**로 추론됩니다.*
     > *타이포그래피는 8비트 아케이드 레트로 블록 폰트에 **네거티브 스페이스로 글자(O, R 등) 속에 테트로미노 블록 실루엣**을 음각하고, 하단에 `CUSTOM CHART`를 배치하는 알잘딱 디자인을 추천합니다. 이렇게 제작해 드릴까요?"*
  4. **`flow_generate_typography` 도구 호출:** 사용자가 확인/승인하면 테마에 최적화된 프롬프트로 100% 원본 유지 상태에서 타이포그래피 생성.
- **표준 레이아웃:** 16:9 와이드 기준 **하단 중앙 와이드 2단 배치 (`placement: "lower wide center foreground across the bottom"`)**.
  - **1열 (메인 타이틀):** 곡명/작품명 (예: `BAD APPLE`, `TETORIS`, `뮤즈 대시 2`) - 테마 질감 폰트 + 테마 네온 아우터 글로우 + 2중 외곽선 스트로크 + 엠보싱 음영.
  - **2열 (서브 타이틀):** `CUSTOM CHART` (화영왕 채널 커스텀 차트 아이덴티티) - 하단에 컴팩트 볼드로 안착.
  - **네거티브 스페이스 음각 (알잘딱 센스):** `A`, `P`, `B`, `O`, `R` (영문) 또는 `ㅇ`, `ㅁ`, `ㅂ`, `ㅍ`, `ㅎ`, `0`, `2`, `8` (한글/숫자) 등 닫힌 루프(카운터 공간) 내부에 곡의 핵심 모티브(사과, 테트로미노 블록, 토끼 실루엣 등)를 음각으로 정교하게 렌더링.

## 6. 한국어(한글) 타이포그래피 글자 왜곡 방지 및 철자 100% 일치 강화 파이프라인 (2026-11-27 추가)
- **배경 및 문제:** AI 생성 모델(Imagen 3, Nano Banana 등)은 영어 텍스트에 비해 한글 텍스트 생성 시 자모 분리, 엉뚱한 한글 글자 치환, 한자/가나 변형, 외계어 글리프 생성(Hallucination)이 잦음.
- **강화 프롬프트 전략:**
  1. **정확한 음절 분해 명시:** `EXACT KOREAN HANGUL TEXT: "${title}" (Exact syllables: [ 뮤 - 즈 - 대 - 시 - 2 ])`.
  2. **오탈자 / 유사 글자 치환 / 외계어 원천 금지 (Zero Tolerance):**
     `CRITICAL HANGUL TEXT ACCURACY & TYPOGRAPHY INSTRUCTIONS: Absolutely DO NOT misspell, alter, add, or drop any Korean syllable blocks, consonants, or vowels. Absolutely DO NOT substitute with different Korean letters, do NOT use Chinese hanzi or Japanese kanji/kana, and do NOT produce pseudo-Hangul or distorted alien glyphs.`
  3. **서체 스타일 정의:** 현대적인 K-pop / 리듬게임 그래픽 로고 디스플레이 서체 스타일(`bold modern Korean rhythm game / K-pop graphic display logo typeface`)로 지정하여 가독성과 글자 구조 보존을 극대화.
  4. **한글 카운터 홀 음각(네거티브 스페이스) 배제 원칙 (실측 교훈):**
     - Nano Banana에서 한글은 초성·중성·종성의 복합 결합 구조라 글자 구멍(카운터) 안에 꽃/별/아이콘을 넣으면 자음(`ㅇ`, `ㅁ`, `ㅂ` 등)의 획 형태가 뭉개지거나 다른 글자로 오인될 위험이 큼.
     - 따라서 **한글 메인 타이틀에는 카운터 홀 음각 장식을 일절 배제(`PURE & UNCLUTTERED HANGUL COUNTERS: strictly avoid decorating inside ㅇ, ㅁ, ㅂ, ㅍ, ㅎ`)**하고 깨끗하고 굵은 솔리드 획 구조를 유지.
     - 카운터 홀 네거티브 스페이스 심볼 음각은 단순 루프 구조인 **영문 알파벳(`A, P, B, O, R`)에 집중 적용**.
  5. **언어 자동 판별 및 파라미터(`language: "auto" | "ko" | "en"`):** 기본 영문 환경을 유지하되, 한글이 포함되거나 사용자가 한국어를 명시 요청할 경우 즉시 한글 강화 파이프라인이 자동 발동.

## 7. 타이포그래피 과대화 방지 및 적절한 크기(Scale) 자동 판단 파이프라인 (2026-11-27 추가)
- **문제 진단:** 2~4글자 정도의 짧은 타이틀(예: `명일방주`, `TETORIS`)의 경우, 이미지 생성 모델이 화면 공간을 채우기 위해 타이포그래피를 과도하게 거대하게(화면의 40~50% 이상) 키워 캐릭터나 배경 일러스트를 가리는 문제 발생.
- **해결 방안 (`sizeScale` 파라미터 및 자동 스케일링 지침):**
  - **`auto` (기본값):** 화면 높이의 약 **12~16%**, 가로 너비 **30~35% 이내**의 아담하고 단정한 타이틀 로고 뱃지 크기로 엄격 절제.
  - **캐릭터 안전 여백 (Clearance Buffer):** 좌우 캐릭터(포덴코의 얼굴/귀, 엘핀의 손)와 글자 사이에 넉넉한 빈 공간을 유지하도록 명시하여 침범 원천 방지.
  - **명시적 옵션:** `compact` (10~14% 아담한 뱃지 크기), `balanced` (14~18% 표준 균형 크기), `large` (25~30% 대형 강조).
  - **프롬프트 제약:** `PROPORTION & SIZE SCALE CONTROL: strictly around 12-16% height, at most 30-35% width, wide safety clearance buffer without crowding characters or faces.`

## 8. 시도했다가 버린 것 / 주의 (Dead Ends)
- **`labs.google/fx/tools/flow`:** 예전 Flow 주소. 지금은 `https://flow.google.com/`로 308 리다이렉트된다. 시작 URL은 새 주소를 직접 쓴다.
- **한글 카운터 홀 속 심볼 음각:** Nano Banana에서 한글 자음(ㅇ, ㅁ, ㅂ) 안쪽에 꽃이나 별 등 네거티브 스페이스 장식을 넣으려 하면 글자 획이 뭉개지거나 글자 형태가 오염됨. 한글은 내부 공간을 깨끗하게 유지해야 선명도가 극대화됨.
- **빌드 경고 MSB3277 (WindowsBase 4.0 vs 5.0):** `Microsoft.Web.WebView2` 패키지의 WPF 어셈블리 참조 때문. 동작에는 영향 없음.
- **일반 button.click() 트리거 실패:** Angular Material Button 및 ProseMirror 상호작용 시 단순 `btn.click()`이 무시될 수 있음. CDP의 `Input.dispatchMouseEvent`로 바운딩 렉트 중심 좌표를 쏴야 안정적으로 동작함.

## 9. 실제 DOM 확인 방법
```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9334"; Start-Process "google flow custom\bin\Debug\net10.0\google flow custom.exe"
```
`http://127.0.0.1:9334/json`에서 `webSocketDebuggerUrl`을 얻어 `Runtime.evaluate`로 조회. 앱 안에서 F12도 가능.

## 10. 빌드 · 배포
```powershell
dotnet build "google flow custom.slnx"
dotnet publish "google flow custom/google flow custom.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o "publish/win-x64"
```
- `publish/`는 `.gitignore` 처리됨.
