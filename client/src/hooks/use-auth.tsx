import React, { createContext, ReactNode, useContext } from "react";
import { 
  useQuery, 
  useMutation, 
  UseMutationResult 
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { queryClient, apiRequest, getQueryFn } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  bypassAuth: () => User; // Added for development bypass
  microsoftAuthConfigured: boolean;
  microsoftAuthStatusLoading: boolean;
};

type LoginData = {
  username: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to check if Microsoft authentication is configured
  const { 
    data: microsoftAuthStatus, 
    isLoading: microsoftAuthStatusLoading 
  } = useQuery<{ configured: boolean }, Error>({
    queryKey: ["/api/auth/microsoft/status"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Add a function to bypass authentication for development purposes
  const bypassAuth = () => {
    // Create a mock user object with admin privileges
    const mockUser: User = {
      id: 1,
      username: "admin",
      password: "hashed_password_not_needed_for_client", // This is not used in the client
      email: "admin@example.com",
      fullName: "Administrator",
      role: "admin",
      created_at: new Date(),
      updated_at: new Date()
    } as User; // Use type assertion since we're creating a mock
    
    // Set the mock user in the query cache
    queryClient.setQueryData(["/api/user"], mockUser);
    
    toast({
      title: "Development Mode",
      description: "Bypassed authentication for development purposes.",
    });
    
    return mockUser;
  };

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      return data;
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }
      return data;
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        bypassAuth,
        microsoftAuthConfigured: microsoftAuthStatus?.configured ?? false,
        microsoftAuthStatusLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  // Add a development bypass auth function
  const bypassAuth = async () => {
    try {
      console.log('Attempting to bypass authentication for development');
      
      // First try the dedicated dev login endpoint
      try {
        const response = await apiRequest('POST', '/api/dev-login');
        if (response.ok) {
          const userData = await response.json();
          // Update the query client with the user data
          queryClient.setQueryData(["/api/user"], userData);
          console.log('Authentication bypass successful via dev-login');
          return true;
        }
      } catch (devLoginError) {
        console.warn('Dev login failed, trying second method:', devLoginError);
      }
      
      // Fallback to a direct mock auth injection
      const mockUser = {
        id: 999,
        username: 'dev-admin',
        email: 'dev@example.com',
        fullName: 'Development Admin',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Set the mock user in the query cache
      queryClient.setQueryData(["/api/user"], mockUser);
      
      // Add a custom header to all future requests
      const originalRequest = apiRequest;
      (window as any).originalApiRequest = originalRequest;
      
      // We don't need to override apiRequest anymore as we've modified it to include bypass headers automatically
      
      console.log('Authentication bypass successful via mock user');
      return true;
    } catch (error) {
      console.error('Error bypassing auth:', error);
      return false;
    }
  };
  
  return {
    ...context,
    bypassAuth
  };
}