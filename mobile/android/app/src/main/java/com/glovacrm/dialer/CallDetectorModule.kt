package com.glovacrm.dialer

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.database.Cursor
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

private data class CallLogMatch(
    val id: Long,
    val number: String,
    val type: Int,
    val duration: Int,
    val date: Long
)

class CallDetectorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "GlovaCallDetector"
        private const val EVENT_CALL_STATE = "GlovaCRM_CallStateChanged"
        private const val REJECTED_CALL_TYPE = 5
        private const val BLOCKED_CALL_TYPE = 6
        private val RETRY_DELAYS_MS = longArrayOf(600L, 1400L, 2600L, 4200L)
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    private var telephonyManager: TelephonyManager? = null
    private var telephonyCallback: Any? = null
    @Suppress("DEPRECATION")
    private var phoneStateListener: PhoneStateListener? = null
    private var callLogObserver: ContentObserver? = null

    private var isMonitoring = false
    private var resolved = false
    private var sawOffHook = false
    private var targetPhone = ""
    private var currentCallKey = ""
    private var dialerOpenedAt = 0L
    private var preDialMaxCallId = 0L

    override fun getName(): String = "CallDetector"

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN NativeEventEmitter
    }

    @ReactMethod
    fun hasRequiredPermissions(promise: Promise) {
        val phoneState = isPermissionGranted(Manifest.permission.READ_PHONE_STATE)
        val callLog = isPermissionGranted(Manifest.permission.READ_CALL_LOG)
        val result = Arguments.createMap().apply {
            putBoolean("phoneState", phoneState)
            putBoolean("callLog", callLog)
            putBoolean("granted", phoneState && callLog)
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun startMonitoring(phoneNumber: String, callKey: String) {
        mainHandler.post {
            cleanupMonitoring()

            targetPhone = phoneNumber
            currentCallKey = callKey
            dialerOpenedAt = System.currentTimeMillis()
            preDialMaxCallId = getLatestCallLogId()
            sawOffHook = false
            resolved = false
            isMonitoring = true

            telephonyManager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

            registerTelephonyListener()
            registerCallLogObserver()

            Log.d(
                TAG,
                "Monitoring started callKey=$callKey preDialMaxCallId=$preDialMaxCallId"
            )
        }
    }

    @ReactMethod
    fun stopMonitoring() {
        mainHandler.post {
            isMonitoring = false
            resolved = true
            cleanupMonitoring()
        }
    }

    @ReactMethod
    fun checkAfterAppResume(promise: Promise) {
        mainHandler.post {
            if (!isMonitoring || resolved) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("monitoring", false)
                    putString("state", "IDLE")
                })
                return@post
            }

            val callState = getCurrentCallState()
            if (callState != TelephonyManager.CALL_STATE_IDLE) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("monitoring", true)
                    putString("state", "ONGOING")
                    putBoolean("sawOffHook", sawOffHook)
                })
                return@post
            }

            val immediateMatch = findMatchingCallLogEntry()
            if (immediateMatch != null) {
                emitMatchResult(immediateMatch)
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("monitoring", false)
                    putString("state", "RESOLVED")
                })
                return@post
            }

            if (sawOffHook) {
                // Call ended right before user returned to app; ensure retry poll runs
                scheduleCallLogPoll()
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("monitoring", true)
                    putString("state", "POLLING_CALL_LOG")
                })
                return@post
            }

            // User returned without OFFHOOK firing: check once after 500ms in case carrier wrote CallLog,
            // otherwise treat as cancelled dial before placing call.
            mainHandler.postDelayed({
                if (!isMonitoring || resolved) return@postDelayed
                if (getCurrentCallState() != TelephonyManager.CALL_STATE_IDLE) return@postDelayed

                val delayedMatch = findMatchingCallLogEntry()
                if (delayedMatch != null) {
                    emitMatchResult(delayedMatch)
                } else {
                    emitCallResult(
                        status = "CANCELLED",
                        duration = 0,
                        callLogType = 0,
                        detectedFrom = "NONE",
                        found = false,
                        phone = targetPhone
                    )
                }
            }, 500L)

            promise.resolve(Arguments.createMap().apply {
                putBoolean("monitoring", true)
                putString("state", "CHECKING_RESUME")
            })
        }
    }

    override fun invalidate() {
        mainHandler.post {
            isMonitoring = false
            resolved = true
            cleanupMonitoring()
        }
        super.invalidate()
    }

    private fun isPermissionGranted(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(reactContext, permission) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun getCurrentCallState(): Int {
        val tm = telephonyManager ?: return TelephonyManager.CALL_STATE_IDLE
        if (!isPermissionGranted(Manifest.permission.READ_PHONE_STATE)) {
            return TelephonyManager.CALL_STATE_IDLE
        }
        return try {
            @Suppress("DEPRECATION")
            tm.callState
        } catch (e: SecurityException) {
            Log.w(TAG, "SecurityException reading callState: ${e.message}")
            TelephonyManager.CALL_STATE_IDLE
        } catch (e: Exception) {
            Log.w(TAG, "Exception reading callState: ${e.message}")
            TelephonyManager.CALL_STATE_IDLE
        }
    }

    private fun registerTelephonyListener() {
        val tm = telephonyManager ?: return
        if (!isPermissionGranted(Manifest.permission.READ_PHONE_STATE)) {
            Log.w(TAG, "READ_PHONE_STATE not granted; relying on CallLog observer/resume check")
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val callback = TelephonyCallbackCompat { state ->
                    mainHandler.post { handleCallStateChanged(state) }
                }
                telephonyCallback = callback
                tm.registerTelephonyCallback(reactContext.mainExecutor, callback)
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        mainHandler.post { handleCallStateChanged(state) }
                    }
                }
                phoneStateListener = listener
                @Suppress("DEPRECATION")
                tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register telephony listener: ${e.message}")
        }
    }

    private fun registerCallLogObserver() {
        if (!isPermissionGranted(Manifest.permission.READ_CALL_LOG)) {
            Log.w(TAG, "READ_CALL_LOG not granted")
            return
        }

        try {
            val observer = object : ContentObserver(mainHandler) {
                override fun onChange(selfChange: Boolean) {
                    super.onChange(selfChange)
                    if (!isMonitoring || resolved) return
                    if (getCurrentCallState() != TelephonyManager.CALL_STATE_IDLE) return

                    val match = findMatchingCallLogEntry()
                    if (match != null) {
                        emitMatchResult(match)
                    }
                }
            }
            callLogObserver = observer
            reactContext.contentResolver.registerContentObserver(
                CallLog.Calls.CONTENT_URI,
                true,
                observer
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register CallLog ContentObserver: ${e.message}")
        }
    }

    private fun handleCallStateChanged(state: Int) {
        if (!isMonitoring || resolved) return

        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                sawOffHook = true
                Log.d(TAG, "Call OFFHOOK for callKey=$currentCallKey")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                // Android sends initial IDLE right after registering listener; ignore until OFFHOOK seen
                if (!sawOffHook) return
                Log.d(TAG, "Call IDLE after OFFHOOK; scheduling CallLog verification")
                scheduleCallLogPoll()
            }
        }
    }

    private fun scheduleCallLogPoll() {
        mainHandler.removeCallbacksAndMessages(null)
        RETRY_DELAYS_MS.forEachIndexed { idx, delayMs ->
            val isFinalAttempt = idx == RETRY_DELAYS_MS.lastIndex
            mainHandler.postDelayed({
                if (!isMonitoring || resolved) return@postDelayed
                val match = findMatchingCallLogEntry()
                if (match != null) {
                    emitMatchResult(match)
                } else if (isFinalAttempt) {
                    emitCallResult(
                        status = "FAILED",
                        duration = 0,
                        callLogType = 0,
                        detectedFrom = "TELEPHONY_NO_LOG",
                        found = false,
                        phone = targetPhone
                    )
                }
            }, delayMs)
        }
    }

    private fun getLatestCallLogId(): Long {
        if (!isPermissionGranted(Manifest.permission.READ_CALL_LOG)) return 0L
        var cursor: Cursor? = null
        return try {
            cursor = reactContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls._ID),
                null,
                null,
                "${CallLog.Calls._ID} DESC"
            )
            if (cursor != null && cursor.moveToFirst()) {
                cursor.getLong(0)
            } else {
                0L
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read latest CallLog ID: ${e.message}")
            0L
        } finally {
            cursor?.close()
        }
    }

    private fun findMatchingCallLogEntry(): CallLogMatch? {
        if (!isPermissionGranted(Manifest.permission.READ_CALL_LOG)) return null

        val targetDigits = digitsOnly(targetPhone)
        var cursor: Cursor? = null

        return try {
            cursor = reactContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls._ID,
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            if (cursor == null) return null

            val idCol = cursor.getColumnIndex(CallLog.Calls._ID)
            val numCol = cursor.getColumnIndex(CallLog.Calls.NUMBER)
            val typeCol = cursor.getColumnIndex(CallLog.Calls.TYPE)
            val durCol = cursor.getColumnIndex(CallLog.Calls.DURATION)
            val dateCol = cursor.getColumnIndex(CallLog.Calls.DATE)

            var scanned = 0
            while (cursor.moveToNext() && scanned < 20) {
                scanned++
                val id = if (idCol >= 0) cursor.getLong(idCol) else 0L
                val date = if (dateCol >= 0) cursor.getLong(dateCol) else 0L

                if (id <= preDialMaxCallId || date < dialerOpenedAt - 5000L) {
                    continue
                }

                val type = if (typeCol >= 0) cursor.getInt(typeCol) else 0
                if (type == CallLog.Calls.INCOMING_TYPE || type == CallLog.Calls.VOICEMAIL_TYPE) {
                    continue
                }

                val number = if (numCol >= 0) cursor.getString(numCol) ?: "" else ""
                if (!numbersMatch(targetDigits, number)) {
                    continue
                }

                val duration = if (durCol >= 0) cursor.getLong(durCol).toInt().coerceAtLeast(0) else 0
                return CallLogMatch(
                    id = id,
                    number = if (number.isNotBlank()) number else targetPhone,
                    type = type,
                    duration = duration,
                    date = date
                )
            }
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error querying CallLog: ${e.message}")
            null
        } finally {
            cursor?.close()
        }
    }

    private fun digitsOnly(phone: String?): String =
        phone?.replace(Regex("\\D"), "") ?: ""

    private fun numbersMatch(targetDigits: String, rowPhone: String): Boolean {
        val rowDigits = digitsOnly(rowPhone)
        if (targetDigits.isEmpty() || rowDigits.isEmpty()) return false
        if (targetDigits == rowDigits) return true

        if (targetDigits.length >= 7 && rowDigits.length >= 7) {
            val targetSuffix = targetDigits.takeLast(minOf(10, targetDigits.length))
            val rowSuffix = rowDigits.takeLast(minOf(10, rowDigits.length))
            return targetSuffix == rowSuffix
        }
        return false
    }

    private fun emitMatchResult(match: CallLogMatch) {
        val status = when {
            match.duration > 0 -> "COMPLETED"
            match.type == REJECTED_CALL_TYPE || match.type == BLOCKED_CALL_TYPE -> "BUSY"
            else -> "MISSED"
        }
        val durationSeconds = if (match.duration > 0) match.duration else 0
        emitCallResult(
            status = status,
            duration = durationSeconds,
            callLogType = match.type,
            detectedFrom = "ANDROID_CALL_LOG",
            found = true,
            phone = match.number
        )
    }

    private fun emitCallResult(
        status: String,
        duration: Int,
        callLogType: Int,
        detectedFrom: String,
        found: Boolean,
        phone: String
    ) {
        if (resolved) return
        resolved = true
        isMonitoring = false
        cleanupMonitoring()

        val params: WritableMap = Arguments.createMap().apply {
            putString("status", status)
            putInt("duration", duration)
            putString("phone", phone)
            putString("callKey", currentCallKey)
            putInt("callLogType", callLogType)
            putString("detectedFrom", detectedFrom)
            putBoolean("found", found)
        }

        Log.d(
            TAG,
            "Emitting call result status=$status duration=$duration callKey=$currentCallKey found=$found"
        )
        sendEvent(EVENT_CALL_STATE, params)
    }

    private fun cleanupMonitoring() {
        mainHandler.removeCallbacksAndMessages(null)

        val tm = telephonyManager
        if (tm != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && telephonyCallback != null) {
                    tm.unregisterTelephonyCallback(telephonyCallback as TelephonyCallback)
                } else if (phoneStateListener != null) {
                    @Suppress("DEPRECATION")
                    tm.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering telephony listener: ${e.message}")
            }
        }
        telephonyCallback = null
        phoneStateListener = null

        val observer = callLogObserver
        if (observer != null) {
            try {
                reactContext.contentResolver.unregisterContentObserver(observer)
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering CallLog observer: ${e.message}")
            }
            callLogObserver = null
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }
}
