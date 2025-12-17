"use client";

import Link from "next/link";
import UnifiedEditorLayout from "@/components/UnifiedEditorLayout";
import AuthControl from "@/components/AuthControl";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 z-50">
        <AuthControl />
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
          The Canvas for your <span className="text-blue-600">Ideas.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          A unified workspace for text and whiteboard. Brainstorm, write, and
          collaborate in one seamless interface.
        </p>

        <div className="flex gap-4">
          <Link
            href="/join"
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Enter Room
          </Link>

        </div>
      </div>

      {/* Demo Section */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 pb-20">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden h-[600px] flex flex-col">
          <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white px-3 py-1 rounded-md text-xs text-gray-500 border border-gray-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Public Demo
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <UnifiedEditorLayout roomId="landing-demo" showHeader={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
