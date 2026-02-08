import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, UserCheck, Briefcase, Plane, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RosterMemberDialog } from './RosterMemberDialog';

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
  const { toast } = useToast();
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<RosterMember | null>(null);

  const fetchRoster = async () => {
    const { data, error } = await supabase
      .from("team_roster")
      .select("*")
      .order("team_name", { ascending: true })
      .order("role", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading roster",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setRoster(data as RosterMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
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

  const handleAddMember = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const handleEditMember = (member: RosterMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDeleteClick = (member: RosterMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleSaveMember = async (data: {
    team_name: string;
    role: string;
    first_name: string;
    last_name: string;
    position?: string;
    jersey_number?: number | null;
    status: string;
    travel_document?: string;
    seat_preference?: string;
    special_requirements?: string;
    contact_email?: string;
    notes?: string;
  }) => {
    setSaving(true);
    try {
      const payload = {
        team_name: data.team_name.trim(),
        role: data.role,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        position: data.position?.trim() || null,
        jersey_number: data.jersey_number || null,
        status: data.status,
        travel_document: data.travel_document?.trim() || null,
        seat_preference: data.seat_preference?.trim() || null,
        special_requirements: data.special_requirements?.trim() || null,
        contact_email: data.contact_email?.trim() || null,
        notes: data.notes?.trim() || null,
      };

      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from("team_roster")
          .update(payload)
          .eq("id", editingMember.id);

        if (error) throw error;

        toast({
          title: "Member updated",
          description: `${payload.first_name} ${payload.last_name} has been updated.`,
        });
      } else {
        // Create new member
        const { error } = await supabase
          .from("team_roster")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Member added",
          description: `${payload.first_name} ${payload.last_name} has been added to ${payload.team_name}.`,
        });
      }

      setDialogOpen(false);
      await fetchRoster();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error saving member",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      const { error } = await supabase
        .from("team_roster")
        .delete()
        .eq("id", memberToDelete.id);

      if (error) throw error;

      toast({
        title: "Member deleted",
        description: `${memberToDelete.first_name} ${memberToDelete.last_name} has been removed.`,
      });

      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      await fetchRoster();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error deleting member",
        description: message,
        variant: "destructive",
      });
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
            <div className="flex flex-wrap gap-2">
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
              <Button onClick={handleAddMember}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
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
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMember(member)}
                          title="Edit member"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(member)}
                          title="Delete member"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRoster.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No roster members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <RosterMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        onSave={handleSaveMember}
        loading={saving}
        existingTeams={teams}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Roster Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{memberToDelete?.first_name} {memberToDelete?.last_name}</strong> from the{' '}
              <strong>{memberToDelete?.team_name}</strong> roster? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
