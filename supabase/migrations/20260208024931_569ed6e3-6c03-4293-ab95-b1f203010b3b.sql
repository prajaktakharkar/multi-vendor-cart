-- Create table for storing transport provider API credentials
CREATE TABLE public.transport_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('uber', 'lyft')),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE (provider)
);

-- Enable RLS
ALTER TABLE public.transport_credentials ENABLE ROW LEVEL SECURITY;

-- Only company admins can manage credentials
CREATE POLICY "Admins can view transport credentials"
ON public.transport_credentials
FOR SELECT
USING (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can insert transport credentials"
ON public.transport_credentials
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can update transport credentials"
ON public.transport_credentials
FOR UPDATE
USING (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can delete transport credentials"
ON public.transport_credentials
FOR DELETE
USING (has_role(auth.uid(), 'company_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_transport_credentials_updated_at
BEFORE UPDATE ON public.transport_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();