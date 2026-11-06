package com.glovacrm.dialer

import android.content.Context
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * GlovaCRM Auto Call Detector
 *
 * Monitors Android phone state to automatically detect:
 * - Call started (OFFHOOK)
 * - Call ended (back to IDLE)
 * - Call missed / never answered
 *
 * Emits a "CallStateChanged" event to React Native with:
 *   { status: "COMPLETED"|"MISSED"|"FAILED", duration: seconds, phone: string }
 */
class CallDetectorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "CallDetector"
        const val EVENT_CALL_STATE = "GlovaCRM_CallStateChanged"
    }

    private val telephonyManager: TelephonyManager =
        reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

    private var phoneStateListener: PhoneStateListener? = null

    // Track call lifecycle
    private var callStartedAt: Long = 0L      // when OFFHOOK began (call answered)
    private var callDialingAt: Long = 0L      // when we started dialing
    private var wasOffHook: Boolean = false    // did the call ever get answered?
    private var currentPhone: String = ""

    override fun getName(): String = MODULE_NAME

    /**
     * Called from React Native to start monitoring for a specific outgoing call.
     * phoneNumber: the number being called (for logging purposes)
     */
    @ReactMethod
    fun startMonitoring(phoneNumber: String) {
        currentPhone = phoneNumber
        callDialingAt = System.currentTimeMillis()
        callStartedAt = 0L
        wasOffHook = false
        registerListener()
    }

    /**
     * Called from React Native to stop monitoring (e.g. user cancelled before call).
     */
    @ReactMethod
    fun stopMonitoring() {
        unregisterListener()
        currentPhone = ""
        callDialingAt = 0L
        callStartedAt = 0L
        wasOffHook = false
    }

    @ReactMethod
    fun addListener(eventName: String) { /* Required for RN event emitter */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* Required for RN event emitter */ }

    private fun registerListener() {
        unregisterListener() // safety: remove any existing listener

        phoneStateListener = object : PhoneStateListener() {
            @Suppress("OVERRIDE_DEPRECATION")
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                handleCallStateChange(state)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ requires executor-based listener
            telephonyManager.registerTelephonyCallback(
                reactApplicationContext.mainExecutor,
                TelephonyCallbackCompat(::handleCallStateChange)
            )
        } else {
            @Suppress("DEPRECATION")
            telephonyManager.listen(
                phoneStateListener,
                PhoneStateListener.LISTEN_CALL_STATE
            )
        }
    }

    private fun unregisterListener() {
        phoneStateListener?.let {
            @Suppress("DEPRECATION")
            telephonyManager.listen(it, PhoneStateListener.LISTEN_NONE)
            phoneStateListener = null
        }
    }

    private fun handleCallStateChange(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // Call was answered / outgoing call connected
                if (!wasOffHook) {
                    wasOffHook = true
                    callStartedAt = System.currentTimeMillis()
                }
            }

            TelephonyManager.CALL_STATE_IDLE -> {
                // Call ended — figure out what happened
                if (callDialingAt == 0L) return // we weren't monitoring

                val durationMs = if (wasOffHook && callStartedAt > 0) {
                    System.currentTimeMillis() - callStartedAt
                } else 0L

                val durationSeconds = (durationMs / 1000).toInt()

                val status = when {
                    wasOffHook && durationSeconds > 0 -> "COMPLETED"
                    wasOffHook && durationSeconds == 0 -> "COMPLETED" // very short call
                    else -> "MISSED" // went from RINGING/DIALING straight to IDLE
                }

                // Emit event to React Native
                sendCallEndedEvent(status, durationSeconds, currentPhone)

                // Reset state
                unregisterListener()
                callDialingAt = 0L
                callStartedAt = 0L
                wasOffHook = false
            }

            TelephonyManager.CALL_STATE_RINGING -> {
                // Incoming call ringing (we mostly care about outgoing, but track it)
            }
        }
    }

    private fun sendCallEndedEvent(status: String, duration: Int, phone: String) {
        try {
            val params = Arguments.createMap().apply {
                putString("status", status)
                putInt("duration", duration)
                putString("phone", phone)
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_CALL_STATE, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
