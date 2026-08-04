'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantBranding } from '@/types/tenant';

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address or roll number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  tenant: TenantBranding | null;
  tenantDomain: string;
}

export default function LoginForm({ tenant, tenantDomain }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        tenantDomain: tenantDomain || '',
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success('Successfully logged in!');
      
      // Determine redirection callback URL
      const callbackUrl = searchParams.get('callbackUrl');
      if (callbackUrl) {
        router.push(callbackUrl);
        return;
      }

      // Fallback role-based redirects (NextAuth session will populate on reload/redirect)
      router.refresh();
      // Middleware will automatically route to correct dashboard on reload, but we trigger standard push:
      router.push('/');
    } catch (err: any) {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Password reset instructions have been requested. Please check your email.');
  };

  return (
    <>
      {/* Full-Page Loading Skeleton Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 space-y-4">
            <div className="h-8 bg-muted animate-pulse w-3/4" />
            <div className="h-4 bg-muted animate-pulse w-1/2" />
            <div className="space-y-3">
              <div className="h-10 bg-muted animate-pulse w-full" />
              <div className="h-10 bg-muted animate-pulse w-full" />
            </div>
            <div className="h-10 bg-primary/20 animate-pulse w-full" />
          </div>
        </div>
      )}

      <Card className="w-full max-w-md border-2 border-muted shadow-lg bg-card">
        <CardHeader className="space-y-2 text-center pb-4">
          {tenant?.settings?.logoUrl ? (
            <div className="flex justify-center mb-2">
              <img
                src={tenant.settings.logoUrl}
                alt={`${tenant.name} Logo`}
                className="h-12 object-contain"
              />
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                E
              </div>
            </div>
          )}
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {tenant ? `${tenant.name} Portal` : 'Super Admin Portal'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {tenant ? 'Sign in to access your institution exams' : 'Access your main management interface'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email Address or Roll Number
              </label>
              <Input
                type="text"
                placeholder="name@example.com or roll number"
                disabled={isLoading}
                className={form.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive mt-0.5">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className={form.formState.errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive mt-0.5">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="rememberMe"
                disabled={isLoading}
                className="h-4 w-4 border border-input bg-transparent text-primary focus:ring-primary focus:ring-offset-0 accent-primary"
                {...form.register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                Remember me on this device
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 shadow-sm transition-all"
            >
              Sign In
            </Button>
            
            {/* Third-Party SSO (Google / GitHub / Microsoft) */}
            <div className="w-full flex items-center justify-between my-2">
              <span className="w-1/5 border-b border-muted"></span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Or continue with</span>
              <span className="w-1/5 border-b border-muted"></span>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => signIn('google')}
                className="w-full text-xs font-semibold py-1.5"
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => signIn('github')}
                className="w-full text-xs font-semibold py-1.5"
              >
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => signIn('azure-ad')}
                className="w-full text-xs font-semibold py-1.5"
              >
                Microsoft
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
