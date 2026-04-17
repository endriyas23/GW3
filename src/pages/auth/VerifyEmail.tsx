import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmail() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-16rem)]">
      <Card className="w-full max-w-md border-secondary/20 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-secondary">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <div className="rounded-full bg-secondary/10 p-3 mb-4">
            <svg className="h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-center text-muted-foreground">
            Please click the link in the email to verify your account. If you don't see it, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full bg-secondary hover:bg-secondary/90 text-white" onClick={() => navigate("/auth/login")}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
