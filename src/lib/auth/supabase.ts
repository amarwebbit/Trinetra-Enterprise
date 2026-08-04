export interface GoTrueAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      role?: string;
      tenant_id?: string;
    };
  };
}

export async function loginWithGoTrue(email: string, password: string): Promise<GoTrueAuthResponse> {
  const authUrl = process.env.GOTRUE_API_URL || 'http://localhost:9999';
  
  const response = await fetch(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || 'Authentication failed');
  }

  return response.json();
}
