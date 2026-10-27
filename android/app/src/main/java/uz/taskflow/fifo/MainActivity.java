package uz.taskflow.fifo;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import uz.taskflow.fifo.alarm.FifoAlarmPlugin;

public class MainActivity extends BridgeActivity {

    // Project accent color (Tailwind indigo-600), used for the status bar strip
    private static final int STATUS_BAR_COLOR = Color.parseColor("#4F46E5");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FifoAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        setupStatusBar();
    }

    private void setupStatusBar() {
        Window window = getWindow();
        // Android 14 and below: paint the status bar directly
        window.setStatusBarColor(STATUS_BAR_COLOR);

        // Android 15+ (edge-to-edge): the WebView gets margins from Capacitor
        // (adjustMarginsForEdgeToEdge), so the area behind it shows through as the strip
        View webView = getBridge().getWebView();
        if (webView.getParent() instanceof View) {
            ((View) webView.getParent()).setBackgroundColor(STATUS_BAR_COLOR);
        }

        // White clock/battery icons on the dark strip
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(false);
    }
}
