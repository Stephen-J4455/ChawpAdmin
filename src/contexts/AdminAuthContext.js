import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

const AdminAuthContext = createContext({});

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const initAuth = async () => {
      try {
        if (!supabase || !supabase.auth) {
          throw new Error("Supabase client not initialized");
        }

        // Get initial session with error handling
        if (__DEV__) console.log("AdminAuth: Initializing...");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        if (__DEV__) {
          console.log(
            "AdminAuth: Session retrieved",
            session ? "exists" : "null"
          );
        }

        if (session) {
          // Verify user has admin role
          if (__DEV__) {
            console.log(
              "AdminAuth: Checking admin role for user:",
              session.user.id
            );
          }

          const { data: profile, error: profileError } = await supabase
            .from("chawp_user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (!mounted) return;

          if (__DEV__) {
            console.log("AdminAuth: Profile check result", {
              profile,
              profileError,
            });
          }

          if (
            profileError ||
            !profile ||
            (profile.role !== "admin" && profile.role !== "super_admin")
          ) {
            // User doesn't have admin role, sign them out
            if (__DEV__)
              console.log("AdminAuth: User is not admin, signing out");
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
            return;
          }
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          setInitError(null);
          if (__DEV__) console.log("AdminAuth: Initialization complete");
        }
      } catch (error) {
        if (__DEV__) {
          console.error("AdminAuth: Initialization error:", error);
          console.error("AdminAuth: Error details:", {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
        }
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setInitError(error?.message || "Failed to initialize authentication");
        }
      }
    };

    // Initialize auth
    initAuth();

    // Listen for auth changes
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          try {
            if (!mounted) return;

            if (session) {
              // Verify user has admin role
              const { data: profile, error: profileError } = await supabase
                .from("chawp_user_profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

              if (!mounted) return;

              if (
                profileError ||
                !profile ||
                (profile.role !== "admin" && profile.role !== "super_admin")
              ) {
                // User doesn't have admin role, sign them out
                await supabase.auth.signOut();
                if (mounted) {
                  setSession(null);
                  setUser(null);
                }
                return;
              }
            }

            if (mounted) {
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
            }
          } catch (error) {
            if (__DEV__) console.error("Auth state change error:", error);
            if (mounted) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
          }
        }
      );

      subscription = data?.subscription;
    } catch (error) {
      if (__DEV__) console.error("Failed to setup auth listener:", error);
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: profile, error: profileError } = await supabase
        .from("chawp_user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error("Failed to verify admin access");
      }

      if (
        !profile ||
        (profile.role !== "admin" && profile.role !== "super_admin")
      ) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin privileges required.");
      }

      return { success: true, data };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
