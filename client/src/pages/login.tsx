import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getConfig, keycloakLogin } from "@/lib/keycloak";

export default function Login() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>("local");

  useEffect(() => {
    const config = getConfig();
    if (config) {
      setAuthProvider(config.auth.provider);
    }
  }, []);

  const handleKeycloakLogin = async () => {
    setLoading(true);
    try {
      await keycloakLogin();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Failed to redirect to Keycloak",
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Force full page reload to refresh auth state
      window.location.href = "/";
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid username or password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src="/icon-mon-black.png" alt="RNC Atlas" className="w-12 h-12" />
          </div>
          <CardTitle className="text-2xl text-center">RNC Atlas</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authProvider === "keycloak" ? (
            <div className="space-y-4">
              <Button
                onClick={handleKeycloakLogin}
                className="w-full"
                disabled={loading}
                data-testid="button-keycloak-login"
              >
                {loading ? "Redirecting..." : "Sign in with Keycloak"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                You will be redirected to Keycloak to sign in
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
