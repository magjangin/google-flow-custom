using Avalonia.Controls;

namespace google_flow_custom
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void WebView_OnEnvironmentRequested(object? sender, WebViewEnvironmentRequestedEventArgs e) =>
            GoogleFlowWebView.ConfigureEnvironment(e);

        private async void WebView_OnNavigationCompleted(object? sender, WebViewNavigationCompletedEventArgs e)
        {
            if (e.IsSuccess)
                await GoogleFlowWebView.ApplyCustomScriptAsync(WebView);
        }

        // 문서 생성 시점 스크립트 등록은 비동기라, 등록이 끝난 뒤에 첫 탐색을 시작해야 첫 페이지에도 적용된다.
        // (XAML에 Source를 정적으로 두지 않는 이유 — youtube studio custom 깜빡임 버그 기록 참고)
        private async void WebView_OnAdapterCreated(object? sender, WebViewAdapterEventArgs e)
        {
            await GoogleFlowWebView.ConfigureCoreAsync(WebView);
            WebView.Source = GoogleFlowWebView.FlowUri;
        }
    }
}
