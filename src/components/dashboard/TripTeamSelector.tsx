import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Plane,
  Search,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Shield,
  Trophy,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RosterMember {
  id: string;
  team_name: string;
  role: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  status: string;
  seat_preference: string | null;
  special_requirements: string | null;
  contact_email: string | null;
}

// Position type color mapping - using Seahawks colors
const POSITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Offense - Navy/Action Green
  'Quarterback': { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  'Wide Receiver': { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  'Running Back': { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  'Tight End': { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  'Offensive Tackle': { bg: 'bg-teal-500/15', text: 'text-teal-600', border: 'border-teal-500/30' },
  'Offensive Guard': { bg: 'bg-teal-500/15', text: 'text-teal-600', border: 'border-teal-500/30' },
  'Center': { bg: 'bg-teal-500/15', text: 'text-teal-600', border: 'border-teal-500/30' },
  // Defense - Navy Blue shades
  'Defensive End': { bg: 'bg-blue-500/15', text: 'text-blue-600', border: 'border-blue-500/30' },
  'Defensive Tackle': { bg: 'bg-blue-500/15', text: 'text-blue-600', border: 'border-blue-500/30' },
  'Linebacker': { bg: 'bg-indigo-500/15', text: 'text-indigo-600', border: 'border-indigo-500/30' },
  'Cornerback': { bg: 'bg-violet-500/15', text: 'text-violet-600', border: 'border-violet-500/30' },
  'Safety': { bg: 'bg-violet-500/15', text: 'text-violet-600', border: 'border-violet-500/30' },
  // Special Teams
  'Kicker': { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
  'Punter': { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
  // Coaching Staff
  'Head Coach': { bg: 'bg-rose-500/15', text: 'text-rose-600', border: 'border-rose-500/30' },
  'Offensive Coordinator': { bg: 'bg-rose-500/15', text: 'text-rose-600', border: 'border-rose-500/30' },
  'Defensive Coordinator': { bg: 'bg-rose-500/15', text: 'text-rose-600', border: 'border-rose-500/30' },
  'Special Teams Coordinator': { bg: 'bg-rose-500/15', text: 'text-rose-600', border: 'border-rose-500/30' },
  // Position coaches
  'Running Backs Coach': { bg: 'bg-pink-500/15', text: 'text-pink-600', border: 'border-pink-500/30' },
  'Wide Receivers Coach': { bg: 'bg-pink-500/15', text: 'text-pink-600', border: 'border-pink-500/30' },
  'Offensive Line Coach': { bg: 'bg-pink-500/15', text: 'text-pink-600', border: 'border-pink-500/30' },
  'Quarterbacks Coach': { bg: 'bg-pink-500/15', text: 'text-pink-600', border: 'border-pink-500/30' },
  // Executives
  'Owner/Chair': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  'General Manager': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  'President': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  'VP Player Personnel': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  'VP Football Admin': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  'Team Travel Director': { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
};

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'Player': { bg: 'bg-primary/10', text: 'text-primary', icon: <Trophy className="w-4 h-4" /> },
  'Coach': { bg: 'bg-rose-500/10', text: 'text-rose-600', icon: <Shield className="w-4 h-4" /> },
  'Admin': { bg: 'bg-slate-500/10', text: 'text-slate-600', icon: <Briefcase className="w-4 h-4" /> },
};

// Position group categorization
const POSITION_GROUPS = {
  'Offense': ['Quarterback', 'Wide Receiver', 'Running Back', 'Tight End', 'Offensive Tackle', 'Offensive Guard', 'Center'],
  'Defense': ['Defensive End', 'Defensive Tackle', 'Linebacker', 'Cornerback', 'Safety'],
  'Special Teams': ['Kicker', 'Punter'],
  'Coaching Staff': ['Head Coach', 'Offensive Coordinator', 'Defensive Coordinator', 'Special Teams Coordinator', 'Running Backs Coach', 'Wide Receivers Coach', 'Offensive Line Coach', 'Quarterbacks Coach'],
  'Front Office': ['Owner/Chair', 'General Manager', 'President', 'VP Player Personnel', 'VP Football Admin', 'Team Travel Director'],
};

const getPositionColors = (position: string | null) => {
  if (!position) return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' };
  return POSITION_COLORS[position] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' };
};

const getRoleInfo = (role: string) => {
  return ROLE_COLORS[role] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: <Users className="w-4 h-4" /> };
};

const getPositionGroup = (position: string | null): string => {
  if (!position) return 'Other';
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.includes(position)) return group;
  }
  return 'Other';
};

export const TripTeamSelector = () => {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Offense', 'Defense', 'Coaching Staff', 'Front Office']));

  useEffect(() => {
    fetchRoster();
  }, []);

  const fetchRoster = async () => {
    const { data, error } = await supabase
      .from('team_roster')
      .select('*')
      .eq('team_name', 'Seattle Seahawks')
      .order('role', { ascending: true })
      .order('last_name', { ascending: true });

    if (error) {
      toast.error('Error loading roster');
      console.error(error);
    } else if (data) {
      setRoster(data as RosterMember[]);
    }
    setLoading(false);
  };

  // Filter and group roster
  const filteredRoster = useMemo(() => {
    return roster.filter(member => {
      const searchLower = searchQuery.toLowerCase();
      return (
        member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.position?.toLowerCase().includes(searchLower) ||
        member.role.toLowerCase().includes(searchLower)
      );
    });
  }, [roster, searchQuery]);

  const groupedRoster = useMemo(() => {
    const groups: Record<string, RosterMember[]> = {};
    filteredRoster.forEach(member => {
      const group = getPositionGroup(member.position);
      if (!groups[group]) groups[group] = [];
      groups[group].push(member);
    });
    return groups;
  }, [filteredRoster]);

  const toggleMember = (id: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMembers(newSelected);
  };

  const toggleGroup = (group: string) => {
    const groupMembers = groupedRoster[group] || [];
    const allSelected = groupMembers.every(m => selectedMembers.has(m.id));
    const newSelected = new Set(selectedMembers);
    
    groupMembers.forEach(member => {
      if (allSelected) {
        newSelected.delete(member.id);
      } else {
        newSelected.add(member.id);
      }
    });
    
    setSelectedMembers(newSelected);
  };

  const toggleExpandGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(filteredRoster.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedMembers(new Set());
  };

  const handleSaveTrip = () => {
    const selectedList = roster.filter(m => selectedMembers.has(m.id));
    toast.success(`Trip roster saved with ${selectedList.length} team members`);
    console.log('Selected members:', selectedList);
  };

  // Stats
  const selectedCount = selectedMembers.size;
  const playerCount = roster.filter(m => m.role === 'Player' && selectedMembers.has(m.id)).length;
  const coachCount = roster.filter(m => m.role === 'Coach' && selectedMembers.has(m.id)).length;
  const adminCount = roster.filter(m => m.role === 'Admin' && selectedMembers.has(m.id)).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Trip Team Selection</CardTitle>
                <CardDescription>Select team members for the upcoming trip</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Users className="w-4 h-4 mr-2" />
                {selectedCount} / {roster.length} Selected
              </Badge>
              <Button onClick={handleSaveTrip} disabled={selectedCount === 0}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Trip Roster
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="text-2xl font-bold">{playerCount}</p>
              </div>
              <Trophy className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coaches</p>
                <p className="text-2xl font-bold">{coachCount}</p>
              </div>
              <Shield className="w-8 h-8 text-rose-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executives</p>
                <p className="text-2xl font-bold">{adminCount}</p>
              </div>
              <Briefcase className="w-8 h-8 text-slate-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{selectedCount}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players, coaches, or positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <UserCheck className="w-4 h-4 mr-2" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <UserX className="w-4 h-4 mr-2" />
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Position Legend */}
          <div className="mb-6 p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs font-medium text-muted-foreground mb-3">POSITION COLOR LEGEND</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={cn('bg-emerald-500/15 text-emerald-600 border border-emerald-500/30')}>
                Skill Positions (QB/WR/RB/TE)
              </Badge>
              <Badge className={cn('bg-teal-500/15 text-teal-600 border border-teal-500/30')}>
                Offensive Line
              </Badge>
              <Badge className={cn('bg-blue-500/15 text-blue-600 border border-blue-500/30')}>
                Defensive Line
              </Badge>
              <Badge className={cn('bg-indigo-500/15 text-indigo-600 border border-indigo-500/30')}>
                Linebackers
              </Badge>
              <Badge className={cn('bg-violet-500/15 text-violet-600 border border-violet-500/30')}>
                Secondary
              </Badge>
              <Badge className={cn('bg-amber-500/15 text-amber-600 border border-amber-500/30')}>
                Special Teams
              </Badge>
              <Badge className={cn('bg-rose-500/15 text-rose-600 border border-rose-500/30')}>
                Coaching Staff
              </Badge>
              <Badge className={cn('bg-slate-500/15 text-slate-600 border border-slate-500/30')}>
                Front Office
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedRoster).map(([group, members]) => {
                const isExpanded = expandedGroups.has(group);
                const groupSelected = members.filter(m => selectedMembers.has(m.id)).length;
                const allSelected = groupSelected === members.length;
                const someSelected = groupSelected > 0 && groupSelected < members.length;

                return (
                  <div key={group} className="rounded-lg border overflow-hidden">
                    {/* Group Header */}
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        allSelected && 'bg-primary/5'
                      )}
                      onClick={() => toggleExpandGroup(group)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleGroup(group)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(someSelected && 'data-[state=unchecked]:bg-primary/30')}
                        />
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-semibold">{group}</span>
                        <Badge variant="secondary" className="text-xs">
                          {groupSelected}/{members.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Group Members */}
                    {isExpanded && (
                      <div className="border-t divide-y">
                        {members.map((member) => {
                          const isSelected = selectedMembers.has(member.id);
                          const posColors = getPositionColors(member.position);
                          const roleInfo = getRoleInfo(member.role);

                          return (
                            <div
                              key={member.id}
                              className={cn(
                                'flex items-center gap-4 p-3 transition-colors cursor-pointer',
                                'hover:bg-muted/30',
                                isSelected && 'bg-primary/5'
                              )}
                              onClick={() => toggleMember(member.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleMember(member.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {/* Jersey Number */}
                              {member.jersey_number && (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                                  {member.jersey_number}
                                </div>
                              )}
                              {!member.jersey_number && (
                                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', roleInfo.bg)}>
                                  <span className={roleInfo.text}>{roleInfo.icon}</span>
                                </div>
                              )}

                              {/* Name and Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {member.first_name} {member.last_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      posColors.bg,
                                      posColors.text,
                                      'border',
                                      posColors.border
                                    )}
                                  >
                                    {member.position || member.role}
                                  </Badge>
                                  {member.seat_preference && (
                                    <span className="text-xs text-muted-foreground">
                                      {member.seat_preference}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Selection indicator */}
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(groupedRoster).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
