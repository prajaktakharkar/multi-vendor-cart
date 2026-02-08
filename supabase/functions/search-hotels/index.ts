import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HotelSearchRequest {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms: number;
  maxPricePerNight?: number;
  starRating?: number;
  amenities?: string[];
}

interface HotelResult {
  id: string;
  name: string;
  location: string;
  address: string;
  starRating: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  roomType: string;
  cancellationPolicy: string;
  imageUrl?: string;
  distanceFromCenter?: string;
}

// Mock hotel data generator
function generateMockHotels(params: HotelSearchRequest): HotelResult[] {
  const hotelBrands = [
    { name: "Marriott", stars: 4 },
    { name: "Hilton", stars: 4 },
    { name: "Hyatt Regency", stars: 4 },
    { name: "Four Seasons", stars: 5 },
    { name: "Ritz-Carlton", stars: 5 },
    { name: "Hampton Inn", stars: 3 },
    { name: "Holiday Inn", stars: 3 },
    { name: "Westin", stars: 4 },
    { name: "W Hotel", stars: 5 },
    { name: "Courtyard", stars: 3 },
  ];

  const amenitiesList = [
    "Free WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar",
    "Room Service", "Business Center", "Parking", "Airport Shuttle",
    "Pet Friendly", "Breakfast Included"
  ];

  const roomTypes = ["Standard Room", "Deluxe Room", "Suite", "Executive Suite", "Junior Suite"];

  const checkIn = new Date(params.checkInDate);
  const checkOut = new Date(params.checkOutDate);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const results: HotelResult[] = [];
  
  for (let i = 0; i < 10; i++) {
    const brand = hotelBrands[Math.floor(Math.random() * hotelBrands.length)];
    const basePrice = brand.stars === 5 ? 250 + Math.random() * 200 :
                      brand.stars === 4 ? 150 + Math.random() * 100 :
                      80 + Math.random() * 70;
    
    const pricePerNight = Math.round(basePrice * params.rooms);
    const totalPrice = pricePerNight * nights;

    // Filter by max price if specified
    if (params.maxPricePerNight && pricePerNight > params.maxPricePerNight * params.rooms) {
      continue;
    }

    // Filter by star rating if specified
    if (params.starRating && brand.stars < params.starRating) {
      continue;
    }

    const numAmenities = 4 + Math.floor(Math.random() * 6);
    const selectedAmenities = [...amenitiesList]
      .sort(() => Math.random() - 0.5)
      .slice(0, numAmenities);

    results.push({
      id: `hotel-${i}-${Date.now()}`,
      name: `${brand.name} ${params.location}`,
      location: params.location,
      address: `${100 + Math.floor(Math.random() * 900)} Main Street, ${params.location}`,
      starRating: brand.stars,
      pricePerNight,
      totalPrice,
      currency: "USD",
      amenities: selectedAmenities,
      roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)],
      cancellationPolicy: Math.random() > 0.3 ? "Free cancellation until 24h before" : "Non-refundable",
      distanceFromCenter: `${(Math.random() * 5).toFixed(1)} miles from center`,
    });
  }

  return results.sort((a, b) => a.pricePerNight - b.pricePerNight);
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

    const body: HotelSearchRequest = await req.json();

    if (!body.location || !body.checkInDate || !body.checkOutDate || !body.guests) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: location, checkInDate, checkOutDate, guests" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching hotels:", body);

    // Generate mock results (would integrate with real hotel APIs like Booking.com, Expedia, etc.)
    const results = generateMockHotels(body);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        count: results.length,
        nights: Math.ceil(
          (new Date(body.checkOutDate).getTime() - new Date(body.checkInDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search hotels error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
