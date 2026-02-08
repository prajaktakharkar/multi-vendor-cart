-- Create companies table for tracking software customers
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  employee_count INTEGER,
  plan_type TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Only super admins (company_admin role) can view companies - this is for internal dev admin
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
USING (has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can manage companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'company_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock data
INSERT INTO public.companies (name, industry, employee_count, plan_type, status) VALUES
('NFL', 'Sports & Entertainment', 3500, 'enterprise', 'active'),
('NBL', 'Sports & Entertainment', 450, 'professional', 'active'),
('NBA', 'Sports & Entertainment', 4200, 'enterprise', 'active'),
('ServiceNow', 'Technology', 22000, 'enterprise', 'active'),
('Salesforce', 'Technology', 79000, 'enterprise', 'active');