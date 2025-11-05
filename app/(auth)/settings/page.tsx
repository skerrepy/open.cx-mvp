"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Smile, Briefcase, ScrollText, Coffee, Code, Copy, Check } from "lucide-react";

interface BusinessSettings {
  id?: string;
  owner_user_id: string;
  business_name: string;
  primary_language: string;
  ai_tone: string;
  business_context: string;
}

export default function BusinessSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [aiTone, setAiTone] = useState("friendly");
  const [businessContext, setBusinessContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [widgetCode, setWidgetCode] = useState('<script src="/embed.js"></script>');

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Set widget code on client side only to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWidgetCode(`<script src="${window.location.origin}/embed.js"></script>`);
    }
  }, []);

  // Fetch existing settings
  // In single-tenant system, there's only one business
  // Use API route to bypass RLS
  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings"],
    queryFn: async () => {
      const response = await fetch("/api/business-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch business settings");
      }
      const data = await response.json();
      return data;
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name || "");
      setPrimaryLanguage(settings.primary_language || "English");
      setAiTone(settings.ai_tone || "friendly");
      setBusinessContext(settings.business_context || "");
    }
  }, [settings]);

  // Save mutation
  // In single-tenant system, update the single business
  // Use API route to bypass RLS
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const settingsData = {
        owner_user_id: userId,
        business_name: businessName,
        primary_language: primaryLanguage,
        ai_tone: aiTone,
        business_context: businessContext,
      };

      // Use API route to update/insert business settings
      const response = await fetch("/api/business-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      queryClient.invalidateQueries({ queryKey: ["business-settings-check"] });
      toast({
        title: "Settings saved",
        description: "Your business settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Widget code copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">Business Settings</CardTitle>
            <CardDescription>
              Configure how your AI assistant interacts with customers. These settings will be used for all AI-generated responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Business Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <Label htmlFor="business_name" className="text-sm font-semibold text-slate-900 pt-2">
                  Business Name
                </Label>
                <div className="space-y-2">
                  <Input
                    id="business_name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Company Name"
                    className="w-full"
                    required
                  />
                </div>
              </div>

              {/* Primary Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <Label htmlFor="primary_language" className="text-sm font-semibold text-slate-900 pt-2">
                  Primary Language
                </Label>
                <div className="space-y-2">
                  <Select
                    value={primaryLanguage}
                    onValueChange={setPrimaryLanguage}
                  >
                    <SelectTrigger id="primary_language" className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Tone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <Label htmlFor="ai_tone" className="text-sm font-semibold text-slate-900 pt-2">
                  AI Tone
                </Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="AI Tone">
                    {[
                      { key: "friendly", label: "Friendly", color: "green", Icon: Smile },
                      { key: "professional", label: "Professional", color: "blue", Icon: Briefcase },
                      { key: "formal", label: "Formal", color: "purple", Icon: ScrollText },
                      { key: "casual", label: "Casual", color: "orange", Icon: Coffee },
                    ].map(({ key, label, color, Icon }) => {
                      const selected = aiTone === key;
                      const base = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-sm";
                      const selectedClasses =
                        color === "green"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : color === "blue"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : color === "purple"
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "bg-orange-50 text-orange-700 border-orange-200";
                      const unselectedClasses = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAiTone(key)}
                          className={`${base} ${selected ? selectedClasses : unselectedClasses}`}
                          aria-pressed={selected}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">Choose the tone that best represents your brand voice.</p>
                </div>
              </div>

              {/* Business Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <Label htmlFor="business_context" className="text-sm font-semibold text-slate-900">
                    Business Context
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    This will be passed to the AI for more accurate answers. Add FAQs, policies, product descriptions, etc.
                  </p>
                </div>
                <div className="space-y-2">
                  <Textarea
                    id="business_context"
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    placeholder="Enter your business context, FAQs, policies, product information, etc..."
                    className="w-full min-h-[200px] resize-y"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                >
                  {isSubmitting || saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Widget Implementation Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-slate-700" />
              <CardTitle className="text-xl font-bold text-slate-900">Add Widget to Your Website</CardTitle>
            </div>
            <CardDescription>
              Copy and paste this code snippet into your website to add the support chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{widgetCode}</code>
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="absolute top-2 right-2 bg-slate-800 text-white hover:bg-slate-700 border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Installation Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the code snippet above</li>
                  <li>Paste it before the closing <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag in your HTML</li>
                  <li>The widget will automatically appear on your website</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

