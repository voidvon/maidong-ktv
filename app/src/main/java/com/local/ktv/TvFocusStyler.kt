package com.local.ktv

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Build
import android.view.View
import android.view.ViewGroup
import java.util.Collections
import java.util.WeakHashMap

/** Applies the original OTT red-to-orange focus fill to remote-control targets. */
object TvFocusStyler {
    private val installed = Collections.newSetFromMap(WeakHashMap<View, Boolean>())

    fun install(view: View) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            view.defaultFocusHighlightEnabled = false
        }
        if (!view.isEnabled || view.visibility != View.VISIBLE || !view.isClickable || !installed.add(view)) return
        view.isFocusable = true
        view.isFocusableInTouchMode = false
        val normal = view.background ?: ColorDrawable(Color.TRANSPARENT)
        fun focusFill() = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.rgb(232, 49, 111), Color.rgb(255, 154, 48)),
            ).apply {
                cornerRadius = view.resources.displayMetrics.density * 7f
                setStroke((view.resources.displayMetrics.density + 0.5f).toInt(), Color.argb(150, 255, 255, 255))
            }

        view.background = StateListDrawable().apply {
            // Focus must never retain the normal drawable. Platform Buttons and a
            // few legacy OTT assets use rectangular grey insets which remain visible
            // around a rounded overlay and make the focus target look oversized.
            addState(intArrayOf(android.R.attr.state_focused), focusFill())
            addState(intArrayOf(android.R.attr.state_pressed), focusFill())
            addState(intArrayOf(), normal)
        }
    }

    fun installTree(view: View) {
        disablePlatformHighlight(view)
        // Structural dialog containers own navigation, but are not action targets.
        // Styling them paints the entire option sheet instead of the active option.
        if (view !is ViewGroup) install(view)
        if (view is ViewGroup) repeat(view.childCount) { installTree(view.getChildAt(it)) }
    }

    fun disablePlatformHighlightTree(view: View) {
        disablePlatformHighlight(view)
        if (view is ViewGroup) repeat(view.childCount) {
            disablePlatformHighlightTree(view.getChildAt(it))
        }
    }

    private fun disablePlatformHighlight(view: View) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            view.defaultFocusHighlightEnabled = false
        }
    }
}
