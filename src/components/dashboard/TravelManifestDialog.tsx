import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Printer, Users, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';

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

interface TravelManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: RosterMember[];
  teams: string[];
}

export const TravelManifestDialog = ({
  open,
  onOpenChange,
  roster,
  teams,
}: TravelManifestDialogProps) => {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [tripDestination, setTripDestination] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripName, setTripName] = useState('');

  // Filter roster based on selections
  const filteredRoster = useMemo(() => {
    return roster.filter(member => {
      const teamMatch = filterTeam === 'all' || member.team_name === filterTeam;
      const roleMatch = filterRole === 'all' || member.role === filterRole;
      return teamMatch && roleMatch;
    });
  }, [roster, filterTeam, filterRole]);

  // Get selected members data
  const selectedMembersData = useMemo(() => {
    return roster.filter(m => selectedMembers.has(m.id));
  }, [roster, selectedMembers]);

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredRoster.map(m => m.id);
    const allSelected = allFilteredIds.every(id => selectedMembers.has(id));
    
    if (allSelected) {
      // Deselect all filtered
      setSelectedMembers(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedMembers(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleSelectTeam = (teamName: string) => {
    const teamMembers = roster.filter(m => m.team_name === teamName);
    const teamIds = teamMembers.map(m => m.id);
    const allSelected = teamIds.every(id => selectedMembers.has(id));

    if (allSelected) {
      setSelectedMembers(prev => {
        const next = new Set(prev);
        teamIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedMembers(prev => {
        const next = new Set(prev);
        teamIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const generateCSV = () => {
    const headers = [
      'Team',
      'Role',
      'First Name',
      'Last Name',
      'Position',
      'Jersey #',
      'Status',
      'Travel Document',
      'Seat Preference',
      'Special Requirements',
      'Contact Email',
    ];

    const rows = selectedMembersData.map(m => [
      m.team_name,
      m.role,
      m.first_name,
      m.last_name,
      m.position || '',
      m.jersey_number?.toString() || '',
      m.status,
      m.travel_document || '',
      m.seat_preference || '',
      m.special_requirements || '',
      m.contact_email || '',
    ]);

    // Add trip info as header rows
    const tripInfo = [
      ['Travel Manifest'],
      [`Trip: ${tripName || 'Unnamed Trip'}`],
      [`Destination: ${tripDestination || 'TBD'}`],
      [`Date: ${tripDate || 'TBD'}`],
      [`Generated: ${format(new Date(), 'PPpp')}`],
      [`Total Travelers: ${selectedMembersData.length}`],
      [],
    ];

    const csvContent = [
      ...tripInfo.map(row => row.join(',')),
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel-manifest-${tripName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF');
      return;
    }

    const seatSummary = selectedMembersData.reduce((acc, m) => {
      const pref = m.seat_preference || 'No Preference';
      acc[pref] = (acc[pref] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const specialReqs = selectedMembersData.filter(m => m.special_requirements);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Travel Manifest - ${tripName || 'Export'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1a1a1a; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .header .trip-info { font-size: 14px; color: #666; }
          .trip-info p { margin: 4px 0; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; padding: 8px; background: #f5f5f5; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: 600; }
          tr:nth-child(even) { background: #fafafa; }
          .summary { display: flex; gap: 40px; flex-wrap: wrap; }
          .summary-item { margin-bottom: 10px; }
          .summary-label { font-weight: 600; font-size: 12px; }
          .summary-value { font-size: 14px; }
          .special-req { background: #fff3cd; padding: 8px; margin: 5px 0; border-radius: 4px; font-size: 12px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Travel Manifest</h1>
          <div class="trip-info">
            <p><strong>${tripName || 'Team Travel'}</strong></p>
            <p>Destination: ${tripDestination || 'TBD'}</p>
            <p>Date: ${tripDate || 'TBD'}</p>
            <p>Total Travelers: ${selectedMembersData.length}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Seat Preference Summary</div>
          <div class="summary">
            ${Object.entries(seatSummary).map(([pref, count]) => `
              <div class="summary-item">
                <div class="summary-label">${pref}</div>
                <div class="summary-value">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${specialReqs.length > 0 ? `
          <div class="section">
            <div class="section-title">Special Requirements (${specialReqs.length})</div>
            ${specialReqs.map(m => `
              <div class="special-req">
                <strong>${m.first_name} ${m.last_name}</strong>: ${m.special_requirements}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Traveler List</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Name</th>
                <th>Role</th>
                <th>Position</th>
                <th>Travel Doc</th>
                <th>Seat Pref</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              ${selectedMembersData.map((m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${m.team_name}</td>
                  <td>${m.first_name} ${m.last_name}${m.jersey_number ? ` (#${m.jersey_number})` : ''}</td>
                  <td>${m.role}</td>
                  <td>${m.position || '—'}</td>
                  <td>${m.travel_document || '—'}</td>
                  <td>${m.seat_preference || '—'}</td>
                  <td>${m.contact_email || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Generated on ${format(new Date(), 'PPpp')} • Touchdown Travel Platform
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const allFilteredSelected = filteredRoster.length > 0 && 
    filteredRoster.every(m => selectedMembers.has(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Travel Manifest
          </DialogTitle>
          <DialogDescription>
            Select team members and enter trip details to generate a travel manifest for export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
          {/* Left: Trip Details & Filters */}
          <div className="space-y-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Trip Details</h4>
              <div className="space-y-2">
                <Label htmlFor="tripName">Trip Name</Label>
                <Input
                  id="tripName"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Super Bowl LX"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripDestination">Destination</Label>
                <Input
                  id="tripDestination"
                  value={tripDestination}
                  onChange={(e) => setTripDestination(e.target.value)}
                  placeholder="e.g., New Orleans, LA"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripDate">Travel Date</Label>
                <Input
                  id="tripDate"
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Quick Select</h4>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => (
                  <Button
                    key={team}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectTeam(team)}
                    className="gap-1"
                  >
                    <Users className="h-3 w-3" />
                    {team}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Travelers</span>
                <Badge variant="secondary" className="text-lg px-3">
                  {selectedMembers.size}
                </Badge>
              </div>
              {selectedMembersData.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {teams.map(team => {
                    const count = selectedMembersData.filter(m => m.team_name === team).length;
                    return count > 0 ? `${team}: ${count}` : null;
                  }).filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </div>

          {/* Right: Member Selection */}
          <div className="flex flex-col space-y-3 overflow-hidden">
            <div className="flex gap-2">
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Player">Players</SelectItem>
                  <SelectItem value="Coach">Coaches</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-1 ml-auto"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredRoster.map(member => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer transition-colors ${
                      selectedMembers.has(member.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => handleToggleMember(member.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.has(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {member.first_name} {member.last_name}
                        </span>
                        {member.jersey_number && (
                          <span className="text-xs text-muted-foreground">#{member.jersey_number}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.team_name} • {member.role} • {member.position || 'Staff'}
                      </div>
                    </div>
                    {member.special_requirements && (
                      <Badge variant="outline" className="text-xs">Special Req</Badge>
                    )}
                  </div>
                ))}
                {filteredRoster.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No members match the current filters
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateCSV}
              disabled={selectedMembers.size === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedMembers.size === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
