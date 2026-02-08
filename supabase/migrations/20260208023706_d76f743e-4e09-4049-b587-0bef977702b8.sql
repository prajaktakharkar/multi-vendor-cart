-- Create change requests table
CREATE TABLE public.change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'modify', 'cancel', 'reschedule'
  description TEXT NOT NULL,
  requested_changes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "Employees can view own requests"
ON public.change_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Employees can create requests for their own bookings
CREATE POLICY "Employees can create requests"
ON public.change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.change_requests
FOR SELECT
USING (has_role(auth.uid(), 'company_admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.change_requests
FOR UPDATE
USING (has_role(auth.uid(), 'company_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_change_requests_updated_at
BEFORE UPDATE ON public.change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();