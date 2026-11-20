export interface Campus {
  slug: string;
  name: string;
  image: string;
}

export interface LambdaEnvelope<T = unknown> {
  s: string;
  d: T;
  m?: string;
}

export interface LoginUrlPayload {
  tipo: 'url_login';
  data: {
    url_login: string;
    redirect_uri?: string;
    state?: string;
  };
}

export interface UserPayload {
  email: string;
  [key: string]: unknown;
}

export interface PendingLogin {
  campusSlug: string;
  campusName: string;
  redirectUri: string;
  authUrl: string;
  startedAt: string;
}

export interface UserSession {
  email: string;
  campusSlug?: string;
  campusName?: string;
  startedAt: string;
  raw: unknown;
}
