import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sellerId: string;
}

interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cartItems } = await req.json() as { cartItems: CartItem[] };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from cart items
    const cartContext = cartItems.map(item => 
      `- ${item.name} (qty: ${item.quantity}, price: $${item.price})`
    ).join('\n');

    const systemPrompt = `You are a smart shopping assistant for a multi-seller marketplace. 
Based on the user's cart, suggest 3-4 complementary products they might like.
Return ONLY valid JSON matching this exact format - no markdown, no code blocks, just raw JSON:
{
  "recommendations": [
    {
      "name": "Product Name",
      "price": 49.99,
      "category": "home-decor|furniture|plants|lighting|textiles",
      "sellerType": "artisan|nordic|garden",
      "reason": "Brief reason why this complements their cart"
    }
  ]
}

Guidelines:
- Suggest items that complement the style/theme of cart items
- Mix price points (some affordable, some premium)
- Include items from different seller types
- Keep reasons under 15 words`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Current cart:\n${cartContext}\n\nSuggest complementary products.` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response and map to full items
    let parsed;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      parsed = { recommendations: [] };
    }

    // Image pools by category
    const imagesByCategory: Record<string, string[]> = {
      "home-decor": [
        "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1584589167171-541ce45f1eea?w=300&h=300&fit=crop",
      ],
      "furniture": [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop",
      ],
      "plants": [
        "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=300&h=300&fit=crop",
      ],
      "lighting": [
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=300&h=300&fit=crop",
      ],
      "textiles": [
        "https://images.unsplash.com/photo-1584589167171-541ce45f1eea?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1540638349517-3abd5afc5847?w=300&h=300&fit=crop",
      ],
    };

    const sellerMap: Record<string, { id: string; name: string }> = {
      "artisan": { id: "seller-1", name: "Artisan Home Co." },
      "nordic": { id: "seller-2", name: "Nordic Essentials" },
      "garden": { id: "seller-3", name: "Green Thumb Gardens" },
    };

    const recommendations: RecommendedItem[] = (parsed.recommendations || []).map(
      (rec: any, index: number) => {
        const category = rec.category || "home-decor";
        const images = imagesByCategory[category] || imagesByCategory["home-decor"];
        const seller = sellerMap[rec.sellerType] || sellerMap["artisan"];
        
        return {
          id: `rec-${Date.now()}-${index}`,
          name: rec.name,
          price: rec.price,
          image: images[index % images.length],
          sellerId: seller.id,
          sellerName: seller.name,
          reason: rec.reason,
        };
      }
    );

    console.log(`Generated ${recommendations.length} recommendations`);

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in recommend-items:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
