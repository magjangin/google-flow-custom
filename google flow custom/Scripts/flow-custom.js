// Google Flow(flow.google.com) 사용자 정의 스크립트.
// WebView2 "document created" 스크립트로 등록되므로 <html>/<head>가 아직 없는 시점에 실행된다.
// 아래 MutationObserver가 붙일 노드가 생기는 즉시 <style>을 넣고, Flow의 SPA 화면 전환으로
// <head>가 갈아 끼워져도 다시 넣어 준다. 같은 문서에서 여러 번 실행돼도 안전하다(NavigationCompleted 2차 주입).
//
// 숨기거나 바꾸고 싶은 요소가 생기면 CUSTOM_CSS에 selector를 추가한다.
// 클래스명은 Flow 개편마다 바뀌므로 추측하지 말고 F12(DevTools)로 실제 DOM을 확인할 것.
(function () {
    // 문서 생성 스크립트는 모든 탐색(로그인 페이지 accounts.google.com 포함)에서 실행되므로
    // Flow 페이지에서만 동작하게 막는다. 로그인 화면은 절대 건드리지 않는다.
    if (location.hostname !== 'flow.google.com') return;
    if (window.__flowCustomInstalled) return;
    window.__flowCustomInstalled = true;

    const STYLE_ID = 'flow-custom-style';

    const CUSTOM_CSS = `
        /* 예) 특정 배너 숨기기:
           [aria-label="..."] { display: none !important; } */
    `;

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const target = document.head || document.documentElement;
        if (!target) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CUSTOM_CSS;
        target.appendChild(style);
    }

    injectStyle();
    new MutationObserver(injectStyle).observe(document, { childList: true, subtree: true });
})();
