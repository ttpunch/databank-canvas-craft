declare const Deno: any; // Workaround for Deno types in Supabase Edge Functions
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// import { createClient } from "npm:@supabase/supabase-js@2"; // Remove unused import

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
  static async getAuthenticationParameters(privateKey: string) {
    const token = Math.random().toString(36).substring(2);
    const expire = Math.floor(Date.now() / 1000) + 1800; // Current Unix epoch in seconds + 30 minutes
    console.log("Edge Function: Token:", token);
    console.log("Edge Function: Expire:", expire);
    const signature = await this.getSignature(token, expire, privateKey);
    return { token, expire, signature };
  }

  static async getSignature(token: string, expire: number, privateKey: string): Promise<string> {
    const stringToSign = `${token}${expire}`; // Exclude privateKey from stringToSign
    console.log("Edge Function: String to Sign:", stringToSign.substring(0, 50) + "...");
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
    // Convert to base64 string instead of hex string
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    console.log("Edge Function: Generated Signature (Base64):", base64Hash);
    return base64Hash;
  }
}
