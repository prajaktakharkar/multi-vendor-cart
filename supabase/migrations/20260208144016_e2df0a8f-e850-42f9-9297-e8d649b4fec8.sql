-- Drop the existing constraint and add a new one with 'travel_package' included
ALTER TABLE public.bookings DROP CONSTRAINT bookings_booking_type_check;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_type_check 
  CHECK (booking_type = ANY (ARRAY['flight'::text, 'hotel'::text, 'car'::text, 'travel_package'::text, 'venue'::text, 'transport'::text]));