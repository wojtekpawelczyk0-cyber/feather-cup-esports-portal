import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactRequest = await req.json();
    
    // Validate input
    if (!name || !email || !subject || !message) {
      throw new Error("Wszystkie pola są wymagane");
    }

    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("Discord webhook not configured");
    }

    console.log("Sending contact message to Discord:", { name, email, subject });

    // Create Discord embed
    const embed = {
      title: "📩 Nowa wiadomość kontaktowa",
      color: 0x3b82f6, // Blue color
      fields: [
        {
          name: "👤 Imię i nazwisko",
          value: name,
          inline: true,
        },
        {
          name: "📧 Email",
          value: email,
          inline: true,
        },
        {
          name: "📋 Temat",
          value: subject,
          inline: false,
        },
        {
          name: "💬 Wiadomość",
          value: message.length > 1024 ? message.substring(0, 1021) + "..." : message,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Feather Cup - Formularz kontaktowy",
      },
    };

    // Send to Discord webhook
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook error:", errorText);
      throw new Error("Nie udało się wysłać wiadomości");
    }

    console.log("Message sent to Discord successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-discord:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
