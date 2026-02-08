import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, Briefcase, Plane } from 'lucide-react';

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

export const TeamRosterPanel = () => {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  useEffect(() => {
    const fetchRoster = async () => {
      const { data } = await supabase
        .from("team_roster")
        .select("*")
        .order("team_name", { ascending: true })
        .order("role", { ascending: true })
        .order("last_name", { ascending: true });

      if (data) {
        setRoster(data as RosterMember[]);
      }
      setLoading(false);
    };

    fetchRoster();
  }, []);

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Player": return "default";
      case "Coach": return "secondary";
      case "Admin": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Roster Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          {loading ? (
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
    </div>
  );
};
