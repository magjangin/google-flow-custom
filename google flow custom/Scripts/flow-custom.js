// Google Flow(flow.google.com) - PixAI Style Enhanced Custom Script
// Danbooru/PixAI 태그 -> 2D 애니메이션 원화 최적화 엔진 내장

(function () {
    if (location.hostname !== 'flow.google.com') return;
    if (window.__flowCustomInstalled) return;
    window.__flowCustomInstalled = true;

    const STYLE_ID = 'flow-pixai-style';
    const HELPER_ID = 'flow-pixai-helper';
    const STORAGE_KEY_THEME = 'flow_pixai_theme_enabled';
    const STORAGE_KEY_OPTIMIZE = 'flow_pixai_auto_optimize';
    const STORAGE_KEY_COLLAPSED = 'flow_pixai_helper_collapsed';

    // ==========================================
    // 0. Danbooru/PixAI 태그 -> 2D 애니 원화 변환 엔진
    // ==========================================
    function optimizeDanbooruPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string') return rawText;

        let text = rawText.trim();
        let character = '';
        let copyright = '';

        // 1. character: ... 추출
        const charMatch = text.match(/character:\s*([^,\n]+)/i);
        if (charMatch) {
            let rawChar = charMatch[1].trim();
            // 언더스코어 및 시리즈 괄호 분리 (예: Surtr_(arknights) -> Surtr, arknights)
            const seriesInChar = rawChar.match(/^([^(]+)\(([^)]+)\)$/);
            if (seriesInChar) {
                character = seriesInChar[1].replace(/_/g, ' ').trim();
                if (!copyright) copyright = seriesInChar[2].replace(/_/g, ' ').trim();
            } else {
                character = rawChar.replace(/_/g, ' ').trim();
            }
            text = text.replace(charMatch[0], '');
        }

        // 2. copyright: ... 추출
        const copyMatch = text.match(/copyright:\s*([^,\n]+)/i);
        if (copyMatch) {
            copyright = copyMatch[1].replace(/_/g, ' ').trim();
            text = text.replace(copyMatch[0], '');
        }

        // 3. 콤마 및 잔여 공백 정리
        text = text.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ',');

        // 4. 특수 태그 맵핑 (mrg style, rabbit hole, mesmerizer 등)
        text = text.replace(/\bmrg style\b/gi, 'Rabbit Hole MV anime key visual style, caststation art style');
        text = text.replace(/\brabbit hole\b/gi, 'Rabbit Hole theme, vibrant hot pink circular spotlight backdrop, bunny girl outfit with heart cut-out, white bunny ears headband, fishnet stockings');
        text = text.replace(/\bmesmerizer\b/gi, 'Mesmerizer music video art style by channelcaststation, bright sunny blue sky, smiling clouds, confetti, golden starburst');
        text = text.replace(/\bkasane_teto\b/gi, 'Kasane Teto, signature red twin-drill pigtails, train attendant cap with smiley face badge, yellow gloves');

        // 5. 핵심 2D 애니메이션 원화 품질/작화 앵커 구축
        let prefix = '2D anime illustration, masterpiece, high-end Japanese anime key visual, clean sharp lineart, cell shaded anime art';
        if (character && copyright) {
            prefix += `, ${character} from ${copyright}`;
        } else if (character) {
            prefix += `, ${character}`;
        } else if (copyright) {
            prefix += `, from ${copyright}`;
        }

        // 6. 합체 및 중복 태그 제거
        const tags = [prefix, text].filter(Boolean).join(', ');
        return tags.replace(/\s{2,}/g, ' ').trim();
    }

    // ==========================================
    // 1. PixAI 사이버/애니 다크 네온 테마 CSS
    // ==========================================
    const PIXAI_CSS = `
        :root {
            --pixai-bg-main: #0c0915;
            --pixai-bg-card: rgba(22, 17, 36, 0.85);
            --pixai-bg-card-hover: rgba(35, 27, 58, 0.95);
            --pixai-accent-purple: #a855f7;
            --pixai-accent-pink: #ec4899;
            --pixai-accent-cyan: #06b6d4;
            --pixai-border: rgba(168, 85, 247, 0.25);
            --pixai-text: #f3f0fb;
        }

        body.pixai-theme {
            background-color: var(--pixai-bg-main) !important;
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 85% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 40%) !important;
            color: var(--pixai-text) !important;
        }

        body.pixai-theme .aisandbox-content,
        body.pixai-theme flow-app-shell,
        body.pixai-theme .dark-theme {
            background: transparent !important;
        }

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

        body.pixai-theme .image-thumbnail,
        body.pixai-theme .image {
            border-radius: 8px !important;
            transition: transform 0.3s ease !important;
        }
        body.pixai-theme .image-tile:hover .image,
        body.pixai-theme .asset-card:hover .image-thumbnail {
            transform: scale(1.01) !important;
        }

        body.pixai-theme .right-panel,
        body.pixai-theme [class*="chat-panel"],
        body.pixai-theme [class*="session-panel"] {
            background: rgba(15, 11, 25, 0.75) !important;
            backdrop-filter: blur(16px) !important;
            border-left: 1px solid var(--pixai-border) !important;
        }

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

        body.pixai-theme .generate-icon-button,
        body.pixai-theme [aria-label="생성 시작"] {
            background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 2px 10px rgba(236, 72, 153, 0.4) !important;
            border: none !important;
        }

        /* 헬퍼 위젯 */
        #${HELPER_ID} {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 370px;
            background: rgba(18, 14, 30, 0.92);
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
        }

        #${HELPER_ID} .pixai-tag-chip.aspect-chip {
            background: rgba(6, 182, 212, 0.15);
            border-color: rgba(6, 182, 212, 0.4);
            color: #67e8f9;
            font-weight: 600;
        }

        #${HELPER_ID} .pixai-tag-chip.action-chip {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
            border-color: #ec4899;
            color: #ffb4dd;
            font-weight: 700;
        }

        #${HELPER_ID} .helper-btn {
            background: transparent;
            border: none;
            color: #bfaedc;
            cursor: pointer;
            font-size: 12px;
            padding: 2px 6px;
        }

        #${HELPER_ID} .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 5px;
            border-top: 1px solid rgba(168, 85, 247, 0.15);
            font-size: 11px;
            color: #9d8ec2;
        }
    `;

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const target = document.head || document.documentElement;
        if (!target) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = PIXAI_CSS;
        target.appendChild(style);
    }

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

    function applyPromptOptimization() {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return;
        const raw = editor.innerText.trim();
        if (!raw) return;
        const optimized = optimizeDanbooruPrompt(raw);
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, optimized);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function selectAspectRatio(ratioText) {
        const trigger = document.querySelector('[aria-label="설정 트리거"]');
        if (trigger) trigger.click();
        setTimeout(() => {
            const items = Array.from(document.querySelectorAll('.cdk-overlay-container button, .cdk-overlay-container [role="button"], .cdk-overlay-container [role="option"], .cdk-overlay-container [tabindex]'));
            const targetBtn = items.find(el => el.innerText && el.innerText.includes(ratioText));
            if (targetBtn) targetBtn.click();
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
                    <span>✨ PixAI Anime Studio</span>
                </span>
                <div style="display:flex; gap:4px;">
                    <button class="helper-btn" id="pixai-collapse-btn" title="접기/펼치기">${isCollapsed ? '➕' : '➖'}</button>
                </div>
            </div>
            <div class="helper-body">
                <div>
                    <div class="tag-group-title">⚡ 단부루 태그 2D 원화 변환기</div>
                    <div class="tag-container">
                        <button class="pixai-tag-chip action-chip" id="pixai-optimize-btn">⚡ 프롬프트 2D 애니 최적화</button>
                    </div>
                </div>

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
                        <span class="pixai-tag-chip" data-tag="2D anime illustration, cell shaded, clean outlines">🎨 2D Anime Cell</span>
                        <span class="pixai-tag-chip" data-tag="masterpiece, high-end Japanese anime key visual">👑 Key Visual</span>
                        <span class="pixai-tag-chip" data-tag="beautiful sparkling detailed anime eyes">👁️ Anime Eyes</span>
                        <span class="pixai-tag-chip" data-tag="vibrant vivid colors, dynamic floating pose">💫 Dynamic</span>
                    </div>
                </div>

                <div>
                    <div class="tag-group-title">🎀 Anime Presets</div>
                    <div class="tag-container">
                        <span class="pixai-tag-chip" data-tag="character: kasane_teto, mesmerizer, red twin-drill pigtails, train attendant cap, yellow gloves, peace sign, smiling clouds">Teto (메스머라이저)</span>
                        <span class="pixai-tag-chip" data-tag="character: hatsune_miku, copyright: vocaloid, rabbit hole, full body, mrg style">Miku Rabbit Hole</span>
                        <span class="pixai-tag-chip" data-tag="character: Surtr_(arknights), copyright: arknights, red hair, horns, black dress, magma">Surtr (명일방주)</span>
                        <span class="pixai-tag-chip" data-tag="zero two (darling in the franxx), horns, military uniform">Zero Two</span>
                    </div>
                </div>

                <div class="toggle-row">
                    <span>⚡ 자동 단부루 변환 (Auto-Optimize)</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" id="pixai-auto-opt-checkbox" checked />
                        <span id="pixai-auto-opt-label" style="font-weight:600; color:#ec4899;">ON</span>
                    </label>
                </div>

                <div class="toggle-row">
                    <span>🎨 PixAI 네온 테마</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" id="pixai-theme-checkbox" checked />
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

        // 프롬프트 최적화 버튼
        widget.querySelector('#pixai-optimize-btn').addEventListener('click', applyPromptOptimization);

        // 태그 칩 클릭
        widget.querySelectorAll('.pixai-tag-chip[data-tag]').forEach(chip => {
            chip.addEventListener('click', () => {
                const tag = chip.getAttribute('data-tag');
                insertTagToPrompt(tag);
            });
        });

        // 비율 버튼 클릭
        widget.querySelectorAll('.aspect-chip[data-aspect]').forEach(chip => {
            chip.addEventListener('click', () => {
                const aspect = chip.getAttribute('data-aspect');
                selectAspectRatio(aspect);
            });
        });

        // 자동 최적화 토글
        const autoOptCheckbox = widget.querySelector('#pixai-auto-opt-checkbox');
        const autoOptLabel = widget.querySelector('#pixai-auto-opt-label');
        const isAutoOpt = localStorage.getItem(STORAGE_KEY_OPTIMIZE) !== 'false';
        autoOptCheckbox.checked = isAutoOpt;
        autoOptLabel.textContent = isAutoOpt ? 'ON' : 'OFF';
        autoOptLabel.style.color = isAutoOpt ? '#ec4899' : '#9d8ec2';

        autoOptCheckbox.addEventListener('change', () => {
            const enabled = autoOptCheckbox.checked;
            autoOptLabel.textContent = enabled ? 'ON' : 'OFF';
            autoOptLabel.style.color = enabled ? '#ec4899' : '#9d8ec2';
            localStorage.setItem(STORAGE_KEY_OPTIMIZE, enabled ? 'true' : 'false');
        });

        // 테마 토글
        const themeCheckbox = widget.querySelector('#pixai-theme-checkbox');
        const themeLabel = widget.querySelector('#pixai-theme-label');
        const isTheme = localStorage.getItem(STORAGE_KEY_THEME) !== 'false';
        themeCheckbox.checked = isTheme;
        if (isTheme) {
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

    // 전송 버튼 가로채기 (자동 단부루 태그 최적화가 켜져 있을 때)
    function attachSubmitInterceptor() {
        const submitBtn = document.querySelector('[aria-label="생성 시작"]') || document.querySelector('.generate-icon-button');
        if (!submitBtn || submitBtn.__pixaiHooked) return;
        submitBtn.__pixaiHooked = true;

        submitBtn.addEventListener('mousedown', () => {
            if (localStorage.getItem(STORAGE_KEY_OPTIMIZE) === 'false') return;
            const editor = document.querySelector('.ProseMirror');
            if (!editor) return;
            const text = editor.innerText.trim();
            // character: 또는 copyright: 가 포함되어 있으면 자동 변환
            if (text.includes('character:') || text.includes('copyright:') || text.includes('mrg style')) {
                const optimized = optimizeDanbooruPrompt(text);
                editor.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
                document.execCommand('insertText', false, optimized);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, true);
    }

    function init() {
        injectStyle();
        if (localStorage.getItem(STORAGE_KEY_THEME) !== 'false' && document.body) {
            document.body.classList.add('pixai-theme');
        }
        createHelperWidget();
        attachSubmitInterceptor();
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

    // 전역 유틸 노출 (MCP 및 콘솔용)
    window.__flowOptimizeDanbooruPrompt = optimizeDanbooruPrompt;
})();
