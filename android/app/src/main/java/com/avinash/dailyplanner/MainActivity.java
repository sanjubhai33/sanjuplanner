package com.avinash.dailyplanner;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** App background me jaate hi home-screen widget ko fresh data ke saath refresh karo. */
    @Override
    protected void onPause() {
        super.onPause();
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(this);
            ComponentName widget = new ComponentName(this, PlannerWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(widget);
            if (ids != null && ids.length > 0) {
                Intent update = new Intent(this, PlannerWidgetProvider.class);
                update.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                update.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                sendBroadcast(update);
            }
        } catch (Exception ignored) {
            // Widget refresh best-effort hai — fail hone par app normal chalta rahe.
        }
    }
}
