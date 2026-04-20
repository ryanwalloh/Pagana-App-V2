import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';
import paganaLogo from '@/assets/logos/pagana-index-logo.png';

export default function LandingPage() {
  // Placeholder logos for the moving animation
  const brandLogos = [
    'McDonald\'s',
    'KFC',
    'Pizza Hut',
    'Burger King',
    'Subway',
    'Starbucks',
    'Domino\'s',
    'Taco Bell',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  src={paganaLogo} 
                  alt="Pagana App" 
                  className="h-10 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ModeToggle />
              <Button variant="ghost" asChild className="text-foreground hover:text-foreground/80">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-brand hover:bg-brand-hover text-white">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Customer CTA */}
      <section className="mt-16 pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-tight tracking-tight">
              It's the food you love,
              <br />
              Delivered with care
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Discover delicious meals from thousands of restaurants. Order now and enjoy fast, reliable food delivery straight to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                asChild 
                className="bg-brand hover:bg-brand-hover text-white px-8 py-6 h-auto text-lg"
              >
                <Link to="/register">Order Food Now</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="border-2 border-border text-foreground hover:bg-muted px-8 py-6 h-auto text-lg"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Logo Marquee Section */}
      <section className="py-16 bg-background border-y border-border">
        <div className="relative w-full overflow-hidden marquee-container">
          {/* Gradient masks for fade effect at edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Marquee track - single flex container with duplicated content */}
          <div className="flex gap-20 whitespace-nowrap will-change-transform animate-scroll-left">
            {/* First set of logos */}
            {brandLogos.map((brand, index) => (
              <div
                key={`logo-first-${index}`}
                className="flex-shrink-0 flex items-center justify-center h-12 text-muted-foreground text-lg font-medium"
              >
                {brand}
              </div>
            ))}
            {/* Duplicate set for seamless infinite loop - must be identical */}
            {brandLogos.map((brand, index) => (
              <div
                key={`logo-second-${index}`}
                className="flex-shrink-0 flex items-center justify-center h-12 text-muted-foreground text-lg font-medium"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor/Restaurant Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Vendor Banner */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                Grow Your Restaurant Business
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Join thousands of restaurants and reach more customers. Manage orders, track deliveries, and grow your business effortlessly.
              </p>
              <Button 
                size="lg" 
                className="bg-brand hover:bg-brand-hover text-white px-8 py-6 h-auto text-lg"
              >
                Become a Partner Restaurant
              </Button>
            </div>
          </div>

          {/* Vendor Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Easy Order Management</CardTitle>
                <CardDescription className="text-base">
                  Manage all your orders from one intuitive dashboard. Track status, update menus, and handle customer requests seamlessly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Reach More Customers</CardTitle>
                <CardDescription className="text-base">
                  Expand your customer base and increase sales. Get discovered by thousands of hungry customers in your area.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Reliable Delivery Network</CardTitle>
                <CardDescription className="text-base">
                  Leverage our extensive delivery network. Fast, reliable delivery service that keeps your customers happy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Fair Commission Rates</CardTitle>
                <CardDescription className="text-base">
                  Competitive commission rates that help your business grow. Transparent pricing with no hidden fees.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Real-Time Analytics</CardTitle>
                <CardDescription className="text-base">
                  Track your performance with detailed analytics and insights. Make data-driven decisions to grow your restaurant.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">24/7 Support</CardTitle>
                <CardDescription className="text-base">
                  Get dedicated support whenever you need it. Our team is here to help you succeed.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Rider Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Rider Banner */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                Become a Pagana Rider
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Earn flexible income on your own schedule. Join our community of riders and deliver happiness to customers while building your future.
              </p>
              <Button 
                size="lg" 
                className="bg-brand hover:bg-brand-hover text-white px-8 py-6 h-auto text-lg"
              >
                Apply to be a Rider
              </Button>
            </div>
          </div>

          {/* Rider Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Flexible Schedule</CardTitle>
                <CardDescription className="text-base">
                  Work on your own terms. Choose when and where you want to deliver. Perfect work-life balance.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Great Earnings</CardTitle>
                <CardDescription className="text-base">
                  Competitive pay per delivery. Earn more with bonuses and tips. The more you deliver, the more you earn.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Safe & Secure</CardTitle>
                <CardDescription className="text-base">
                  Your safety is our priority. Insurance coverage and support system to keep you protected on the road.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Fast Payouts</CardTitle>
                <CardDescription className="text-base">
                  Get paid quickly and reliably. Weekly payouts directly to your bank account with transparent tracking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Easy-to-Use App</CardTitle>
                <CardDescription className="text-base">
                  Simple rider app designed for efficiency. Accept orders, navigate routes, and manage deliveries with ease.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground mb-3">Rider Community</CardTitle>
                <CardDescription className="text-base">
                  Join a supportive community of riders. Share tips, get help, and grow together.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 mb-16">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Pagana</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your trusted food delivery platform. Connecting hungry customers with amazing restaurants and dedicated riders.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">For Customers</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link to="/register" className="hover:text-foreground transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <a href="#restaurants" className="hover:text-foreground transition-colors">
                    Browse Restaurants
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">For Restaurants</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Partner With Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Restaurant Dashboard
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">For Riders</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Become a Rider
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Rider Resources
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Copyright Section */}
      <div className="bg-background border-t border-border py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
            <p className="mb-2 sm:mb-0">
              &copy; 2026 Pagana App. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
