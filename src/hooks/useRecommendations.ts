import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types/cart";

export interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  reason: string;
}

export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (cartItems: CartItem[]) => {
    if (cartItems.length === 0) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-items', {
        body: { cartItems }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRecommendations(data?.recommendations || []);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to get recommendations");
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
  };
};
