import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, TrendingUp, ArrowLeft, UserCheck, Plane, Briefcase } from "lucide-react";
import { format } from "date-fns";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  employee_count: number | null;
  plan_type: string | null;
  status: string | null;
  created_at: string;
}

interface RosterMember {
  id: string;
  team_name: string;
  role: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  status: string;
  travel_document: string | null;
  seat_preference: string | null;
  special_requirements: string | null;
  contact_email: string | null;
  notes: string | null;
}

const DevAdmin = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  useEffect(() => {
    if (!loading && (!user || role !== "company_admin")) {
      navigate("/auth");
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch companies
      const { data: companiesData } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (companiesData) {
        setCompanies(companiesData as Company[]);
      }
      setLoadingCompanies(false);

      // Fetch roster
      const { data: rosterData } = await supabase
        .from("team_roster")
        .select("*")
        .order("team_name", { ascending: true })
        .order("role", { ascending: true })
        .order("last_name", { ascending: true });

      if (rosterData) {
        setRoster(rosterData as RosterMember[]);
      }
      setLoadingRoster(false);
    };

    if (user && role === "company_admin") {
      fetchData();
    }
  }, [user, role]);

  if (loading || loadingCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || role !== "company_admin") {
    return null;
  }

  const totalEmployees = companies.reduce((sum, c) => sum + (c.employee_count || 0), 0);
  const enterpriseCount = companies.filter(c => c.plan_type === "enterprise").length;

  // Get unique teams from roster
  const teams = [...new Set(roster.map(m => m.team_name))];

  // Filter roster
  const filteredRoster = roster.filter(member => {
    const teamMatch = selectedTeam === "all" || member.team_name === selectedTeam;
    const roleMatch = selectedRole === "all" || member.role === selectedRole;
    return teamMatch && roleMatch;
  });

  // Roster stats
  const rosterStats = {
    total: roster.length,
    players: roster.filter(m => m.role === "Player").length,
    coaches: roster.filter(m => m.role === "Coach").length,
    admin: roster.filter(m => m.role === "Admin").length,
  };

  const getPlanBadgeVariant = (plan: string | null) => {
    switch (plan) {
      case "enterprise": return "default";
      case "professional": return "secondary";
      default: return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    return status === "active" ? "default" : "secondary";
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Player": return "default";
      case "Coach": return "secondary";
      case "Admin": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Developer Admin</h1>
                <p className="text-sm text-muted-foreground">Platform overview & team management</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="roster" className="gap-2">
              <Users className="h-4 w-4" />
              Team Roster
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companies.length}</div>
                  <p className="text-xs text-muted-foreground">Active platform customers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEmployees.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Across all companies</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Enterprise Clients</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enterpriseCount}</div>
                  <p className="text-xs text-muted-foreground">Premium tier customers</p>
                </CardContent>
              </Card>
            </div>

            {/* Companies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Companies</CardTitle>
                <CardDescription>All companies using the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.industry || "—"}</TableCell>
                        <TableCell>{company.employee_count?.toLocaleString() || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getPlanBadgeVariant(company.plan_type)}>
                            {company.plan_type || "standard"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(company.status)}>
                            {company.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(company.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            {/* Roster Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rosterStats.total}</div>
                  <p className="text-xs text-muted-foreground">Across {teams.length} teams</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Players</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rosterStats.players}</div>
                  <p className="text-xs text-muted-foreground">Active roster players</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Coaches</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rosterStats.coaches}</div>
                  <p className="text-xs text-muted-foreground">Coaching staff</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Admin Staff</CardTitle>
                  <Plane className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rosterStats.admin}</div>
                  <p className="text-xs text-muted-foreground">Support personnel</p>
                </CardContent>
              </Card>
            </div>

            {/* Roster Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Team Roster</CardTitle>
                    <CardDescription>All team members with travel preferences</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Player">Players</SelectItem>
                        <SelectItem value="Coach">Coaches</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRoster ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Seat Pref</TableHead>
                        <TableHead>Special Req</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoster.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.team_name}</TableCell>
                          <TableCell>{member.first_name} {member.last_name}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.position || "—"}</TableCell>
                          <TableCell>{member.jersey_number || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={member.status === "Active" || member.status === "FullTime" ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.seat_preference || "—"}</TableCell>
                          <TableCell>{member.special_requirements || "None"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredRoster.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No roster members found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DevAdmin;
