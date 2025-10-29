import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/icon-mon-black.png" alt="RNC Atlas" className="w-8 h-8" />
            <h1 className="text-xl font-semibold text-slate-900">RNC Atlas</h1>
          </div>
          <Button onClick={handleLogin}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Software Asset Management
            <span className="text-primary-600"> Simplified</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Track, manage, and optimize your software assets with comprehensive dependency mapping, 
            cost tracking, and multi-tenant architecture.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-3">
            Get Started
            <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-desktop text-blue-600 text-xl"></i>
              </div>
              <CardTitle>Software Asset Management</CardTitle>
              <CardDescription>
                Comprehensive tracking of all software assets with version history, department assignment, and technology categorization.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-server text-green-600 text-xl"></i>
              </div>
              <CardTitle>Environment Management</CardTitle>
              <CardDescription>
                Track and manage infrastructure across cloud providers, on-premise servers, VMs, and container environments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-project-diagram text-purple-600 text-xl"></i>
              </div>
              <CardTitle>Dependency Mapping</CardTitle>
              <CardDescription>
                Interactive visualization of software dependencies with critical path analysis and impact assessment.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-dollar-sign text-amber-600 text-xl"></i>
              </div>
              <CardTitle>Cost Tracking</CardTitle>
              <CardDescription>
                Monitor license costs, subscriptions, and development expenses with detailed reporting and budgeting.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-link text-red-600 text-xl"></i>
              </div>
              <CardTitle>Traceability</CardTitle>
              <CardDescription>
                Complete traceability between environments and software with deployment tracking and status monitoring.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-users text-indigo-600 text-xl"></i>
              </div>
              <CardTitle>Multi-Tenant</CardTitle>
              <CardDescription>
                Secure multi-tenant architecture with role-based access control and data isolation.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-12 shadow-sm border">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to take control of your software assets?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join organizations worldwide who trust RNC Atlas to manage their software portfolio efficiently.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-3">
            Start Your Free Trial
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/icon-mon-black.png" alt="RNC Atlas" className="w-6 h-6" />
              <span className="text-slate-600">© 2025 RNC Atlas. All rights reserved.</span>
            </div>
            <div className="text-slate-500 text-sm">
              Secure • Scalable • Simple
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
