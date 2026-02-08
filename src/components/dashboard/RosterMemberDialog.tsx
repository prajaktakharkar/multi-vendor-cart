import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const rosterMemberSchema = z.object({
  team_name: z.string().min(1, 'Team name is required').max(100),
  role: z.enum(['Player', 'Coach', 'Admin']),
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  position: z.string().max(50).optional(),
  jersey_number: z.number().min(0).max(99).optional().nullable(),
  status: z.string().min(1, 'Status is required').max(20),
  travel_document: z.string().max(50).optional(),
  seat_preference: z.string().max(20).optional(),
  special_requirements: z.string().max(200).optional(),
  contact_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

type RosterMemberFormData = z.infer<typeof rosterMemberSchema>;

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

interface RosterMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: RosterMember | null;
  onSave: (data: {
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
  }) => Promise<void>;
  loading: boolean;
  existingTeams: string[];
}

export const RosterMemberDialog = ({
  open,
  onOpenChange,
  member,
  onSave,
  loading,
  existingTeams,
}: RosterMemberDialogProps) => {
  const isEditing = !!member;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RosterMemberFormData>({
    resolver: zodResolver(rosterMemberSchema),
    defaultValues: {
      team_name: '',
      role: 'Player',
      first_name: '',
      last_name: '',
      position: '',
      jersey_number: null,
      status: 'Active',
      travel_document: 'US Passport',
      seat_preference: 'Window',
      special_requirements: '',
      contact_email: '',
      notes: '',
    },
  });

  const watchRole = watch('role');

  useEffect(() => {
    if (member) {
      reset({
        team_name: member.team_name,
        role: member.role as 'Player' | 'Coach' | 'Admin',
        first_name: member.first_name,
        last_name: member.last_name,
        position: member.position || '',
        jersey_number: member.jersey_number,
        status: member.status,
        travel_document: member.travel_document || '',
        seat_preference: member.seat_preference || '',
        special_requirements: member.special_requirements || '',
        contact_email: member.contact_email || '',
        notes: member.notes || '',
      });
    } else {
      reset({
        team_name: '',
        role: 'Player',
        first_name: '',
        last_name: '',
        position: '',
        jersey_number: null,
        status: 'Active',
        travel_document: 'US Passport',
        seat_preference: 'Window',
        special_requirements: '',
        contact_email: '',
        notes: '',
      });
    }
  }, [member, reset]);

  const onSubmit = async (data: RosterMemberFormData) => {
    await onSave({
      team_name: data.team_name,
      role: data.role,
      first_name: data.first_name,
      last_name: data.last_name,
      position: data.position,
      jersey_number: data.jersey_number,
      status: data.status,
      travel_document: data.travel_document,
      seat_preference: data.seat_preference,
      special_requirements: data.special_requirements,
      contact_email: data.contact_email,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Roster Member' : 'Add Roster Member'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the roster member details below.' : 'Fill in the details to add a new roster member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team_name">Team Name *</Label>
              <Input
                id="team_name"
                {...register('team_name')}
                placeholder="e.g., Seahawks"
                list="team-suggestions"
              />
              <datalist id="team-suggestions">
                {existingTeams.map(team => (
                  <option key={team} value={team} />
                ))}
              </datalist>
              {errors.team_name && (
                <p className="text-sm text-destructive">{errors.team_name.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={watchRole} onValueChange={(val) => setValue('role', val as 'Player' | 'Coach' | 'Admin')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Player">Player</SelectItem>
                  <SelectItem value="Coach">Coach</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register('first_name')} placeholder="First name" />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register('last_name')} placeholder="Last name" />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" {...register('position')} placeholder="e.g., QB, WR, Coach" />
            </div>

            {/* Jersey Number */}
            <div className="space-y-2">
              <Label htmlFor="jersey_number">Jersey #</Label>
              <Input
                id="jersey_number"
                type="number"
                min={0}
                max={99}
                {...register('jersey_number', { valueAsNumber: true })}
                placeholder="0-99"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={watch('status')} onValueChange={(val) => setValue('status', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="FullTime">Full Time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Injured">Injured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Travel Document */}
            <div className="space-y-2">
              <Label htmlFor="travel_document">Travel Document</Label>
              <Select value={watch('travel_document') || ''} onValueChange={(val) => setValue('travel_document', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US Passport">US Passport</SelectItem>
                  <SelectItem value="Foreign Passport">Foreign Passport</SelectItem>
                  <SelectItem value="Visa Required">Visa Required</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seat Preference */}
            <div className="space-y-2">
              <Label htmlFor="seat_preference">Seat Preference</Label>
              <Select value={watch('seat_preference') || ''} onValueChange={(val) => setValue('seat_preference', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Window">Window</SelectItem>
                  <SelectItem value="Aisle">Aisle</SelectItem>
                  <SelectItem value="Middle">Middle</SelectItem>
                  <SelectItem value="Business">Business Class</SelectItem>
                  <SelectItem value="Coach">Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              {...register('contact_email')}
              placeholder="email@example.com"
            />
            {errors.contact_email && (
              <p className="text-sm text-destructive">{errors.contact_email.message}</p>
            )}
          </div>

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Input
              id="special_requirements"
              {...register('special_requirements')}
              placeholder="e.g., Wheelchair access, Medical kit"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Member' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
