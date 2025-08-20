export type GenerateRequest = {
  message: string;
  previous_html?: string | null;
  temperature?: number;
  top_p?: number;
};

export type GenerateResponse = {
  error: boolean;
  html: string;
  detail?: string;
};
