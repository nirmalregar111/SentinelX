import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const SUPABASE_URL = `https://${projectId}.supabase.co`;
export const BUCKET = "sentinelx-clips";
export const ANON_KEY = publicAnonKey;
export const EDGE_BASE = `${SUPABASE_URL}/functions/v1/server/make-server-3d5271d2`;

export const supabase = createClient(SUPABASE_URL, publicAnonKey);
