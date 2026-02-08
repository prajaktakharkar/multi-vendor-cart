-- Create table for storing flight provider API credentials
CREATE TABLE public.flight_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE (provider)
);

-- Enable RLS
ALTER TABLE public.flight_credentials ENABLE ROW LEVEL SECURITY;

-- Only company admins can manage credentials
CREATE POLICY "Admins can view flight credentials"
ON public.flight_credentials
FOR SELECT
USING (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can insert flight credentials"
ON public.flight_credentials
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can update flight credentials"
ON public.flight_credentials
FOR UPDATE
USING (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can delete flight credentials"
ON public.flight_credentials
FOR DELETE
USING (has_role(auth.uid(), 'company_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_flight_credentials_updated_at
BEFORE UPDATE ON public.flight_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();