import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VenueSearchRequest {
  location: string;
  eventDate: string;
  eventType: "conference" | "party" | "wedding" | "meeting" | "workshop" | "other";
  attendees: number;
  maxBudget?: number;
  amenities?: string[];
  duration?: string;
}

interface VenueResult {
  id: string;
  name: string;
  location: string;
  address: string;
  venueType: string;
  capacity: number;
  pricePerHour?: number;
  pricePerDay?: number;
  flatRate?: number;
  currency: string;
  amenities: string[];
  cateringOptions: string[];
  rating: number;
  description: string;
  availableDates: string[];
  imageUrl?: string;
}

// Mock venue data generator
function generateMockVenues(params: VenueSearchRequest): VenueResult[] {
  const venueTypes: Record<string, { names: string[], basePrice: number }> = {
    conference: {
      names: ["Convention Center", "Business Hub", "Tech Campus", "Executive Center", "Conference Hall"],
      basePrice: 2000,
    },
    party: {
      names: ["Event Space", "Rooftop Lounge", "Ballroom", "Club Venue", "Garden Pavilion"],
      basePrice: 1500,
    },
    wedding: {
      names: ["Grand Ballroom", "Estate Gardens", "Vineyard Estate", "Historic Manor", "Beach Resort"],
      basePrice: 5000,
    },
    meeting: {
      names: ["Meeting Room", "Boardroom", "Co-working Space", "Private Office Suite", "Hotel Meeting Room"],
      basePrice: 500,
    },
    workshop: {
      names: ["Workshop Studio", "Creative Space", "Training Center", "Innovation Lab", "Maker Space"],
      basePrice: 800,
    },
    other: {
      names: ["Multi-purpose Hall", "Community Center", "Gallery Space", "Loft Space", "Warehouse Venue"],
      basePrice: 1000,
    },
  };

  const amenitiesOptions = [
    "WiFi", "Projector", "Sound System", "Stage", "Dance Floor",
    "Outdoor Space", "Kitchen", "Bar", "Parking", "A/V Equipment",
    "Wheelchair Accessible", "Green Room", "Coat Check", "Security",
    "Tables & Chairs", "Linens", "Lighting", "Climate Control"
  ];

  const cateringOptions = [
    "In-house Catering", "External Catering Allowed", "Bar Service",
    "Buffet Options", "Plated Dinner", "Cocktail Reception", "Full Kitchen Access"
  ];

  const typeConfig = venueTypes[params.eventType] || venueTypes.other;
  const results: VenueResult[] = [];

  for (let i = 0; i < 8; i++) {
    const venueName = typeConfig.names[Math.floor(Math.random() * typeConfig.names.length)];
    const capacityMultiplier = 1 + Math.random() * 2;
    const capacity = Math.floor(params.attendees * capacityMultiplier);
    
    const priceMultiplier = 0.7 + Math.random() * 0.8;
    const basePrice = Math.round(typeConfig.basePrice * priceMultiplier);
    
    // Scale price based on capacity
    const capacityFactor = capacity / 100;
    const adjustedPrice = Math.round(basePrice * (0.5 + capacityFactor * 0.5));

    // Filter by budget if specified
    if (params.maxBudget && adjustedPrice > params.maxBudget) {
      continue;
    }

    const numAmenities = 6 + Math.floor(Math.random() * 8);
    const selectedAmenities = [...amenitiesOptions]
      .sort(() => Math.random() - 0.5)
      .slice(0, numAmenities);

    const numCatering = 2 + Math.floor(Math.random() * 4);
    const selectedCatering = [...cateringOptions]
      .sort(() => Math.random() - 0.5)
      .slice(0, numCatering);

    results.push({
      id: `venue-${i}-${Date.now()}`,
      name: `${["The", "Grand", "Premier", "Elite", "Downtown"][Math.floor(Math.random() * 5)]} ${venueName}`,
      location: params.location,
      address: `${100 + Math.floor(Math.random() * 900)} ${["Main", "Oak", "Park", "Market", "Center"][Math.floor(Math.random() * 5)]} Street, ${params.location}`,
      venueType: params.eventType,
      capacity,
      pricePerDay: adjustedPrice,
      flatRate: adjustedPrice,
      currency: "USD",
      amenities: selectedAmenities,
      cateringOptions: selectedCatering,
      rating: 3.5 + Math.random() * 1.5,
      description: `Beautiful ${params.eventType} venue with capacity for ${capacity} guests. Perfect for corporate events and private gatherings.`,
      availableDates: [params.eventDate], // Mock: always available on requested date
    });
  }

  return results.sort((a, b) => (a.flatRate || 0) - (b.flatRate || 0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: VenueSearchRequest = await req.json();

    if (!body.location || !body.eventDate || !body.eventType || !body.attendees) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: location, eventDate, eventType, attendees" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching venues:", body);

    const results = generateMockVenues(body);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        count: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search venues error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
