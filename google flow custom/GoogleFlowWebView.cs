using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Platform;
using Microsoft.Web.WebView2.Core;

namespace google_flow_custom
{
    /// <summary>
    /// Google Flow 전용 WebView2 설정: 영구 로그인 프로필, 다운로드 폴더, 사용자 스크립트 주입.
    /// 창/UI 연결은 <see cref="MainWindow"/>에 두고 Flow 관련 동작만 여기 모은다
    /// (youtube studio custom의 YoutubeStudioWebView와 같은 구조).
    /// </summary>
    internal static class GoogleFlowWebView
    {
        public static readonly Uri FlowUri = new("https://flow.google.com/");

        /// <summary>
        /// 형제 도구(SoundCloud_Downloads, YouTube_Downloads, SteamTrailer_Downloads)와 같은 규칙.
        /// </summary>
        public static readonly string DownloadFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads",
            "GoogleFlow_Downloads");

        private static readonly Lazy<string> CustomScript = new(LoadCustomScript);

        public static void ConfigureEnvironment(WebViewEnvironmentRequestedEventArgs e)
        {
            // Flow의 클래스명은 개편마다 바뀌므로 F12/우클릭 "검사"로 실제 DOM을 읽을 수 있게 둔다.
            e.EnableDevTools = true;

            // 전용 영구 프로필: 앱을 껐다 켜도 Google 로그인이 유지된다.
            if (e is WindowsWebView2EnvironmentRequestedEventArgs webView2)
            {
                webView2.ProfileName = "GoogleFlowCustom";
                webView2.UserDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "GoogleFlowCustom", "WebView2");
            }
        }

        /// <summary>
        /// Avalonia WebView의 공용 API에는 없는 기능(문서 생성 시점 스크립트, 다운로드 폴더)을 쓰기 위해
        /// 플랫폼 핸들에서 ICoreWebView2를 꺼내 설정한다. 첫 탐색 전에 끝나야 첫 페이지에도 적용된다.
        /// </summary>
        public static async Task ConfigureCoreAsync(NativeWebView webView)
        {
            if (webView.TryGetPlatformHandle() is not IWindowsWebView2PlatformHandle handle)
                return;

            var core = CoreWebView2.CreateFromComICoreWebView2(handle.CoreWebView2);

            Directory.CreateDirectory(DownloadFolder);
            core.Profile.DefaultDownloadFolderPath = DownloadFolder;

            // NavigationCompleted에서 InvokeScript로 넣으면 이미 한 프레임 이상 그려진 뒤라 깜빡인다.
            // 문서 생성 시점 스크립트로 등록해 Flow 자체 콘텐츠가 파싱되기 전에 스타일이 자리 잡게 한다.
            await core.AddScriptToExecuteOnDocumentCreatedAsync(CustomScript.Value);
        }

        /// <summary>문서 생성 시점 등록이 누락된 예외 상황용 2차 안전망 (스크립트는 중복 실행에 안전).</summary>
        public static Task ApplyCustomScriptAsync(NativeWebView webView) =>
            webView.InvokeScript(CustomScript.Value);

        private static string LoadCustomScript()
        {
            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = assembly.GetManifestResourceNames()
                .First(name => name.EndsWith("flow-custom.js", StringComparison.Ordinal));
            using var stream = assembly.GetManifestResourceStream(resourceName)!;
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
    }
}
