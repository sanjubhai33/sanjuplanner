package com.avinash.dailyplanner;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Home-screen widget showing today's task/water progress from Capacitor Preferences. */
public class PlannerWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    private RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_planner);

        String tasksText = "No tasks yet";
        String waterText = "Water 0/8";
        String nextText = "Tap to open planner";

        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raw = prefs.getString("widget_summary", null);
            if (raw != null) {
                JSONObject json = new JSONObject(raw);
                int total = json.optInt("total", 0);
                int done = json.optInt("done", 0);
                int water = json.optInt("water", 0);
                int waterGoal = json.optInt("waterGoal", 8);
                String nextTitle = json.optString("nextTitle", "");
                String nextTime = json.optString("nextTime", "");

                tasksText = total == 0 ? "No tasks today" : ("Tasks " + done + "/" + total);
                waterText = "Water " + water + "/" + waterGoal;
                if (nextTitle.length() > 0) {
                    nextText = nextTime.length() > 0 ? (nextTime + " · " + nextTitle) : nextTitle;
                } else if (total > 0) {
                    nextText = "All done for today";
                }
            }
        } catch (Exception ignored) {
            // Keep defaults if stored data is missing or malformed.
        }

        views.setTextViewText(R.id.widget_tasks, tasksText);
        views.setTextViewText(R.id.widget_water, waterText);
        views.setTextViewText(R.id.widget_next, nextText);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        return views;
    }
}
