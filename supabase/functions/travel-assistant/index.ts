import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== SECURITY: Sensitive Data Validation ==========
// Patterns to detect and reject sensitive data in JSONB fields
const sensitivePatterns = [
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, name: 'credit card number' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'social security number' },
  { pattern: /\b(?:passport|passport\s*(?:no|number|#))\s*[:=]?\s*\w+/i, name: 'passport number' },
  { pattern: /\b\d{9}\b/, name: 'potential SSN without dashes' },
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

// Rate limiting: Track requests per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute for chat

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

// Transport options (generic, applicable to any city)
const transportOptions = [
  { provider: 'Uber', types: ['UberX ($25-35)', 'UberXL ($40-55)', 'Uber Black ($75-100)'] },
  { provider: 'Lyft', types: ['Lyft ($23-33)', 'Lyft XL ($38-52)', 'Lyft Lux ($70-95)'] },
];

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "create_travel_plan",
      description: "Creates a structured travel plan that can be saved as bookings. Use this when you have enough information to create a complete travel plan for the user.",
      parameters: {
        type: "object",
        properties: {
          plan_summary: {
            type: "string",
            description: "A brief summary of the travel plan"
          },
          bookings: {
            type: "array",
            description: "Array of bookings to create",
            items: {
              type: "object",
              properties: {
                booking_type: {
                  type: "string",
                  enum: ["flight", "hotel", "car"],
                  description: "Type of booking"
                },
                details: {
                  type: "object",
                  description: "Booking details"
                },
                start_date: {
                  type: "string",
                  description: "Start date in ISO format (YYYY-MM-DD)"
                },
                end_date: {
                  type: "string",
                  description: "End date in ISO format (YYYY-MM-DD)"
                }
              },
              required: ["booking_type", "details"]
            }
          }
        },
        required: ["plan_summary", "bookings"]
      }
    }
  }
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, cityId, cityName, conversationHistory, saveBookings, bookingsToSave, targetUserId } = await req.json();
    
    console.log('Travel assistant request:', { message, cityId, cityName, historyLength: conversationHistory?.length, saveBookings, targetUserId });

    // Handle saving bookings - requires authentication
    if (saveBookings && bookingsToSave) {
      // ========== SECURITY: Validate JSONB data before saving ==========
      for (const booking of bookingsToSave) {
        if (booking.details) {
          const validation = validateNoSensitiveData(booking.details);
          if (!validation.valid) {
            console.log('Travel assistant: Rejected booking due to sensitive data');
            return new Response(
              JSON.stringify({ error: validation.issue }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }
        }
      }

      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Please sign in to save bookings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: authError } = await supabase.auth.getClaims(token);
      
      if (authError || !claims?.claims) {
        return new Response(
          JSON.stringify({ error: 'Please sign in to save bookings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claims.claims.sub;
      
      // Check if admin is assigning to someone else
      let bookingUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        // Verify the requester is an admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        
        if (roleData?.role === 'company_admin') {
          bookingUserId = targetUserId;
          console.log('Admin assigning bookings to:', bookingUserId);
        } else {
          console.log('Non-admin tried to assign to another user');
        }
      }
      
      console.log('Saving bookings for user:', bookingUserId, 'created by:', userId);

      // Insert all bookings
      const bookingsWithUser = bookingsToSave.map((booking: any) => ({
        user_id: bookingUserId,
        created_by: userId,
        booking_type: booking.booking_type,
        status: 'confirmed',
        details: booking.details,
        start_date: booking.start_date || null,
        end_date: booking.end_date || null,
      }));

      const { data: insertedBookings, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingsWithUser)
        .select();

      if (insertError) {
        console.error('Error saving bookings:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save bookings: ' + insertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('Bookings saved successfully:', insertedBookings?.length);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully saved ${insertedBookings?.length || 0} bookings!`,
          bookings: insertedBookings 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt - works for any destination
    const destinationContext = cityName || cityId;
    
    const systemPrompt = `You are a helpful travel planning assistant specializing in group travel for business conferences, sports teams (FIFA Cup, tournaments), and corporate events.

You can help plan travel to ANY city or destination worldwide. You have access to:
- Flight bookings via Amadeus/Sabre GDS integration (real-time availability)
- Hotel reservations with negotiated corporate rates
- Conference venue partnerships globally
- Ground transport coordination (Uber/Lyft business accounts)

${destinationContext ? `
CURRENT DESTINATION: ${destinationContext}
The user is planning travel to ${destinationContext}. Help them find the best options for flights, hotels, venues, and ground transport in this location.
` : 'No destination selected yet. Help the user choose where they want to travel.'}

GROUND TRANSPORT OPTIONS (available in most major cities):
${transportOptions.map(t => `${t.provider}: ${t.types.join(', ')}`).join('\n')}

GUIDELINES:
- Be conversational and helpful
- Ask clarifying questions about: group size, dates, budget, event type, and destination if not specified
- Provide specific recommendations with estimated prices when possible
- For flights, acknowledge you'd search Amadeus/Sabre for real-time options
- For hotels and venues, provide general recommendations based on the destination
- Format responses clearly with bullet points and sections
- Keep responses concise but informative

IMPORTANT - CREATING TRAVEL PLANS:
When the user has provided enough information (dates, group size, destination, preferences), you MUST use the create_travel_plan tool to generate a structured plan. This allows the user to save the bookings directly.

When creating a plan:
- Include flight bookings with airline, departure/arrival cities and times
- Include hotel bookings with hotel name, location, room type
- Include car/transport bookings with provider, vehicle type, pickup/dropoff

Always use the tool when you have enough details to create a complete plan. Even if some details are estimated, create the plan so the user can review and save it.`;

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI Gateway with tools
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    
    let response = choice?.message?.content || "";
    let travelPlan = null;

    // Check if the AI called a tool
    if (choice?.message?.tool_calls?.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function?.name === 'create_travel_plan') {
          try {
            travelPlan = JSON.parse(toolCall.function.arguments);
            console.log('Travel plan created:', travelPlan);
            
            // Generate a nice response with the plan
            response = `## 🎉 Your Travel Plan is Ready!\n\n**${travelPlan.plan_summary}**\n\n`;
            
            if (travelPlan.bookings?.length > 0) {
              response += "### Included Bookings:\n\n";
              for (const booking of travelPlan.bookings) {
                const icon = booking.booking_type === 'flight' ? '✈️' : 
                            booking.booking_type === 'hotel' ? '🏨' : '🚗';
                response += `${icon} **${booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}**\n`;
                
                const details = booking.details;
                if (booking.booking_type === 'flight') {
                  response += `- ${details.airline || 'Airline TBD'} ${details.flightNumber || ''}\n`;
                  response += `- ${details.departure || 'Origin'} → ${details.arrival || 'Destination'}\n`;
                  if (details.departureTime) response += `- Departure: ${details.departureTime}\n`;
                } else if (booking.booking_type === 'hotel') {
                  response += `- ${details.hotelName || 'Hotel TBD'}\n`;
                  response += `- ${details.location || 'Location TBD'}\n`;
                  if (details.roomType) response += `- Room: ${details.roomType}\n`;
                  if (details.checkIn && details.checkOut) response += `- ${details.checkIn} to ${details.checkOut}\n`;
                } else if (booking.booking_type === 'car') {
                  response += `- ${details.provider || 'Provider TBD'} - ${details.vehicleType || 'Vehicle TBD'}\n`;
                  response += `- ${details.pickupLocation || 'Pickup TBD'} → ${details.dropoffLocation || 'Dropoff TBD'}\n`;
                }
                response += '\n';
              }
              response += "\n---\n*Click **Save Plan to Bookings** below to add these to your dashboard!*";
            }
          } catch (e) {
            console.error('Error parsing tool arguments:', e);
          }
        }
      }
    }

    if (!response && !travelPlan) {
      response = "I'm sorry, I couldn't generate a response. Please try again.";
    }

    console.log('AI response generated successfully, has plan:', !!travelPlan);

    return new Response(
      JSON.stringify({ response, travelPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Travel assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm having trouble processing your request right now. Please try again."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
