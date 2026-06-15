const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");

    if (!privateKey) {
      return new Response(JSON.stringify({ error: "ImageKit private key not set." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authenticationParameters = await getAuthenticationParameters(privateKey);

    return new Response(JSON.stringify(authenticationParameters), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("imagekit-auth error:", error.message);
    return new Response(JSON.stringify({ error: "Failed to generate authentication parameters." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function getAuthenticationParameters(privateKey: string) {
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;
  const signature = await getSignature(token, expire, privateKey);
  return { token, expire, signature };
}

async function getSignature(token: string, expire: number, privateKey: string): Promise<string> {
  const stringToSign = `${token}${expire}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(privateKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
