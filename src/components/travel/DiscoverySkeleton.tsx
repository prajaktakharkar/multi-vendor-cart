import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Plane, Hotel, MapPin, Car, Loader2, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DiscoverySkeletonProps {
  currentAgent: number;
}

export function DiscoverySkeleton({ currentAgent }: DiscoverySkeletonProps) {
  const agents = [
    { id: 1, name: "Analyzing Requirements", desc: "Understanding your travel needs..." },
    { id: 2, name: "Searching Vendors", desc: "Finding flights, hotels, and transport..." },
    { id: 3, name: "Ranking Packages", desc: "Optimizing for your preferences..." },
  ];

  const categories = [
    { icon: Plane, label: "Flights", count: currentAgent >= 2 ? "12" : "..." },
    { icon: Hotel, label: "Hotels", count: currentAgent >= 2 ? "8" : "..." },
    { icon: MapPin, label: "Venues", count: currentAgent >= 2 ? "5" : "..." },
    { icon: Car, label: "Transport", count: currentAgent >= 2 ? "6" : "..." },
  ];

  const progress = (currentAgent / 3) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary">AI Agents Working</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Finding Your Perfect Trip</h2>
        <Progress value={progress} className="max-w-md mx-auto h-2" />
        <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
      </div>

      {/* Agent Status Cards */}
      <div className="grid gap-3">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={`p-4 transition-all duration-300 ${
              currentAgent === agent.id
                ? "border-primary bg-primary/5"
                : currentAgent > agent.id
                ? "border-success/50 bg-success/5"
                : "opacity-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentAgent === agent.id
                    ? "bg-primary text-primary-foreground"
                    : currentAgent > agent.id
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentAgent > agent.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : currentAgent === agent.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-sm font-bold">{agent.id}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Agent {agent.id}: {agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.desc}</p>
              </div>
              {currentAgent === agent.id && (
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Category Discovery Preview */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 text-foreground">Discovering Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(({ icon: Icon, label, count }) => (
            <div
              key={label}
              className="text-center p-4 rounded-lg bg-muted/50 transition-all"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">{label}</p>
              {currentAgent >= 2 ? (
                <p className="text-sm text-muted-foreground">{count} found</p>
              ) : (
                <Skeleton className="h-4 w-12 mx-auto mt-1" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Skeleton Package Previews */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Preparing Packages...</h3>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 opacity-50">
            <div className="flex gap-6">
              <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-28 rounded-md" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
