import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase project credentials (same as Chawp app)
const SUPABASE_URL = "https://qxxflbymaoledpluzqtb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGZsYnltYW9sZWRwbHV6cXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDk3MzIsImV4cCI6MjA3NzU4NTczMn0.t4hkTwSX7SLxHXdjs00pYaWF7FJj_AjZCyqO5ifpM5k";

// Initialize Supabase client with error handling
let supabaseInstance = null;

const initSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    throw error;
  }
};

export const supabase = initSupabase();
