"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, LogIn } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login-bg.png"
          alt="Login Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* Glassmorphism Card */}
      <Card className="relative z-10 w-full max-w-md border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl text-white">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl ring-1 ring-blue-500/50 animate-pulse">
              <ShieldCheck className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-gray-300">
            Sign in to access your RAG Chatbot assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Button
            onClick={() => signIn("keycloak", { callbackUrl: "/" })}
            className="w-full h-12 text-lg font-semibold transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 group"
          >
            <LogIn className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            Continue with Keycloak
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-400">
                Secure Authentication
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] -z-10 animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] -z-10 animate-blob animation-delay-2000" />
    </div>
  )
}
