import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Returns only presence booleans — never the values themselves.
serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = {
    groq: Boolean(Deno.env.get("GROQ_API_KEY")),
    vimeo: Boolean(Deno.env.get("VIMEO_API_TOKEN")),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});