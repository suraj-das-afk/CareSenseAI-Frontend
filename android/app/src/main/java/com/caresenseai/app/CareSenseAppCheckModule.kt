package com.caresenseai.app

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.firebase.appcheck.FirebaseAppCheck

class CareSenseAppCheckModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "CareSenseAppCheck"
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun getToken(
    forceRefresh: Boolean,
    promise: Promise,
  ) {
    FirebaseAppCheck
      .getInstance()
      .getAppCheckToken(forceRefresh)
      .addOnSuccessListener { appCheckToken ->
        promise.resolve(appCheckToken.token)
      }
      .addOnFailureListener { error ->
        promise.reject(
          "APP_CHECK_TOKEN_ERROR",
          error.message,
          error,
        )
      }
  }
}