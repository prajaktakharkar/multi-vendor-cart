import { useState, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedMember {
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
  isValid: boolean;
  errors: string[];
}

interface RosterImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (members: ParsedMember[]) => Promise<void>;
  loading: boolean;
  defaultTeamName?: string;
}

const EXPECTED_HEADERS = [
  'Role',
  'FirstName',
  'LastName',
  'Position',
  'JerseyNumber',
  'Status',
  'TravelDocument',
  'SeatPreference',
  'SpecialRequirements',
  'ContactEmail',
  'Notes',
];

const VALID_ROLES = ['Player', 'Coach', 'Admin'];
const VALID_STATUSES = ['Active', 'FullTime', 'Contract', 'Inactive', 'Injured'];

export const RosterImportDialog = ({
  open,
  onOpenChange,
  onImport,
  loading,
  defaultTeamName = '',
}: RosterImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState(defaultTeamName);

  const resetState = () => {
    setParsedMembers([]);
    setParseError(null);
    setFileName(null);
    setTeamName(defaultTeamName);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateMember = (row: Record<string, string>, rowIndex: number): ParsedMember => {
    const errors: string[] = [];

    const role = row['Role']?.trim() || '';
    const firstName = row['FirstName']?.trim() || '';
    const lastName = row['LastName']?.trim() || '';
    const position = row['Position']?.trim() || null;
    const jerseyStr = row['JerseyNumber']?.trim() || '';
    const status = row['Status']?.trim() || 'Active';
    const travelDocument = row['TravelDocument']?.trim() || null;
    const seatPreference = row['SeatPreference']?.trim() || null;
    const specialRequirements = row['SpecialRequirements']?.trim() || null;
    const contactEmail = row['ContactEmail']?.trim() || null;
    const notes = row['Notes']?.trim() || null;

    // Validate required fields
    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!role) errors.push('Role is required');
    if (role && !VALID_ROLES.includes(role)) {
      errors.push(`Invalid role: ${role}. Must be Player, Coach, or Admin`);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      errors.push(`Invalid status: ${status}`);
    }

    // Validate jersey number
    let jerseyNumber: number | null = null;
    if (jerseyStr) {
      const parsed = parseInt(jerseyStr, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 99) {
        errors.push('Jersey number must be 0-99');
      } else {
        jerseyNumber = parsed;
      }
    }

    // Validate email
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.push('Invalid email format');
    }

    // Validate field lengths
    if (firstName.length > 50) errors.push('First name too long (max 50)');
    if (lastName.length > 50) errors.push('Last name too long (max 50)');
    if (position && position.length > 50) errors.push('Position too long (max 50)');
    if (notes && notes.length > 500) errors.push('Notes too long (max 500)');

    return {
      team_name: '', // Will be set from the team name input
      role,
      first_name: firstName,
      last_name: lastName,
      position,
      jersey_number: jerseyNumber,
      status: status || 'Active',
      travel_document: travelDocument,
      seat_preference: seatPreference,
      special_requirements: specialRequirements === 'None' ? null : specialRequirements,
      contact_email: contactEmail,
      notes,
      isValid: errors.length === 0,
      errors,
    };
  };

  const parseCSV = (text: string): ParsedMember[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());

    // Check for expected headers
    const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing headers: ${missingHeaders.join(', ')}`);
    }

    const members: ParsedMember[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic cases)
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const member = validateMember(row, i);
      members.push(member);
    }

    return members;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setParseError('Please upload a CSV file');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setParseError('File too large. Maximum size is 1MB');
      return;
    }

    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const members = parseCSV(text);
        setParsedMembers(members);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Failed to parse CSV');
        setParsedMembers([]);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!teamName.trim()) {
      setParseError('Please enter a team name');
      return;
    }

    const validMembers = parsedMembers
      .filter(m => m.isValid)
      .map(m => ({ ...m, team_name: teamName.trim() }));

    if (validMembers.length === 0) {
      setParseError('No valid members to import');
      return;
    }

    await onImport(validMembers);
    resetState();
  };

  const validCount = parsedMembers.filter(m => m.isValid).length;
  const invalidCount = parsedMembers.filter(m => !m.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Team Roster</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import roster members. The CSV should have headers matching the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Team Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Name *</label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Seahawks, Vikings"
              maxLength={100}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File *</label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="flex-1"
              />
              {fileName && (
                <Button variant="ghost" size="icon" onClick={resetState}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Expected Format */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Expected CSV headers:</strong> Role, FirstName, LastName, Position, JerseyNumber, Status, TravelDocument, SeatPreference, SpecialRequirements, ContactEmail, Notes
            </AlertDescription>
          </Alert>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-medium">Preview ({parsedMembers.length} rows)</h4>
                {validCount > 0 && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {validCount} valid
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {invalidCount} errors
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>#</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedMembers.map((member, index) => (
                      <TableRow key={index} className={!member.isValid ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          {member.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{member.first_name} {member.last_name}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>{member.position || '—'}</TableCell>
                        <TableCell>{member.jersey_number ?? '—'}</TableCell>
                        <TableCell className="text-xs text-destructive">
                          {member.errors.join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || validCount === 0 || !teamName.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importing...' : `Import ${validCount} Members`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
