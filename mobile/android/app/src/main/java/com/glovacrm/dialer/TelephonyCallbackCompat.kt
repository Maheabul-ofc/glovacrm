package com.glovacrm.dialer

import android.os.Build
import android.telephony.TelephonyCallback
import androidx.annotation.RequiresApi

/**
 * Android 12+ (API 31+) compatible TelephonyCallback
 * Wraps the new API and delegates to the same state handler.
 */
@RequiresApi(Build.VERSION_CODES.S)
class TelephonyCallbackCompat(
    private val onStateChanged: (Int) -> Unit
) : TelephonyCallback(), TelephonyCallback.CallStateListener {

    override fun onCallStateChanged(state: Int) {
        onStateChanged(state)
    }
}
