package com.kmarchais.orbit;

import android.webkit.CookieManager;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "AtlasGoogle")
public class AtlasGooglePlugin extends Plugin {
    @PluginMethod public void signIn(PluginCall call) {
        String clientId = call.getString("clientId"), nonce = call.getString("nonce");
        if (clientId == null || !clientId.endsWith(".apps.googleusercontent.com") || nonce == null || !nonce.matches("[A-Za-z0-9_-]{43}")) {
            call.reject("Google connection unavailable."); return;
        }
        getActivity().runOnUiThread(() -> {
            GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
            GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
            CredentialManager.create(getContext()).getCredentialAsync(getActivity(), request, null,
                ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse result) {
                        try {
                            if (!(result.getCredential() instanceof CustomCredential)) {throw new IllegalArgumentException();}
                            GoogleIdTokenCredential credential = GoogleIdTokenCredential.createFrom(result.getCredential().getData());
                            JSObject response = new JSObject(); response.put("credential", credential.getIdToken()); call.resolve(response);
                        } catch (Exception error) {call.reject("Google connection failed.");}
                    }
                    @Override public void onError(GetCredentialException error) {
                        call.reject("Google connection failed.", error instanceof GetCredentialCancellationException ? "CANCELLED" : "GOOGLE_UNAVAILABLE");
                    }
                });
        });
    }
    @PluginMethod public void persistCookies(PluginCall call) {CookieManager.getInstance().flush(); call.resolve();}
    @PluginMethod public void signOut(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
            ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void ignored) {CookieManager.getInstance().flush(); call.resolve();}
                @Override public void onError(ClearCredentialException error) {CookieManager.getInstance().flush(); call.resolve();}
            });
    }
}
