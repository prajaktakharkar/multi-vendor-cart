import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: Track requests per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute (stricter for booking operations)

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count };
}

// Sensitive data validation for booking details
const sensitivePatterns = [
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, name: 'credit card number' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'social security number' },
];

function validateNoSensitiveData(data: unknown): { valid: boolean; issue?: string } {
  const jsonString = JSON.stringify(data);
  
  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(jsonString)) {
      return { valid: false, issue: `Data appears to contain a ${name}. Please remove sensitive information.` };
    }
  }
  
  return { valid: true };
}

interface BookingRequest {
  flightId: string;
  provider: string;
  bookingToken: string;
  passengers: PassengerInfo[];
  contactEmail: string;
  contactPhone?: string;
}

interface PassengerInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  email?: string;
  phone?: string;
}

interface FlightCredential {
  id: string;
  provider: string;
  display_name: string;
  api_key: string;
  api_secret: string | null;
  environment: "sandbox" | "production";
  is_active: boolean;
}

interface BookingResult {
  success: boolean;
  bookingReference: string;
  provider: string;
  status: string;
  totalPrice: number;
  currency: string;
  ticketNumbers?: string[];
  confirmationUrl?: string;
}

// Amadeus booking
async function bookAmadeus(
  credentials: FlightCredential,
  booking: BookingRequest
): Promise<BookingResult> {
  const baseUrl =
    credentials.environment === "production"
      ? "https://api.amadeus.com"
      : "https://test.api.amadeus.com";

  // Get access token
  const tokenResponse = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.api_key,
      client_secret: credentials.api_secret || "",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Amadeus auth error:", errorText);
    throw new Error("Failed to authenticate with Amadeus");
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Parse the flight offer from the booking token
  const flightOffer = JSON.parse(booking.bookingToken);

  // Create order
  const orderData = {
    data: {
      type: "flight-order",
      flightOffers: [flightOffer],
      travelers: booking.passengers.map((p, i) => ({
        id: (i + 1).toString(),
        dateOfBirth: p.dateOfBirth,
        name: {
          firstName: p.firstName.toUpperCase(),
          lastName: p.lastName.toUpperCase(),
        },
        gender: p.gender.toUpperCase(),
        contact: {
          emailAddress: p.email || booking.contactEmail,
          phones: p.phone
            ? [{ deviceType: "MOBILE", number: p.phone }]
            : undefined,
        },
        documents: [],
      })),
      remarks: {
        general: [{ subType: "GENERAL_MISCELLANEOUS", text: "ONLINE BOOKING" }],
      },
      contacts: [
        {
          emailAddress: booking.contactEmail,
          phones: booking.contactPhone
            ? [{ deviceType: "MOBILE", number: booking.contactPhone }]
            : undefined,
          companyName: "Travel Booking System",
          purpose: "STANDARD",
        },
      ],
    },
  };

  const orderResponse = await fetch(`${baseUrl}/v1/booking/flight-orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.error("Amadeus booking error:", errorText);

    // Parse Amadeus error for better messaging
    try {
      const errorData = JSON.parse(errorText);
      const errorDetail = errorData.errors?.[0]?.detail || "Booking failed";
      throw new Error(errorDetail);
    } catch {
      throw new Error("Failed to complete booking with Amadeus");
    }
  }

  const orderResult = await orderResponse.json();
  const order = orderResult.data;

  return {
    success: true,
    bookingReference: order.id || order.associatedRecords?.[0]?.reference || `AMD-${Date.now()}`,
    provider: "amadeus",
    status: "confirmed",
    totalPrice: parseFloat(order.flightOffers?.[0]?.price?.total || "0"),
    currency: order.flightOffers?.[0]?.price?.currency || "USD",
    ticketNumbers: order.travelers?.map((t: any) => t.tickets?.[0]?.number).filter(Boolean),
  };
}

// Duffel booking
async function bookDuffel(
  credentials: FlightCredential,
  booking: BookingRequest
): Promise<BookingResult> {
  const baseUrl = "https://api.duffel.com";

  const orderData = {
    data: {
      selected_offers: [booking.bookingToken],
      type: "instant",
      passengers: booking.passengers.map((p) => ({
        type: "adult",
        given_name: p.firstName,
        family_name: p.lastName,
        born_on: p.dateOfBirth,
        gender: p.gender === "male" ? "m" : "f",
        email: p.email || booking.contactEmail,
        phone_number: p.phone || booking.contactPhone,
      })),
      payments: [
        {
          type: "balance",
          currency: "USD",
          amount: "0", // Will be calculated by Duffel
        },
      ],
    },
  };

  const orderResponse = await fetch(`${baseUrl}/air/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.api_key}`,
      "Duffel-Version": "v1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.error("Duffel booking error:", errorText);
    throw new Error("Failed to complete booking with Duffel");
  }

  const orderResult = await orderResponse.json();
  const order = orderResult.data;

  return {
    success: true,
    bookingReference: order.booking_reference || order.id,
    provider: "duffel",
    status: order.status || "confirmed",
    totalPrice: parseFloat(order.total_amount || "0"),
    currency: order.total_currency || "USD",
  };
}

// Mock booking for testing
function bookMock(booking: BookingRequest): BookingResult {
  const reference = `MK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return {
    success: true,
    bookingReference: reference,
    provider: "mock",
    status: "confirmed",
    totalPrice: 299.99 * booking.passengers.length,
    currency: "USD",
    ticketNumbers: booking.passengers.map(
      () => `016${Math.random().toString().substring(2, 12)}`
    ),
    confirmationUrl: `https://example.com/confirmation/${reference}`,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const userId = claimsData.claims.sub as string;

    // Rate limiting check
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.log("Book flight: Rate limit exceeded for user", userId);
      return new Response(
        JSON.stringify({ error: "Too many booking requests. Please wait a moment before trying again." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0"
          } 
        }
      );
    }

    // Parse request
    const body: BookingRequest = await req.json();

    // Validate no sensitive data in passenger info
    const validation = validateNoSensitiveData(body.passengers);
    if (!validation.valid) {
      console.log("Book flight: Rejected due to sensitive data in request");
      return new Response(
        JSON.stringify({ error: validation.issue }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.flightId || !body.provider || !body.passengers?.length || !body.contactEmail) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: flightId, provider, passengers, contactEmail",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate passenger info
    for (const passenger of body.passengers) {
      if (!passenger.firstName || !passenger.lastName || !passenger.dateOfBirth || !passenger.gender) {
        return new Response(
          JSON.stringify({
            error: "Each passenger must have firstName, lastName, dateOfBirth, and gender",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Booking flight:", { provider: body.provider, flightId: body.flightId, userId });

    // Fetch flight credentials using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: credentials, error: credError } = await adminClient
      .from("flight_credentials")
      .select("*")
      .eq("provider", body.provider)
      .eq("is_active", true)
      .single();

    let bookingResult: BookingResult;

    if (credError || !credentials) {
      // Use mock if no credentials
      if (body.provider === "mock") {
        bookingResult = bookMock(body);
      } else {
        console.warn(`No credentials for ${body.provider}, using mock booking`);
        bookingResult = bookMock(body);
        bookingResult.provider = body.provider;
      }
    } else {
      const cred = credentials as FlightCredential;

      switch (body.provider) {
        case "amadeus":
          bookingResult = await bookAmadeus(cred, body);
          break;
        case "duffel":
          bookingResult = await bookDuffel(cred, body);
          break;
        default:
          console.log(`Provider ${body.provider} not implemented, using mock`);
          bookingResult = bookMock(body);
          bookingResult.provider = body.provider;
      }
    }

    // Store booking in database
    const bookingData = {
      user_id: userId,
      created_by: userId,
      booking_type: "flight",
      status: bookingResult.success ? "confirmed" : "failed",
      details: {
        flightId: body.flightId,
        provider: bookingResult.provider,
        bookingReference: bookingResult.bookingReference,
        passengers: body.passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
        })),
        totalPrice: bookingResult.totalPrice,
        currency: bookingResult.currency,
        ticketNumbers: bookingResult.ticketNumbers,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
      },
    };

    const { data: savedBooking, error: saveError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (saveError) {
      console.error("Error saving booking:", saveError);
      // Don't fail the booking, just log the error
    }

    return new Response(
      JSON.stringify({
        ...bookingResult,
        bookingId: savedBooking?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Book flight error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
