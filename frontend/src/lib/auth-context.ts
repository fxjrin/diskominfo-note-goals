import { createContext } from "react";
import type { AuthUser } from "@/types";

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
