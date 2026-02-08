import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProcurementItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
  sellerName: string;
  category: string;
  reason: string;
  totalCost: number;
}

export interface ProcurementPlan {
  eventSummary: string;
  items: ProcurementItem[];
  tips: string[];
  grandTotal: number;
}

export const useProcurement = () => {
  const [plan, setPlan] = useState<ProcurementPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (
    eventDescription: string,
    attendeeCount: number,
    budget?: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('plan-procurement', {
        body: { eventDescription, attendeeCount, budget }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPlan(data);
    } catch (err) {
      console.error("Failed to generate procurement plan:", err);
      setError(err instanceof Error ? err.message : "Failed to generate plan");
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return {
    plan,
    isLoading,
    error,
    generatePlan,
    clearPlan,
  };
};
