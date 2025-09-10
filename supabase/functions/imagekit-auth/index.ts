declare const Deno: any; // Workaround for Deno types in Supabase Edge Functions
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// import { encode as encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"; // Commented out unused import

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, Content-Type",
    } })
  }

  try {
    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");

    if (!privateKey) {
      console.error("Edge Function: IMAGEKIT_PRIVATE_KEY not set.");
      return new Response(JSON.stringify({ error: "ImageKit private key not set." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log("Edge Function: Private Key (masked):", privateKey.substring(0, 5) + "...");
    console.log("Edge Function: btoa exists:", typeof btoa !== 'undefined');

    const authenticationParameters = await ImageKitAuth.getAuthenticationParameters(privateKey);

    console.log("Edge Function: Generated Authentication Parameters:", authenticationParameters);

    return new Response(JSON.stringify(authenticationParameters), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) { // Change to any to satisfy linter
    console.error("Edge Function: Uncaught Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, Content-Type",
};

class ImageKitAuth {
  static lastStringToSign: string = ""; // Static property to store the last stringToSign

  static async getAuthenticationParameters(privateKey: string) {
    const token = Math.random().toString(36).substring(2);
    const expire = Math.floor(Date.now() / 1000) + 1800; // Current Unix epoch in seconds + 30 minutes
    console.log("Edge Function: Token:", token);
    console.log("Edge Function: Expire:", expire);
    const signature = await this.getSignature(token, expire, privateKey);
    const parsedSignature = JSON.parse(signature);
    return { token, expire, signature: parsedSignature.base64Hash, stringToSign: ImageKitAuth.lastStringToSign, privateKeyMasked: privateKey.substring(0, 5) + "...", base64Hash: parsedSignature.base64Hash, rawHashArray: parsedSignature.rawHashArray };
  }

  static async getSignature(token: string, expire: number, privateKey: string): Promise<string> {
    const stringToSign = `${token}${expire}`;
    ImageKitAuth.lastStringToSign = stringToSign; // Store for debugging
    console.log("Edge Function: String to Sign:", stringToSign);
    console.log("Edge Function: Private Key (in signature function, masked):", privateKey.substring(0, 5) + "...");
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(privateKey),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(stringToSign)
    );
    const hashArray = Array.from(new Uint8Array(signature));
    console.log("Edge Function: Hash Array (Uint8Array):");
    // console.log(hashArray); // Log the actual array for debugging if needed
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    console.log("Edge Function: Generated Signature (Base64) with btoa:", base64Hash);
    // Return both base64Hash and the raw hashArray for debugging
    return JSON.stringify({ base64Hash, rawHashArray: Array.from(new Uint8Array(signature)) });
  }
}
