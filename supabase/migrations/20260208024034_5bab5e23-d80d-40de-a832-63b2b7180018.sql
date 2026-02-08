-- Create travel requests table for new trip requests
CREATE TABLE public.travel_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'flight', 'hotel', 'car', 'trip' (multi-leg)
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}'::jsonb, -- airline prefs, hotel class, etc.
  estimated_budget DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'booked'
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "Employees can view own travel requests"
ON public.travel_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Employees can create their own requests
CREATE POLICY "Employees can create travel requests"
ON public.travel_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all travel requests"
ON public.travel_requests
FOR SELECT
USING (has_role(auth.uid(), 'company_admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update travel requests"
ON public.travel_requests
FOR UPDATE
USING (has_role(auth.uid(), 'company_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_travel_requests_updated_at
BEFORE UPDATE ON public.travel_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();