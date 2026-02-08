import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Plane, Building2, Car 
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  user_id: string;
  booking_type: 'flight' | 'hotel' | 'car';
  status: 'pending' | 'confirmed' | 'cancelled';
  details: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface BookingCalendarProps {
  bookings: Booking[];
  employees: Employee[];
  onBookingClick: (booking: Booking) => void;
}

export const BookingCalendar = ({ bookings, employees, onBookingClick }: BookingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getBookingsForDay = (date: Date) => {
    return bookings.filter(booking => {
      if (!booking.start_date) return false;
      const startDate = parseISO(booking.start_date);
      const endDate = booking.end_date ? parseISO(booking.end_date) : startDate;
      return date >= new Date(startDate.setHours(0,0,0,0)) && 
             date <= new Date(endDate.setHours(23,59,59,999));
    });
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.user_id === userId);
    if (!employee) return 'Unknown';
    return employee.full_name?.split(' ')[0] || employee.email.split('@')[0];
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-3 h-3" />;
      case 'hotel': return <Building2 className="w-3 h-3" />;
      case 'car': return <Car className="w-3 h-3" />;
      default: return null;
    }
  };

  const getBookingColor = (type: string, status: string) => {
    if (status === 'cancelled') return 'bg-muted text-muted-foreground line-through';
    switch (type) {
      case 'flight': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900';
      case 'hotel': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900';
      case 'car': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-muted-foreground">Flights</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-muted-foreground">Hotels</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">Cars</span>
          </div>
        </div>

        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div 
              key={day} 
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-1 border rounded-lg transition-colors",
                  isCurrentMonth ? "bg-card" : "bg-muted/30",
                  isCurrentDay && "ring-2 ring-primary ring-offset-1"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 px-1",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                  isCurrentDay && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-0.5 overflow-hidden">
                  {dayBookings.slice(0, 3).map(booking => (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick(booking)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-xs truncate flex items-center gap-1 transition-colors cursor-pointer",
                        getBookingColor(booking.booking_type, booking.status)
                      )}
                    >
                      {getBookingIcon(booking.booking_type)}
                      <span className="truncate">{getEmployeeName(booking.user_id)}</span>
                    </button>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
