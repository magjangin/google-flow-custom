// Google Flow(flow.google.com) - PixAI Style Enhanced Custom Script
// WebView2 "document created" 시점 및 NavigationCompleted 2차 주입에 안전하게 동작합니다.

(function () {
    if (location.hostname !== 'flow.google.com') return;
    if (window.__flowCustomInstalled) return;
    window.__flowCustomInstalled = true;

    const STYLE_ID = 'flow-pixai-style';
    const HELPER_ID = 'flow-pixai-helper';
    const STORAGE_KEY_THEME = 'flow_pixai_theme_enabled';
    const STORAGE_KEY_COLLAPSED = 'flow_pixai_helper_collapsed';

    // ==========================================
    // 1. PixAI 사이버/애니 다크 네온 테마 CSS
    // ==========================================
    const PIXAI_CSS = `
        /* PixAI 네온 테마 변수 */
        :root {
            --pixai-bg-main: #0c0915;
            --pixai-bg-card: rgba(22, 17, 36, 0.85);
            --pixai-bg-card-hover: rgba(35, 27, 58, 0.95);
            --pixai-accent-purple: #a855f7;
            --pixai-accent-pink: #ec4899;
            --pixai-accent-cyan: #06b6d4;
            --pixai-accent-rose: #f43f5e;
            --pixai-border: rgba(168, 85, 247, 0.25);
            --pixai-border-glow: rgba(236, 72, 153, 0.4);
            --pixai-text: #f3f0fb;
            --pixai-text-dim: #a79fc2;
        }

        body.pixai-theme {
            background-color: var(--pixai-bg-main) !important;
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 85% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 40%) !important;
            color: var(--pixai-text) !important;
        }

        /* 메인 컨테이너 및 배경 */
        body.pixai-theme .aisandbox-content,
        body.pixai-theme flow-app-shell,
        body.pixai-theme .dark-theme {
            background: transparent !important;
        }

        /* 미디어 카드 / 타일 룩앤필 */
        body.pixai-theme .image-tile,
        body.pixai-theme .asset-card,
        body.pixai-theme [class*="card"],
        body.pixai-theme [class*="item-card"] {
            background: var(--pixai-bg-card) !important;
            border: 1px solid var(--pixai-border) !important;
            border-radius: 12px !important;
            transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important;
        }

        body.pixai-theme .image-tile:hover,
        body.pixai-theme .asset-card:hover,
        body.pixai-theme [class*="card"]:hover {
            transform: translateY(-2px) !important;
            border-color: var(--pixai-accent-pink) !important;
            box-shadow: 0 6px 20px rgba(236, 72, 153, 0.25), 0 0 10px rgba(168, 85, 247, 0.3) !important;
        }

        /* 이미지 컨테이너 호버 줌 효과 */
        body.pixai-theme .image-thumbnail,
        body.pixai-theme .image {
            border-radius: 8px !important;
            transition: transform 0.3s ease !important;
        }
        body.pixai-theme .image-tile:hover .image,
        body.pixai-theme .asset-card:hover .image-thumbnail {
            transform: scale(1.01) !important;
        }

        /* 우측 채팅 및 프롬프트 패널 */
        body.pixai-theme .right-panel,
        body.pixai-theme [class*="chat-panel"],
        body.pixai-theme [class*="session-panel"] {
            background: rgba(15, 11, 25, 0.75) !important;
            backdrop-filter: blur(16px) !important;
            border-left: 1px solid var(--pixai-border) !important;
        }

        /* 프롬프트 입력창 (ProseMirror) */
        body.pixai-theme .ProseMirror {
            background: rgba(22, 17, 36, 0.9) !important;
            border: 1px solid var(--pixai-border) !important;
            border-radius: 12px !important;
            color: #ffffff !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
            transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        body.pixai-theme .ProseMirror:focus {
            border-color: var(--pixai-accent-pink) !important;
            box-shadow: 0 0 12px rgba(236, 72, 153, 0.3) !important;
            outline: none !important;
        }

        /* 생성 시작 / 전송 버튼 */
        body.pixai-theme .generate-icon-button,
        body.pixai-theme [aria-label="생성 시작"] {
            background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 2px 10px rgba(236, 72, 153, 0.4) !important;
            border: none !important;
            transition: transform 0.15s, box-shadow 0.15s !important;
        }
        body.pixai-theme .generate-icon-button:hover,
        body.pixai-theme [aria-label="생성 시작"]:hover {
            transform: scale(1.05) !important;
            box-shadow: 0 4px 16px rgba(236, 72, 153, 0.6) !important;
        }

        /* 슬림 네온 스크롤바 */
        body.pixai-theme ::-webkit-scrollbar {
            width: 7px;
            height: 7px;
        }
        body.pixai-theme ::-webkit-scrollbar-track {
            background: rgba(12, 9, 21, 0.5);
        }
        body.pixai-theme ::-webkit-scrollbar-thumb {
            background: rgba(168, 85, 247, 0.4);
            border-radius: 4px;
        }
        body.pixai-theme ::-webkit-scrollbar-thumb:hover {
            background: var(--pixai-accent-pink);
        }

        /* ==========================================
           2. PixAI 헬퍼 툴바 위젯 UI
           ========================================== */
        #${HELPER_ID} {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 360px;
            background: rgba(18, 14, 30, 0.88);
            backdrop-filter: blur(20px);
            border: 1px solid var(--pixai-border);
            border-radius: 14px;
            padding: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.2);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif;
            color: #e2d9f3;
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            user-select: none;
        }

        #${HELPER_ID}.collapsed {
            width: auto;
            padding: 6px 12px;
            border-radius: 20px;
            bottom: 96px;
            right: 24px;
        }

        #${HELPER_ID} .helper-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 700;
            background: linear-gradient(90deg, #c084fc, #f472b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        #${HELPER_ID}.collapsed .helper-header {
            margin-bottom: 0;
        }

        #${HELPER_ID} .helper-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        #${HELPER_ID}.collapsed .helper-body {
            display: none;
        }

        #${HELPER_ID} .tag-group-title {
            font-size: 11px;
            font-weight: 600;
            color: #9d8ec2;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        #${HELPER_ID} .tag-container {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        #${HELPER_ID} .pixai-tag-chip {
            background: rgba(35, 27, 58, 0.7);
            border: 1px solid rgba(168, 85, 247, 0.3);
            color: #e5e0f5;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        #${HELPER_ID} .pixai-tag-chip:hover {
            background: rgba(168, 85, 247, 0.3);
            border-color: #ec4899;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 0 8px rgba(236, 72, 153, 0.4);
        }

        #${HELPER_ID} .pixai-tag-chip.aspect-chip {
            background: rgba(6, 182, 212, 0.15);
            border-color: rgba(6, 182, 212, 0.4);
            color: #67e8f9;
            font-weight: 600;
        }
        #${HELPER_ID} .pixai-tag-chip.aspect-chip:hover {
            background: rgba(6, 182, 212, 0.35);
            border-color: #22d3ee;
            color: #ffffff;
        }

        #${HELPER_ID} .helper-btn {
            background: transparent;
            border: none;
            color: #bfaedc;
            cursor: pointer;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 4px;
            transition: color 0.15s;
        }
        #${HELPER_ID} .helper-btn:hover {
            color: #ffffff;
        }

        /* 테마 토글 스위치 */
        #${HELPER_ID} .theme-toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            border-top: 1px solid rgba(168, 85, 247, 0.15);
            font-size: 11px;
            color: #9d8ec2;
        }
    `;

    // ==========================================
    // 2. 스타일 주입 함수
    // ==========================================
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const target = document.head || document.documentElement;
        if (!target) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = PIXAI_CSS;
        target.appendChild(style);
    }

    // ==========================================
    // 3. 태그 헬퍼 위젯 주입
    // ==========================================
    function insertTagToPrompt(tagText) {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return;

        editor.focus();
        let currentText = editor.innerText.trim();
        let newText = currentText;

        if (newText.length > 0 && !newText.endsWith(',')) {
            newText += ', ';
        } else if (newText.length > 0 && newText.endsWith(',')) {
            newText += ' ';
        }
        newText += tagText;

        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, newText);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function selectAspectRatio(ratioText) {
        // 설정 트리거 버튼 클릭
        const trigger = document.querySelector('[aria-label="설정 트리거"]');
        if (trigger) trigger.click();

        setTimeout(() => {
            const items = Array.from(document.querySelectorAll('.cdk-overlay-container button, .cdk-overlay-container [role="button"], .cdk-overlay-container [role="option"], .cdk-overlay-container [tabindex]'));
            const targetBtn = items.find(el => el.innerText && el.innerText.includes(ratioText));
            if (targetBtn) {
                targetBtn.click();
            }
            // 팝업 닫기
            if (trigger) trigger.click();
        }, 120);
    }

    function createHelperWidget() {
        if (document.getElementById(HELPER_ID)) return;
        if (!document.body) return;

        const widget = document.createElement('div');
        widget.id = HELPER_ID;

        const isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
        if (isCollapsed) widget.classList.add('collapsed');

        widget.innerHTML = `
            <div class="helper-header">
                <span style="display:flex; align-items:center; gap:5px; cursor:pointer;" id="pixai-toggle-collapse">
                    <span>✨ PixAI Studio Helper</span>
                </span>
                <div style="display:flex; gap:4px;">
                    <button class="helper-btn" id="pixai-collapse-btn" title="접기/펼치기">${isCollapsed ? '➕' : '➖'}</button>
                </div>
            </div>
            <div class="helper-body">
                <div>
                    <div class="tag-group-title">📐 Aspect Ratio (1클릭 변경)</div>
                    <div class="tag-container">
                        <button class="pixai-tag-chip aspect-chip" data-aspect="16:9">16:9 와이드</button>
                        <button class="pixai-tag-chip aspect-chip" data-aspect="9:16">9:16 쇼츠</button>
                        <button class="pixai-tag-chip aspect-chip" data-aspect="1:1">1:1 정사각</button>
                        <button class="pixai-tag-chip aspect-chip" data-aspect="4:3">4:3 표준</button>
                    </div>
                </div>

                <div>
                    <div class="tag-group-title">🌟 Quality Boost</div>
                    <div class="tag-container">
                        <span class="pixai-tag-chip" data-tag="masterpiece, best quality">✨ Masterpiece</span>
                        <span class="pixai-tag-chip" data-tag="ultra-detailed, sharp focus">🔍 Sharp Focus</span>
                        <span class="pixai-tag-chip" data-tag="beautiful detailed eyes">👁️ Detailed Eyes</span>
                        <span class="pixai-tag-chip" data-tag="mrg style">🎨 MRG Style</span>
                        <span class="pixai-tag-chip" data-tag="anime screencap, cinematic lighting">🎬 Cinematic</span>
                    </div>
                </div>

                <div>
                    <div class="tag-group-title">🎀 Anime & Presets</div>
                    <div class="tag-container">
                        <span class="pixai-tag-chip" data-tag="zero two (darling in the franxx), horns, military uniform">Zero Two</span>
                        <span class="pixai-tag-chip" data-tag="hatsune miku, vocaloid, rabbit hole, full body">Miku Rabbit Hole</span>
                        <span class="pixai-tag-chip" data-tag="1girl, solo, beautiful face">1girl Solo</span>
                        <span class="pixai-tag-chip" data-tag="cyberpunk city, neon lights">Cyberpunk</span>
                    </div>
                </div>

                <div class="theme-toggle-row">
                    <span>🎨 PixAI Theme Style</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" id="pixai-theme-checkbox" style="cursor:pointer;" checked />
                        <span id="pixai-theme-label" style="font-weight:600; color:#c084fc;">ON</span>
                    </label>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // 이벤트 바인딩
        const collapseBtn = widget.querySelector('#pixai-collapse-btn');
        const headerTitle = widget.querySelector('#pixai-toggle-collapse');
        function toggleCollapse() {
            widget.classList.toggle('collapsed');
            const collapsed = widget.classList.contains('collapsed');
            collapseBtn.textContent = collapsed ? '➕' : '➖';
            localStorage.setItem(STORAGE_KEY_COLLAPSED, collapsed ? 'true' : 'false');
        }
        collapseBtn.addEventListener('click', toggleCollapse);
        headerTitle.addEventListener('click', toggleCollapse);

        // 태그 클릭 이벤트
        widget.querySelectorAll('.pixai-tag-chip[data-tag]').forEach(chip => {
            chip.addEventListener('click', () => {
                const tag = chip.getAttribute('data-tag');
                insertTagToPrompt(tag);
            });
        });

        // 비율 버튼 클릭 이벤트
        widget.querySelectorAll('.aspect-chip[data-aspect]').forEach(chip => {
            chip.addEventListener('click', () => {
                const aspect = chip.getAttribute('data-aspect');
                selectAspectRatio(aspect);
            });
        });

        // 테마 토글 체크박스
        const themeCheckbox = widget.querySelector('#pixai-theme-checkbox');
        const themeLabel = widget.querySelector('#pixai-theme-label');
        const isThemeEnabled = localStorage.getItem(STORAGE_KEY_THEME) !== 'false'; // 기본 ON

        themeCheckbox.checked = isThemeEnabled;
        if (isThemeEnabled) {
            document.body.classList.add('pixai-theme');
            themeLabel.textContent = 'ON';
            themeLabel.style.color = '#c084fc';
        } else {
            document.body.classList.remove('pixai-theme');
            themeLabel.textContent = 'OFF';
            themeLabel.style.color = '#9d8ec2';
        }

        themeCheckbox.addEventListener('change', () => {
            if (themeCheckbox.checked) {
                document.body.classList.add('pixai-theme');
                themeLabel.textContent = 'ON';
                themeLabel.style.color = '#c084fc';
                localStorage.setItem(STORAGE_KEY_THEME, 'true');
            } else {
                document.body.classList.remove('pixai-theme');
                themeLabel.textContent = 'OFF';
                themeLabel.style.color = '#9d8ec2';
                localStorage.setItem(STORAGE_KEY_THEME, 'false');
            }
        });
    }

    // ==========================================
    // 4. 초기화 및 감시
    // ==========================================
    function init() {
        injectStyle();
        // 기본적으로 PixAI 테마 활성화
        if (localStorage.getItem(STORAGE_KEY_THEME) !== 'false' && document.body) {
            document.body.classList.add('pixai-theme');
        }
        createHelperWidget();
    }

    init();
    new MutationObserver(init).observe(document, { childList: true, subtree: true });

    // 단축키 Alt + P 로 위젯 토글
    window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
            const widget = document.getElementById(HELPER_ID);
            if (widget) {
                widget.classList.toggle('collapsed');
                const collapsed = widget.classList.contains('collapsed');
                const btn = widget.querySelector('#pixai-collapse-btn');
                if (btn) btn.textContent = collapsed ? '➕' : '➖';
                localStorage.setItem(STORAGE_KEY_COLLAPSED, collapsed ? 'true' : 'false');
            }
        }
    });
})();
