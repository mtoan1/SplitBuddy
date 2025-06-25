import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BillDashboard from "@/pages/bill-dashboard";
import CreateBill from "@/pages/create-bill";
import ParticipantSelection from "@/pages/participant-selection";
import PaymentScreen from "@/pages/payment-screen";
import PaymentSuccess from "@/pages/payment-success";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BillDashboard} />
      <Route path="/create" component={CreateBill} />
      <Route path="/bill/:billId" component={ParticipantSelection} />
      <Route path="/bill/:billId/pay/:participantId" component={PaymentScreen} />
      <Route path="/bill/:billId/success" component={PaymentSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
