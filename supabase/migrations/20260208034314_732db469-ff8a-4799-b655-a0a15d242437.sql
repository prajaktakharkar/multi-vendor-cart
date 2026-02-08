-- Create team roster table for managing team members
CREATE TABLE public.team_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL,
  role TEXT NOT NULL, -- Player, Coach, Admin
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  jersey_number INTEGER,
  status TEXT NOT NULL DEFAULT 'Active',
  travel_document TEXT,
  seat_preference TEXT,
  special_requirements TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_roster ENABLE ROW LEVEL SECURITY;

-- Admins can manage all roster entries
CREATE POLICY "Admins can manage team roster"
ON public.team_roster
FOR ALL
USING (has_role(auth.uid(), 'company_admin'::app_role));

-- Employees can view roster
CREATE POLICY "Employees can view team roster"
ON public.team_roster
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_roster_updated_at
BEFORE UPDATE ON public.team_roster
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();