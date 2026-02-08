const BASE_URL = "/api-retreat";

export interface AnalyzeRequirementsResponse {
  session_id: string;
  [key: string]: any;
}

export interface WeightGroup {
  [key: string]: number;
}

export interface Weights {
  category_importance?: WeightGroup;
  hotels?: WeightGroup;
  flights?: WeightGroup;
  meeting_rooms?: WeightGroup;
}

export const retreatApi = {
  async analyzeRequirements(userInput: string, sessionId?: string): Promise<AnalyzeRequirementsResponse> {
    const response = await fetch(`${BASE_URL}/api/v1/analyze-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_input: userInput, session_id: sessionId }),
    });
    if (!response.ok) throw new Error('Failed to analyze requirements');
    return response.json();
  },

  async discoverOptions(sessionId: string) {
    const response = await fetch(`${BASE_URL}/api/v1/discover-options?session_id=${sessionId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to discover options');
    return response.json();
  },

  async rankPackages(sessionId: string, weights?: Weights) {
    const response = await fetch(`${BASE_URL}/api/v1/rank-packages?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: weights ? JSON.stringify({ weights }) : undefined,
    });
    if (!response.ok) throw new Error('Failed to rank packages');
    return response.json();
  },

  async buildCart(sessionId: string, packageId: string) {
    const response = await fetch(`${BASE_URL}/api/v1/cart/build?session_id=${sessionId}&package_id=${packageId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to build cart');
    return response.json();
  },

  async checkout(sessionId: string, contact: { name: string; email: string }, payment: { method: string; stripe_token: string }) {
    const response = await fetch(`${BASE_URL}/api/v1/checkout?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        payment,
        terms_accepted: true,
      }),
    });
    if (!response.ok) throw new Error('Failed to checkout');
    return response.json();
  },
};
