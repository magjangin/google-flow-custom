# google flow custom — 인수인계 문서 (AGENTS.md)

> 갱신일: 2026-11-28 (최초 2026-11-25). `youtube studio custom`(GitHub `youtube-studio-tool`)과 같은 구조로 만든 Google Flow 전용 WebView2 뷰어.
> 2026-11-28 변경 요약: 타이포그래피 위치/여백 지시 충돌 수정(14절), 워터마크 감지 재작성(12절 → 15절), Claude Code 등록·실행 절차(16절).
> 2026-11-28 (2차) 전체 감사: 버그·병목 수정과 실행·검증 방법 정리(18절). **새 작업은 18절부터 읽을 것.**

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
    - ⚠️ 2026-11-28부터 **얼굴만 보호, 몸은 겹쳐도 됨**으로 바뀜(17절).
  - **명시적 옵션:** `compact` (10~14% 아담한 뱃지 크기), `balanced` (14~18% 표준 균형 크기), `large` (25~30% 대형 강조).
  - **프롬프트 제약:** `PROPORTION & SIZE SCALE CONTROL: strictly around 12-16% height, at most 30-35% width, wide safety clearance buffer without crowding characters or faces.`

## 8. 서브타이틀 영문 디자인 자율성 및 손글씨/모던 로고 대비 연출 (2026-11-27 추가)
- **설계 의도:** 한글 메인 타이틀 아래 들어가는 영문 서브타이틀(예: `YOUR STAR`, `CUSTOM CHART`)은 한글의 무겁고 각진 헤드라인 스타일을 굳이 획일적으로 따라갈 필요가 없음.
- **스타일 분리 및 영문 프리셋 복원:**
  - **손글씨(Handwritten Script/Cursive) 또는 세련된 디자이너 브랜드 로고(Modern Branding Logo):** 묵직한 한글 헤드라인과 자연스러운 율동감/위계(Hierarchy)를 형성.
  - **영문 카운터 루프 디테일 자유 활용:** 영문 알파벳의 닫힌 루프(`A, O, R, P, B, D`)에는 기존 영문 프리셋의 테마 심볼 음각 및 네온 림 글로우 효과를 그대로 자유롭게 적용 가능.
  - **`subtitleStyle` 파라미터:** `auto` (영문 시 손글씨/로고 자유 연출), `handwritten` (필기체/브러시), `logo` (모던 로고), `matching` (메인 타이틀 볼드 폰트 매칭).

## 9. 시도했다가 버린 것 / 주의 (Dead Ends)
- **`labs.google/fx/tools/flow`:** 예전 Flow 주소. 지금은 `https://flow.google.com/`로 308 리다이렉트된다. 시작 URL은 새 주소를 직접 쓴다.
- **한글 카운터 홀 속 심볼 음각:** Nano Banana에서 한글 자음(ㅇ, ㅁ, ㅂ) 안쪽에 꽃이나 별 등 네거티브 스페이스 장식을 넣으려 하면 글자 획이 뭉개지거나 글자 형태가 오염됨. 한글은 내부 공간을 깨끗하게 유지해야 선명도가 극대화됨.
- **빌드 경고 MSB3277 (WindowsBase 4.0 vs 5.0):** `Microsoft.Web.WebView2` 패키지의 WPF 어셈블리 참조 때문. 동작에는 영향 없음.
- **일반 button.click() 트리거 실패:** Angular Material Button 및 ProseMirror 상호작용 시 단순 `btn.click()`이 무시될 수 있음. CDP의 `Input.dispatchMouseEvent`로 바운딩 렉트 중심 좌표를 쏴야 안정적으로 동작함.

## 9-2. 실제 DOM 확인 방법
```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9334"; Start-Process "google flow custom\bin\Debug\net10.0\google flow custom.exe"
```
`http://127.0.0.1:9334/json`에서 `webSocketDebuggerUrl`을 얻어 `Runtime.evaluate`로 조회. 앱 안에서 F12도 가능.

## 10. 지니/판타지 테마 실측 및 사과 기본값 제거, 비비드 캔디 팝 & 요술 램프/골든 윙 스타일 정립 (2026-11-27 추가)
- **사과 기본값 제거:** 초기 Bad Apple 모티브로 남아있던 `symbolIdea` 기본값(`apple silhouette`)으로 인해 지니/아라비안 테마 등 다른 곡에서도 사과가 음각되던 어색함 발견 → 곡 테마와 자연스럽게 어우러지는 범용 기본값(`sparkling starburst and diamond twinkle silhouettes`)으로 교체.
- **카사네 테토 「승인해주세요 지니님 (APPROVE PLEASE, GENIE!)」 실측 교훈:**
  - 사과 실루엣은 지니 곡의 캐릭터/설정과 무관하여 어색함.
  - 글자 카운터(P, O, A) 속 음각은 반드시 곡의 시그니처 소품인 **요술 램프(Genie's Lamp)**와 **반짝이는 다이아몬드 별빛**으로 엄격 지정할 때 몰입감이 극대화됨.
  - **비비드 캔디 팝 & 골든 윙 스타일의 압도적 선호:**
    - 마젠타 핑크에서 카나리아 옐로우로 이어지는 3D 캔디 그라데이션 + 핫핑크 베벨 외곽선 + 황금빛 림라이트.
    - 하단 `CUSTOM CHART`는 날개 달린 골든 윙 크레스트(중앙 자수정 보석 장식) 또는 딥 바이올렛 & 골드 스타 필(Pill) 배지로 구성할 때 아케이드 리듬게임 자켓 완성도가 최상에 도달함.

## 11. 상단 최상단(High-Top) 헤드룸 밀어올림 및 단일 행(1줄) 슬림 가로 배치 파이프라인 (2026-11-27 추가)
- **배경:** 모델에게 단순 `top`을 지시하면 캔버스 중앙부(Center)나 캐릭터 머리 바로 위까지 내려앉아 캐릭터 얼굴이나 머리를 압박하는 문제 발생.
- ⚠️ 아래의 "머리·귀·어깨·모자 위 15-20% 여백" 지시는 2026-11-28에 **얼굴만 피하는 규칙(17절)**으로 완화됨. 상단 배치는 지금 `high upper headroom near the top border ..., above the characters' faces`.
- **상단 배치 물리적 좌표 지침 정밀화:**
  - 상단(`top`, `upper`, `high`) 지정 시 `very high upper top headroom strictly near the top ceiling border of the frame, well elevated high above any character heads, hair, ears, shoulders, or hats, keeping a generous empty vertical gap of at least 15-20% frame height above the characters`로 강제.
- **단일 행(1줄) 가로 배치 (`singleLine: true`):**
  - 여러 단어로 구성된 한글/영문 제목이 자동으로 2줄로 쪼개져 세로 높이를 차지하는 것을 원천 방지: `SINGLE HORIZONTAL LINE ARRANGEMENT: Render all syllables strictly across one continuous horizontal row without breaking or wrapping into two lines.`
  - `sizeScale: "slim"` 지원: 캔버스 높이의 **6~9%** 수준으로 얇고 날렵한 수평 스트립 배너로 제한하여 캐릭터 얼굴과의 간섭을 100% 차단.

## 12. 워터마크 자동 감지 & 인페인팅 복원 및 다운로드 원본 정리 파이프라인 (2026-11-27 실측 추가)
> ⚠️ 이 절의 **감지 방식은 2026-11-28에 교체됨(15절)**. 아래 좌표·밝기 판정은 기록용. 다운로드·원본 정리 흐름은 그대로 유효.
- **배경:** Google Flow 및 Imagen 모델로 생성된 이미지는 우하단 구석에 반투명한 Google DeepMind 4-point star(별) 또는 별 + "AI" 타원형 캡슐 워터마크가 부착되어 썸네일/자켓 활용 시 이질감 유발.
- **워터마크 패턴 정밀 분석 (1376×768 실측):**
  1. **단독 별 (Single Star):** 우하단 중심 `(w - 93, h - 93)` 좌표, 반경 34px 아스트로이드(4-point star) 곡선. (예: BAD APPLE, YARARARA 등)
  2. **복합 워터마크 (Star + AI Capsule):** 별 중심 `(w - 128, h - 128)`, AI 타원 캡슐 중심 `(w - 50, h - 45)`.
- **해결 방안 (`Scripts/remove_watermark.py`):**
  - OpenCV `cv2.Canny` 및 정규화 템플릿 매칭(`cv2.matchTemplate(..., TM_CCORR_NORMED)`)으로 단독 별과 복합 별 위치를 정밀 판별.
  - 파라메트릭 아스트로이드 마스크(`((x-cx)^p + (y-cy)^p)^(1/p) <= r`, `p=0.55`)와 캡슐 타원 마스크를 워터마크가 실제로 존재하는 위치에만 정밀 타기팅.
  - 2px 팽창(Dilation)으로 안티에일리어싱 경계를 포괄한 뒤 `cv2.inpaint(..., inpaintRadius=3, flags=cv2.INPAINT_TELEA)` 적용.
  - 옷감 주름, 불꽃 파티클, 배경 질감을 100% 자연스럽게 보존하면서 워터마크만 감쪽같이 제거.
- **다운로드 & 원본 정리 자동화 (`mcp/index.mjs`):**
  - `flow_remove_watermarks`: 단일 파일 또는 다운로드 폴더 전체의 워터마크를 인페인팅 복원하고 워터마크가 찍힌 원본 사진을 자동 삭제(`deleteOriginal: true`).
  - `flow_download_images`: 브라우저 캔버스에서 무손실 PNG 추출 후 즉시 워터마크 인페인팅 복원 및 워터마크 원본 사진 삭제 파이프라인 수행.
  - `flow_get_downloads`: `removeWatermarks: true` 옵션 지원.
- **실기 검증 완료 (2026-11-27):**
  - 이전 작업 18장(동방 BAD APPLE!!, 카사네 테토 YARARARA, 제로투 ZERO TWO, 카사네 테토 TETORIS) 및 오늘 작업 4장(총 22장) 전체 일괄 다운로드, 워터마크 100% 무손실 인페인팅 복원 및 워터마크 원본 사진 삭제 실측 완료.

## 13. 빌드 · 배포
```powershell
dotnet build "google flow custom.slnx"
dotnet publish "google flow custom/google flow custom.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o "publish/win-x64"
```
- `publish/`는 `.gitignore` 처리됨.

## 14. 타이포그래피 위치·여백 지시 충돌 수정 (2026-11-28)
- **증상:** Your Reality(DDLC 모니카) 썸네일에 하단 배치(기본값)로 생성했더니 타이틀이 가운데가 아니라 **왼쪽 아래 구석**에 붙음.
- **원인 (`mcp/index.mjs` `handleFlowGenerateTypography`):**
  1. 크기 문장 뒤에 붙는 여백 문장이 배치와 상관없이 항상 `"the title must remain strictly elevated high in the upper headroom"` → 하단 배치 문장과 정면 충돌.
  2. 하단 배치 문장(`lower wide foreground across the bottom edge`)에 **가운데 정렬 지시가 없었음**.
  3. `slim`/`singleLine` 크기 문장이 항상 `near the top border`.
  4. 한글 감지 정규식 `[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]` — 문자 클래스 안 `|`는 글자 그 자체라 제목에 `|`가 있으면 한글 모드로 오판.
- **수정:** `placementInstruction`과 `clearanceInstruction`을 **같은 분기에서 함께** 만든다(상단=천장 쪽 / 하단=바닥 쪽·좌우 구석 금지 / 그 외=위치 문구 그대로). 여백 규칙 자체는 17절의 얼굴 보호 규칙으로 통일. 상·하단 모두 `horizontally centered on the frame's vertical center line` 명시. slim 문장도 배치 방향을 따름. 정규식은 `[ㄱ-ㅎㅏ-ㅣ가-힣]`.
- **규칙:** 위치 관련 문장을 새로 넣을 때는 반드시 `isTopPlacement`/`isBottomPlacement` 분기 안에서 만들 것. 프롬프트 어딘가에 고정 방향 문장이 남으면 모델은 둘 중 하나를 임의로 고른다.
- 도구 설명(스키마)의 `sizeScale` 숫자도 실제 코드 값(auto 12-16% / compact 10-14% / balanced 14-18% / large 25-30% / slim 6-9%)으로 맞춤.
- **실측 확인 (2026-11-28):** 같은 원본·같은 인자로 다시 생성 → 수정 전 왼쪽 아래 구석이던 타이틀이 **하단 가운데**(좌우 여백 균형, 모니카 얼굴 아래)로 들어감. 다운로드 시 새 워터마크 감지가 `ai_only`로 캡슐만 지워 `Official Soundtrack` 보존. 결과: `Downloads\GoogleFlow_Downloads\YOUR_REALITY_타이포테스트_v2.png`.

## 15. 워터마크 감지 재작성 — 요소별 고정 위치 판정 (2026-11-28 실측)
- **증상:** Your Reality 결과물에서 원본 아트의 손글씨 `Official Soundtrack` 중 "nd"가 지워지고, 실제 `AI` 캡슐은 아랫부분이 남음.
- **원인 (예전 `detect_and_create_watermark_mask`):**
  - AI 캡슐 판정이 `np.mean(crop) > 120 or np.max(crop) > 200` → **밝은 배경이면 거의 항상 참**.
  - 별은 감지 실패해도 기본값으로 `(w-93, h-93)`을 **무조건** 칠함 → 그 자리에 있던 원본 글자 손상.
  - 캡슐 마스크 중심 `(w-60, h-60)`, 반높이 15 → 실제(아래)보다 위로 치우쳐 캡슐 아래쪽 잔상.
- **실측 데이터:** 이 계정 Flow 프로젝트 7개에서 원본 41장(`deleteOriginal: false`로 받음)을 모아 확인. 기준 가로 1376px:
  | 요소 | 위치 | 크기 | 비고 |
  |---|---|---|---|
  | 별 (단독) | (w-97, h-97) | 아스트로이드 r≈32, p=0.55 | p5_02, p6_10 등 |
  | 별 (캡슐과 함께) | (w-129, h-129) | 같음 | 캡슐 없이 이 자리만 찍힌 경우도 많음, 한 장에 두 자리 다 찍힌 경우도 있음(p5_03) |
  | AI 캡슐 | (w-57, h-50) | 약 48×32 둥근 사각형 | 별 없이 캡슐만 붙는 이미지 있음(Nano Banana 2.1, Your Reality) |
  | 없음 | — | — | 흰 배경, 어두운 영상 프레임 등 41장 중 22장 |
  - 다른 해상도(예: 512×288 썸네일)는 **가로 비율(w/1376)로 위치·크기가 그대로 축소**됨.
- **새 방식 (`Scripts/remove_watermark.py`):**
  - 밝기 하이패스(L − GaussianBlur σ9)에서 **요소마다 고정 위치 ±6px만** 정규화 상관(`TM_CCOEFF_NORMED`)으로 판정. 별은 아스트로이드 템플릿, 캡슐은 **실제 캡슐에서 잘라낸 템플릿** `Scripts/wm_templates/ai_capsule_hp.png`.
  - 별: 점수 ≥ 0.45 → 별 / 점수 ≥ 0.16 **이면서 위치 오차 ≤ 2px** → 별(네온 글자 위 등 복잡한 배경의 옅은 별). 워터마크 없는 샘플의 최대 점수는 0.14.
  - 캡슐: 점수 ≥ 0.5 (실제 0.97~1.00, 없는 샘플 ≤ 0.28).
  - 창의 표준편차 < 1.5(흰 배경처럼 평평)면 판정 안 함 — 평평한 창은 상관값이 1.00으로 튀는 함정.
  - **찾은 요소만** 마스크(별 r+2, 캡슐 둥근 사각형) → 5×5 팽창 → TELEA 인페인팅. **아무것도 못 찾으면(`none`) 픽셀을 건드리지 않음.**
  - `detected_type`: `none` / `single_star` / `star_and_ai` / `ai_only` / `two_stars` / `star_with_ai_spot`.
- **결과 (41장):** 워터마크 있음 19, 없음 22, **워터마크 없는 이미지 오감지 0**. Your Reality는 `ai_only`로 캡슐만 지워지고 `Soundtrack` 보존.
- **흰 배경 테두리형 별 (2026-11-28 드림모드 테스트에서 발견·추가):** 순백 배경에서는 흰 별이 배경과 같아 안쪽은 안 보이고 **반지름 33~35의 2px 고리만 밝기 -3~-4 정도 어둡게** 남는다. 상관 점수가 0.006이라 놓쳤음. → 배경이 평평할 때(고리 안팎 표준편차 ≤ 5)만 "고리 밝기 − 배경 중앙값"의 중앙값 ≤ -2 이고 고리 픽셀의 50% 이상이 1 이상 어두우면 별로 판정(`_ring_outline_star`), 마스크는 고리까지 덮게 r+4. 41장 기존 판정은 하나도 안 바뀌고 이 이미지만 새로 잡힘(다른 평평한 샘플은 고리 비율 0~21%).
- **알려진 한계:** 아주 복잡한 배경(네온 글자 한가운데, 밝은 하늘색 무늬 위)의 옅은 별 몇 개(p5_05, p6_01, p6_08)는 못 찾음 → 원본을 망가뜨리는 것보다 별이 남는 쪽을 택함. 별이 글자 위에 있으면 인페인팅 자국이 약간 남을 수 있음.
- **다음 개선 후보:** 워터마크는 고정 알파 마스크의 흰색 덮어씌우기라, 평평한 샘플에서 알파 맵을 추정하면 인페인팅 대신 **역알파 합성**(`B = (I − α·255)/(1 − α)`)으로 원본 픽셀을 거의 그대로 되살릴 수 있다.

## 16. Claude Code 등록 · 타이포그래피 실행 절차 (2026-11-28 실측)
- 등록(사용자 범위): `claude mcp add -s user google-flow-custom -- node "H:/source/repos/google flow custom/mcp/index.mjs"` → 새 세션부터 `mcp__google-flow-custom__*` 도구가 보임.
- 워터마크 스크립트는 MCP가 PATH의 `python`으로 실행 → 그 Python에 `opencv-python`, `numpy` 필요.
- 타이포그래피 순서(이미지 1장 기준):
  1. `flow_launch` → `flow_status`로 로그인 확인 (`isLoginNeeded: false`)
  2. 홈에서 `flow_click("새 프로젝트")` (또는 기존 프로젝트에서 `세션 기록 열기` → `button.create-session-button`으로 새 세션)
  3. `flow_upload_media([원본])` → 업로드 % 표시가 끝날 때까지 대기
  4. 소재 칩 붙이기: `button.add-menu-trigger` 클릭 → `.asset-list-viewport` 안의 `button.asset-item` 중 원본 이름을 클릭 → `.prompt-ingredient-bar .chip-image` 1개 확인.
     - **함정:** `flow_click`(좌표 클릭)으로 트리거를 누르면 메뉴가 열렸다 바로 닫힐 때가 있다. `flow_eval`에서 `button.click()` 후 800ms 기다렸다가 항목을 누르는 쪽이 안정적.
     - ⚠️ 2026-11-28 감사에서 원인 확인: 예전 `flow_click`은 좌표 클릭 **뒤에 JS `el.click()`을 또 보내** 한 번에 두 번 눌렀다(열기→닫기). 지금은 둘 중 하나만 보낸다(18절). 메뉴 트리거에 `flow_click`을 다시 써 봐도 되지만, 아직 이 메뉴로 실측하지는 않았다.
  5. `flow_generate_typography(...)` (submit 기본 true) → 약 60~90초 생성
  6. `flow_download_images({filename})` → 워터마크 제거 + 원본 삭제(기본). 결과는 Flow 기본 1376×768.
- **실측 2 (드림모드, 한글 제목):** `title: "드림모드"`, `language: "ko"` → 철자 정확, 하단 가운데 배치 OK. 다만 타이틀 2줄 합이 화면 높이의 약 24%(규칙 12~16%)로 크게 나옴 — 크기는 모델이 완전히 지키지 않는 부분이라, 더 작게 원하면 `sizeScale: "compact"`를 쓸 것. 빨간 잠옷 캐릭터의 다리를 일부 가린 것은 17절 규칙상 허용(얼굴은 가리지 않음).
- MCP 코드(`index.mjs`)를 고친 뒤 같은 세션에서 바로 확인하려면 `node index.mjs`를 직접 띄워 stdio JSON-RPC(`initialize` → `tools/call`)로 부르면 된다(앱의 CDP 9334에 그대로 붙음).

## 17. 얼굴 보호 규칙 — 몸은 겹쳐도 되고 얼굴만 절대 가리지 않기 (2026-11-28 사용자 결정)
- **배경:** 드림모드 테스트에서 타이틀이 캐릭터 다리를 일부 가렸는데, 사용자 판단은 "상체·하체 가리는 건 괜찮다. 얼굴을 가리면 안 된다."
- **이전 규칙:** 하단은 "모든 캐릭터의 얼굴과 **상체** 아래", 상단은 "머리·머리카락·귀·**어깨**·모자 위 15-20% 여백", 마지막에 "캐릭터에 **닿지** 말 것" → 몸 전체를 피하라는 지시라 자리가 부족하고 정작 중요한 것(얼굴)이 묻힘.
- **현재 규칙 (`mcp/index.mjs` `FACE_RULE` 상수, 모든 배치에 공통):**
  > the title may freely overlap characters' bodies (torso, arms, hands, legs, clothing, or the ends of long hair), but it must NEVER cover, cross, or touch any character's face (forehead, eyes, nose, mouth, cheeks, chin). Every face must remain 100% fully visible with a clear gap around it.
  - 하단: "바닥 쪽, 좌우 구석으로 밀리지 않기, 몸·다리와는 겹쳐도 됨" + FACE_RULE
  - 상단: "천장 쪽, 얼굴 위, 모자·머리카락과는 겹쳐도 됨" + FACE_RULE
  - 그 외(사용자 지정 위치 문구): FACE_RULE만
  - 크기 문장 끝: "never ... touch any character's **face**" (예전 "touch the character")
- **확인 방법:** `node mcp/scripts/check_typography_prompt.mjs` — Flow 없이 `handleFlowGenerateTypography` 함수만 떼어내(`handleFlowType`은 가짜로) 배치별 프롬프트의 위치·여백 문장을 출력해 비교. 프롬프트 규칙을 고친 뒤 항상 돌려 볼 것(크레딧 안 듦). 하단/상단/기타/slim+하단 4가지 모두 얼굴 규칙이 같은 문장으로 들어가고 방향 충돌 없음을 확인.
- **규칙:** 여백·겹침 관련 문장을 새로 넣을 때는 `FACE_RULE`을 고치거나 거기에 이어 붙일 것. 배치 분기마다 따로 "피하라" 문장을 늘리지 말 것(충돌의 원인).

## 18. 전체 감사 (2026-11-28, 2차) — 버그·보안·병목 수정과 실행·검증 방법
작업 브랜치 `chore/audit-2026-11-28` → `main` 머지. 대상: `mcp/index.mjs`, `Scripts/remove_watermark.py`. C# 앱·`flow-custom.js`는 문제 없어 그대로 둠.

### 18-1. 고친 버그
| 위치 | 증상/원인 | 수정 |
|---|---|---|
| `index.mjs` `DEFAULT_EXE_PATHS` | 하드코딩 문자열 `"...\bin\Debug\..."`에서 `\D`가 JS에서 그냥 `D`로 풀려 **Debug 빌드 exe를 영영 못 찾음**(publish 폴더가 없으면 `flow_launch` 실패) | 경로를 `import.meta.url` 기준 `REPO_ROOT`에서 `join`으로 계산. publish → Release → Debug 순 |
| `index.mjs` `handleFlowClick` | 좌표 클릭 뒤 "폴백"이라며 JS `el.click()`을 **항상 한 번 더** 보냄 → 토글형 버튼·메뉴가 열렸다 바로 닫힘(16절 함정의 원인) | `elementFromPoint`로 좌표가 그 요소에 닿는지(`hitsTarget`) 보고, 닿으면 좌표 클릭만, 가려졌으면 JS 클릭만. 결과에 `method: "mouse" | "js"` |
| `index.mjs` `handleFlowClick` | 버튼 텍스트(예: `새 프로젝트`)를 `querySelector`에 넣으면 잘못된 선택자 예외가 날 수 있음 | `try`로 감싸고 텍스트 검색으로 넘어감 |
| `index.mjs` `runWatermarkRemover` | `python`이 PATH에 없으면 `spawn`의 `error` 이벤트에 리스너가 없어 **MCP 프로세스 전체가 죽음** | `error` 리스너로 reject. 앱 실행 `spawn`에도 같은 처리 |
| `index.mjs` + `remove_watermark.py` | Windows에서 파이프 출력이 cp949라 한글 파일명이 깨지거나 cp949에 없는 글자에서 `UnicodeEncodeError` | Node가 `PYTHONUTF8=1`로 실행, 파이썬도 `sys.stdout.reconfigure(encoding="utf-8")` |
| `index.mjs` `getActiveWs` | 앱을 껐다 켜면 닫힌 소켓을 계속 붙잡음, 연결 대기에 시간 제한 없음 | `onclose`에서 비움, 연결 5초 제한, `/json` 조회 1.5초 제한 |
| `index.mjs` `flow_get_downloads` | `removeWatermarks: true`의 오류를 조용히 삼킴, 하위 폴더도 파일처럼 나열 | 결과에 `watermarkResult`(또는 `error`)를 담음, 파일만 나열 |
| `index.mjs` 파일명 인자 | `filename`/`filenames`/`outputFilename`에 `..\` 같은 경로가 들어오면 다운로드 폴더 밖에 써짐, `flow_download_images`에서 복수 이미지일 때 단일 `filename`이 무시되고 기본 prefix로 돌아감 | `safeFileName`으로 경로 제거, 복수 이미지 시에도 지정 `filename` 기반 연번(`base_01.png`, `base_02.png`) 유지 |
| `mcp/package.json` | mcp 디렉터리에 package.json 부재로 모듈 타입 및 테스트 스크립트 표준 부재 | `google-flow-custom-mcp` v1.1.0 package.json 생성 및 .gitignore에 node_modules 등록 |
| `remove_watermark.py` 투명도 보존 | RGBA 4채널 투명 이미지를 `IMREAD_COLOR`로 읽어 투명도가 유실되는 문제 | `IMREAD_UNCHANGED`로 읽고 Alpha 분리 후 복원 BGR과 재병합해 투명도 100% 보존 |
| `index.mjs` `flow_download_images` | 캔버스 추출 오류로 이미지가 0장 다운로드되었을 때 상세 사유 없이 조용히 넘어감 | 추출된 에러 목록(`errors`)을 포함한 명확한 warning 반환 |
| `remove_watermark.py` 제자리 교체 | 원본을 **먼저 지운 뒤** 임시 파일을 옮김 → 그 사이 실패하면 원본 손실 | 임시 파일에 쓰고 `os.replace` 한 번 |
| `remove_watermark.py` 워터마크 없음 | `none`이어도 원본을 다시 인코딩해 덮어씀(JPG는 매번 화질 손실, 수정 시각 변경) | 제자리 교체 + `none`이면 파일을 건드리지 않음(`rewritten: false`) |
| `remove_watermark.py` 폴더 처리 | `_clean.png`만 건너뛰어 `_clean.jpg`를 다시 처리 | 확장자 무관 `*_clean.*` 건너뜀 |

### 18-2. 병목 해결
- `flow_download_images`: 예전에는 **이미지마다 python을 새로 띄움**(OpenCV import 포함 장당 ~1초). → `remove_watermark.py --files a b c`로 한 번에 처리.
- `remove_watermark.py`: 별 마스크를 **화면 전체(1376×768) 격자로 거듭제곱 계산** → 별 주변 사각형만 계산. LAB 변환 1회로 줄임, 템플릿은 `lru_cache`. 25장×2배율(50건) 감지가 1.37초 → 0.81초, **마스크는 50건 모두 바이트 단위로 동일**(회귀 비교).
- `flow_upload_media`: base64 → 일반 JS 배열 → `Uint8Array` 복사를 `fetch(data:…).blob()` 한 번으로.
- `ensureAppRunning`: 800ms 간격 → 400ms 간격 확인(준비되는 즉시 반환).

### 18-3. 보안 점검 결과
- 저장소 전체 이력(`git log --all -p`)에서 API 키·토큰·비밀번호 패턴 검색 → **노출 없음**. 긴 문자열은 배지 SVG base64뿐.
- MCP는 로컬 stdio 전용이고 CDP 포트(9334)는 `127.0.0.1`에만 붙는다. 단 CDP 포트가 열려 있는 동안은 같은 PC의 다른 프로그램도 Google 로그인 세션을 조종할 수 있으니, 공용 PC에서는 MCP 작업 후 앱을 끌 것.
- `flow_eval`은 Flow 페이지에서 임의 JS를 실행하는 도구다(의도된 기능). 웹 페이지·파일에서 읽은 문장을 그대로 넣지 말 것.

### 18-4. adb-mcp 호환 (건드리면 안 되는 것)
- `H:\source\repos\adb-mcp\local\ps_custom.py`(Photoshop `remove_flow_watermark`)가 `remove_watermark.py`를 **import해서 `detect_and_create_watermark_mask(img) -> (mask, detected_type)`만** 쓴다. 이 이름·시그니처·반환 형식과 `wm_templates/` 위치는 바꾸지 말 것. 이번 감사에서도 그대로 유지했고 회귀 비교로 출력이 같음을 확인.
- `process_directory`의 안 쓰던 `pattern` 인자는 제거(사용처 없음).

### 18-5. 시도했다가 버린 것 (Dead Ends, 이번 감사)
- **이미 워터마크를 지운 파일에 다시 돌리기:** `Downloads\GoogleFlow_Downloads`의 정리된 25장 중 일부(예: `TETORIS_01.png` 원본 크기, 여러 장의 축소본)가 다시 `single_star` 등으로 감지된다 — 인페인팅 자국이 별 모양 상관에 걸리는 것. 그래서 `flow_get_downloads({removeWatermarks: true})`(폴더 전체)를 반복 실행하면 같은 자리를 또 칠한다. **폴더 일괄 처리는 새로 받은 원본에만 쓸 것.** 처리 여부 표시(파일 메타데이터)는 OpenCV `imencode`로는 못 남겨서 이번엔 하지 않음.
- **업로드한 테스트 소재를 MCP로 휴지통 보내기:** 카드 위 `옵션 더보기` 버튼이 DOM 순서와 화면 카드가 일치하지 않고, 카드 제목은 마우스를 올렸을 때만 DOM에 생긴다. JS로 "이름이 X인 카드의 메뉴"를 고르려다 **다른 카드(사용자 원본)의 메뉴가 열림** → 삭제는 하지 않고 닫음. 소재 삭제를 자동화하려면 먼저 CDP `Input.dispatchMouseEvent`(`mouseMoved`)로 그 카드에 호버한 뒤 열린 메뉴의 위치가 그 카드 옆인지 확인해야 한다.

### 18-6. 실행 · 검증 방법
1. 정적 검사: `node --check mcp/index.mjs`
2. 프롬프트 규칙(크레딧 0): `node mcp/scripts/check_typography_prompt.mjs`
3. 워터마크 회귀(크레딧 0): 수정 전 파일을 따로 복사해 두고, 같은 샘플 폴더에 대해 `detect_and_create_watermark_mask`의 `(detected_type, mask md5)`를 원본 크기와 축소본(×0.372 ≈ 512폭) 모두 비교. 하나라도 다르면 의도한 변경인지 확인.
4. MCP 실호출: 서버를 직접 띄워 stdio JSON-RPC로 `initialize` → `tools/call`. (Claude Code에 붙은 MCP는 **세션 시작 때 코드를 읽으므로, `index.mjs`를 고친 뒤에는 새 세션에서 MCP를 다시 연결해야 반영된다.**)
5. 2026-11-28 실호출 결과(12개 도구 전부 정상): `flow_launch`(Debug exe 실행, 1.3초) · `flow_status` · `flow_navigate` · `flow_eval` · `flow_click`(`.ProseMirror`, `method: "mouse"`) · `flow_type`(제출 안 함) · `flow_generate_typography`(`submit: false`, 생성 안 함, 입력창은 비워 둠) · `flow_screenshot` · `flow_download_images`(`limit: 1`, `star_and_ai` 감지·제거, 한 번의 python 실행) · `flow_get_downloads` · `flow_remove_watermarks`(임시 폴더 사본, `outputPath` 지정) · `flow_upload_media`(테스트 프로젝트 `11월 28 - 14:35`에 `AUDIT_UPLOAD.png` 1장 업로드 성공 — **이 테스트 소재는 Flow에 남아 있음**, 18-5 참고).
6. 검증이 끝나면 띄운 앱(`google flow custom.exe`)을 끄고, 테스트로 받은 파일(`AUDIT_TEST_*.png`)은 지운다.
