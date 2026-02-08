import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProcurementItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
  sellerName: string;
  category: string;
  reason: string;
  totalCost: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventDescription, attendeeCount, budget } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert procurement agent for corporate events. 
Given an event description, attendee count, and optional budget, create a comprehensive shopping list.

Return ONLY valid JSON - no markdown, no code blocks:
{
  "eventSummary": "Brief summary of what you're planning for",
  "items": [
    {
      "name": "Product name",
      "price": 49.99,
      "quantity": 10,
      "category": "seating|lighting|decor|supplies|refreshments|tech|outdoor|comfort",
      "sellerType": "artisan|nordic|garden",
      "reason": "Why this item and quantity for this event"
    }
  ],
  "tips": ["Helpful tip 1", "Helpful tip 2"]
}

Guidelines:
- Calculate quantities based on attendee count (add 10% buffer)
- Prioritize quality and value (best price doesn't mean cheapest)
- Include essentials first, then nice-to-haves
- Consider the event type (retreat = comfort + productivity)
- Group items logically by category
- Provide 8-12 items covering all needs`;

    const userPrompt = `Event: ${eventDescription}
Attendees: ${attendeeCount} people
${budget ? `Budget: $${budget}` : 'Budget: Optimize for best value'}

Create a complete procurement list with quantities and pricing.`;

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
          { role: "user", content: userPrompt }
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
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      parsed = { items: [], eventSummary: "", tips: [] };
    }

    // Image pools by category
    const imagesByCategory: Record<string, string[]> = {
      "seating": [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop",
      ],
      "lighting": [
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=300&h=300&fit=crop",
      ],
      "decor": [
        "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop",
      ],
      "supplies": [
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1584589167171-541ce45f1eea?w=300&h=300&fit=crop",
      ],
      "refreshments": [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop",
      ],
      "tech": [
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=300&fit=crop",
      ],
      "outdoor": [
        "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=300&h=300&fit=crop",
      ],
      "comfort": [
        "https://images.unsplash.com/photo-1540638349517-3abd5afc5847?w=300&h=300&fit=crop",
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
      ],
    };

    const sellerMap: Record<string, { id: string; name: string }> = {
      "artisan": { id: "seller-1", name: "Artisan Home Co." },
      "nordic": { id: "seller-2", name: "Nordic Essentials" },
      "garden": { id: "seller-3", name: "Green Thumb Gardens" },
    };

    const items: ProcurementItem[] = (parsed.items || []).map(
      (item: any, index: number) => {
        const category = item.category || "supplies";
        const images = imagesByCategory[category] || imagesByCategory["supplies"];
        const seller = sellerMap[item.sellerType] || sellerMap["artisan"];
        const price = Number(item.price) || 50;
        const quantity = Number(item.quantity) || 1;
        
        return {
          id: `proc-${Date.now()}-${index}`,
          name: item.name,
          price,
          quantity,
          image: images[index % images.length],
          sellerId: seller.id,
          sellerName: seller.name,
          category: item.category,
          reason: item.reason,
          totalCost: price * quantity,
        };
      }
    );

    const grandTotal = items.reduce((sum, item) => sum + item.totalCost, 0);

    console.log(`Generated ${items.length} procurement items, total: $${grandTotal}`);

    return new Response(JSON.stringify({ 
      eventSummary: parsed.eventSummary || "",
      items,
      tips: parsed.tips || [],
      grandTotal,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in plan-procurement:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
