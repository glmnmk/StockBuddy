import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Header } from "./components/layout/Header";
import { Home } from "./pages/Home";
import { StockList } from "./pages/StockList";
import { StockDetail } from "./pages/StockDetail";
import { Calculator } from "./pages/Calculator";
import { Glossary } from "./pages/Glossary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="stockbuddy-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/stocks" element={<StockList />} />
                <Route path="/stocks/:ticker" element={<StockDetail />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <footer className="text-center py-8 text-muted-foreground">
              <p>StockBuddy - For educational purposes only. Not financial advice.</p>
            </footer>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
