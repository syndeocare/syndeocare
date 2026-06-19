import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Palette,
  Type,
  Ruler,
  Layers,
  MousePointer2,
  Layout,
  Square,
  FormInput,
  Bell,
  ChevronRight,
  Copy,
  Check,
  Menu,
  X,
  Home,
  Loader2,
  Heart,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  User,
  Mail,
  Search,
  ExternalLink,
  FileText,
  Settings,
  Eye,
  Book,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormField, InputWithIcon } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingButton } from "@/components/ui/loading-button";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { toast } from "sonner";

// Navigation structure
const navigation = [
  {
    category: "Foundations",
    items: [
      { id: "colors", label: "Colors", icon: Palette },
      { id: "typography", label: "Typography", icon: Type },
      { id: "spacing", label: "Spacing", icon: Ruler },
      { id: "shadows", label: "Shadows & Effects", icon: Layers },
    ],
  },
  {
    category: "Components",
    items: [
      { id: "buttons", label: "Buttons", icon: MousePointer2 },
      { id: "cards", label: "Cards", icon: Layout },
      { id: "badges", label: "Badges", icon: Square },
      { id: "inputs", label: "Form Inputs", icon: FormInput },
      { id: "feedback", label: "Feedback", icon: Bell },
      { id: "data-display", label: "Data Display", icon: FileText },
    ],
  },
  {
    category: "Patterns",
    items: [
      { id: "forms", label: "Forms", icon: Settings },
      { id: "loading", label: "Loading States", icon: Loader2 },
    ],
  },
];

// Color Swatch Component
const ColorSwatch = ({
  name,
  variable,
  className,
}: {
  name: string;
  variable: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(variable);
    setCopied(true);
    toast.success(`Copied ${variable}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group cursor-pointer" onClick={copyToClipboard}>
      <div
        className={cn(
          "h-20 rounded-xl mb-3 ring-1 ring-border/50 transition-all",
          "group-hover:ring-2 group-hover:ring-primary/50 group-hover:scale-105",
          className,
        )}
        style={{ backgroundColor: `hsl(var(${variable}))` }}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-muted-foreground font-mono">{variable}</p>
        </div>
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
};

// Section Component
const Section = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-8">
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);

// Subsection Component
const Subsection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-10">
    <h3 className="text-lg font-semibold mb-4 pb-2 border-b">{title}</h3>
    {children}
  </div>
);

export default function DesignSystem() {
  const [activeSection, setActiveSection] = useState("colors");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="font-bold text-lg">SyndeoCare</h1>
                <p className="text-xs text-muted-foreground">
                  Design System v1.0
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a
                href="http://localhost:6006"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Book className="w-4 h-4 me-2" />
                Storybook
                <ExternalLink className="w-3 h-3 ms-1.5" />
              </a>
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <a href="/">
                <Home className="w-4 h-4 me-2" />
                Back to App
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-16 h-[calc(100vh-4rem)] bg-card border-e z-40",
            "transition-all duration-300",
            sidebarOpen ? "w-64" : "w-0 lg:w-64 overflow-hidden",
          )}
        >
          <ScrollArea className="h-full py-6">
            <nav className="px-4 space-y-6">
              {navigation.map((group) => (
                <div key={group.category}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.category}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                            activeSection === item.id
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-20">
            {/* ==================== COLORS ==================== */}
            <Section
              id="colors"
              title="Colors"
              description="SyndeoCare's color system is built on Green and Teal, representing healthcare trust and growth."
            >
              <Subsection title="Brand Colors">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <ColorSwatch name="Primary Green" variable="--primary" />
                  <ColorSwatch name="Accent Teal" variable="--accent" />
                  <ColorSwatch name="Success" variable="--success" />
                  <ColorSwatch name="Warning" variable="--warning" />
                </div>
              </Subsection>

              <Subsection title="Semantic Colors">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <ColorSwatch name="Background" variable="--background" />
                  <ColorSwatch name="Foreground" variable="--foreground" />
                  <ColorSwatch name="Card" variable="--card" />
                  <ColorSwatch name="Muted" variable="--muted" />
                  <ColorSwatch name="Border" variable="--border" />
                  <ColorSwatch name="Secondary" variable="--secondary" />
                  <ColorSwatch name="Destructive" variable="--destructive" />
                  <ColorSwatch name="Sky" variable="--sky" />
                </div>
              </Subsection>

              <Subsection title="Gradients">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="h-24 rounded-xl gradient-primary mb-3" />
                    <p className="font-medium text-sm">Primary Gradient</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      .gradient-primary
                    </p>
                  </div>
                  <div>
                    <div className="h-24 rounded-xl gradient-accent mb-3" />
                    <p className="font-medium text-sm">Accent Gradient</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      .gradient-accent
                    </p>
                  </div>
                  <div>
                    <div className="h-24 rounded-xl gradient-brand mb-3" />
                    <p className="font-medium text-sm">Brand Gradient</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      .gradient-brand
                    </p>
                  </div>
                </div>
              </Subsection>
            </Section>

            {/* ==================== TYPOGRAPHY ==================== */}
            <Section
              id="typography"
              title="Typography"
              description="DM Sans for English, Cairo for Arabic. Clean, professional, and highly readable."
            >
              <Subsection title="Heading Scale">
                <div className="space-y-6">
                  <div className="pb-4 border-b">
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      heading-1 / text-6xl
                    </span>
                    <h1 className="heading-1">The quick brown fox</h1>
                  </div>
                  <div className="pb-4 border-b">
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      heading-2 / text-5xl
                    </span>
                    <h2 className="heading-2">The quick brown fox</h2>
                  </div>
                  <div className="pb-4 border-b">
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      heading-3 / text-3xl
                    </span>
                    <h3 className="heading-3">The quick brown fox</h3>
                  </div>
                  <div className="pb-4 border-b">
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      heading-4 / text-xl
                    </span>
                    <h4 className="heading-4">The quick brown fox</h4>
                  </div>
                </div>
              </Subsection>

              <Subsection title="Body Text">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      .body-large
                    </span>
                    <p className="body-large">
                      Large body text for introductions and key messages.
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      .body-default
                    </span>
                    <p className="body-default">
                      Default body text for general content and descriptions.
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-mono mb-2 block">
                      .body-small
                    </span>
                    <p className="body-small">
                      Small body text for secondary information and captions.
                    </p>
                  </div>
                </div>
              </Subsection>

              <Subsection title="Arabic Typography (Cairo)">
                <div
                  dir="rtl"
                  className="p-6 rounded-2xl bg-muted/50 space-y-4"
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  <h2 className="text-3xl font-bold">
                    مرحباً بكم في سينديو كير
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    نظام متكامل لربط العيادات بالمتخصصين في الرعاية الصحية.
                  </p>
                </div>
              </Subsection>
            </Section>

            {/* ==================== SPACING ==================== */}
            <Section
              id="spacing"
              title="Spacing"
              description="Consistent spacing system based on 4px grid."
            >
              <Subsection title="Spacing Scale">
                <div className="space-y-3">
                  {[
                    { name: "xs", value: "4px", class: "w-1" },
                    { name: "sm", value: "8px", class: "w-2" },
                    { name: "md", value: "16px", class: "w-4" },
                    { name: "lg", value: "24px", class: "w-6" },
                    { name: "xl", value: "32px", class: "w-8" },
                    { name: "2xl", value: "48px", class: "w-12" },
                  ].map((space) => (
                    <div key={space.name} className="flex items-center gap-4">
                      <span className="w-12 text-sm font-mono text-muted-foreground">
                        {space.name}
                      </span>
                      <div
                        className={cn("h-4 bg-primary rounded", space.class)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {space.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Subsection>
            </Section>

            {/* ==================== SHADOWS ==================== */}
            <Section
              id="shadows"
              title="Shadows & Effects"
              description="Elevation system for depth and hierarchy."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-card rounded-xl shadow-sm border">
                  <p className="font-medium">Shadow SM</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    shadow-sm
                  </p>
                </div>
                <div className="p-6 bg-card rounded-xl shadow-md border">
                  <p className="font-medium">Shadow MD</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    shadow-md
                  </p>
                </div>
                <div className="p-6 bg-card rounded-xl shadow-lg border">
                  <p className="font-medium">Shadow LG</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    shadow-lg
                  </p>
                </div>
              </div>
            </Section>

            {/* ==================== BUTTONS ==================== */}
            <Section
              id="buttons"
              title="Buttons"
              description="Interactive elements for user actions."
            >
              <Subsection title="Variants">
                <div className="flex flex-wrap gap-4">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </Subsection>

              <Subsection title="Sizes">
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Star className="w-4 h-4" />
                  </Button>
                </div>
              </Subsection>

              <Subsection title="States">
                <div className="flex flex-wrap gap-4">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                  <LoadingButton isLoading>Loading</LoadingButton>
                </div>
              </Subsection>
            </Section>

            {/* ==================== CARDS ==================== */}
            <Section
              id="cards"
              title="Cards"
              description="Container components for grouping content."
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Card</CardTitle>
                    <CardDescription>
                      A simple card with header and content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Card content goes here.
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>Interactive Card</CardTitle>
                    <CardDescription>
                      Hover to see the shadow effect.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Click me!</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Card with Footer</CardTitle>
                    <CardDescription>Includes action buttons.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Some content here.</p>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </CardFooter>
                </Card>
              </div>
            </Section>

            {/* ==================== BADGES ==================== */}
            <Section
              id="badges"
              title="Badges"
              description="Status indicators and labels."
            >
              <Subsection title="Variants">
                <div className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="urgent">Urgent</Badge>
                </div>
              </Subsection>

              <Subsection title="Role Badges">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="role-dentist">Dentist</Badge>
                  <Badge variant="role-hygienist">Hygienist</Badge>
                  <Badge variant="role-assistant">Assistant</Badge>
                  <Badge variant="role-nurse">Nurse</Badge>
                </div>
              </Subsection>
            </Section>

            {/* ==================== INPUTS ==================== */}
            <Section
              id="inputs"
              title="Form Inputs"
              description="Input components for user data entry."
            >
              <Subsection title="Text Inputs">
                <div className="max-w-md space-y-4">
                  <FormField label="Email" htmlFor="demo-email">
                    <InputWithIcon icon={Mail}>
                      <Input id="demo-email" placeholder="you@example.com" />
                    </InputWithIcon>
                  </FormField>

                  <FormField label="Password" htmlFor="demo-password">
                    <PasswordInput
                      id="demo-password"
                      placeholder="Enter your password"
                    />
                  </FormField>

                  <FormField label="Search" htmlFor="demo-search">
                    <InputWithIcon icon={Search}>
                      <Input id="demo-search" placeholder="Search shifts..." />
                    </InputWithIcon>
                  </FormField>
                </div>
              </Subsection>

              <Subsection title="Selection Controls">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="demo-checkbox" />
                    <Label htmlFor="demo-checkbox">
                      Accept terms and conditions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="demo-switch" />
                    <Label htmlFor="demo-switch">Enable notifications</Label>
                  </div>
                </div>
              </Subsection>
            </Section>

            {/* ==================== FEEDBACK ==================== */}
            <Section
              id="feedback"
              title="Feedback"
              description="Visual feedback for user actions and states."
            >
              <Subsection title="Alerts">
                <div className="space-y-4 max-w-lg">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium text-success">Success</p>
                      <p className="text-sm text-muted-foreground">
                        Your changes have been saved.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Warning</p>
                      <p className="text-sm text-muted-foreground">
                        Please review your input.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Error</p>
                      <p className="text-sm text-muted-foreground">
                        Something went wrong.
                      </p>
                    </div>
                  </div>
                </div>
              </Subsection>

              <Subsection title="Progress">
                <div className="max-w-md space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Profile Completion</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} />
                  </div>
                </div>
              </Subsection>
            </Section>

            {/* ==================== DATA DISPLAY ==================== */}
            <Section
              id="data-display"
              title="Data Display"
              description="Components for displaying information."
            >
              <Subsection title="Avatars">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      SC
                    </AvatarFallback>
                  </Avatar>
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                      DM
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Subsection>

              <Subsection title="Stats Card">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Shifts", value: "24", icon: Clock },
                    { label: "Earnings", value: "$3,240", icon: DollarSign },
                    { label: "Rating", value: "4.9", icon: Star },
                    { label: "Distance", value: "5.2 mi", icon: MapPin },
                  ].map((stat) => (
                    <Card key={stat.label}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <stat.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">
                              {stat.label}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Subsection>
            </Section>

            {/* ==================== FORMS ==================== */}
            <Section
              id="forms"
              title="Forms"
              description="Complete form patterns and layouts."
            >
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                  <CardDescription>Send us a message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Name" htmlFor="contact-name" required>
                    <InputWithIcon icon={User}>
                      <Input id="contact-name" placeholder="Your name" />
                    </InputWithIcon>
                  </FormField>
                  <FormField label="Email" htmlFor="contact-email" required>
                    <InputWithIcon icon={Mail}>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                      />
                    </InputWithIcon>
                  </FormField>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Send Message</Button>
                </CardFooter>
              </Card>
            </Section>

            {/* ==================== LOADING ==================== */}
            <Section
              id="loading"
              title="Loading States"
              description="Skeleton loaders and spinners."
            >
              <Subsection title="Skeletons">
                <div className="space-y-4 max-w-md">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              </Subsection>

              <Subsection title="Spinners">
                <div className="flex items-center gap-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
              </Subsection>
            </Section>
          </div>
        </main>
      </div>
    </div>
  );
}
