import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Homepage from "@/pages/homepage";
import BillDashboard from "@/pages/bill-dashboard";
import CreateBill from "@/pages/create-bill";
import BillDetail from "@/pages/bill-detail";
import ManualParticipants from "@/pages/manual-participants";
import ParticipantSelection from "@/pages/participant-selection";
import PaymentFlow from "@/pages/payment-flow";
import PaymentSuccess from "@/pages/payment-success";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/bills" component={BillDashboard} />
      <Route path="/create-bill" component={CreateBill} />
      <Route path="/bill/:id/participants" component={ManualParticipants} />
      <Route path="/bill/:id" component={BillDetail} />
      <Route path="/bills/:id/participants" component={ParticipantSelection} />
      <Route path="/payment/:billId/:participantId" component={PaymentFlow} />
      <Route path="/payment-success/:billId/:participantId" component={PaymentSuccess} />
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
