import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getPlans, addPlan, updatePlan, deletePlan } from "@/lib/store";
import type { PlanStatus } from "@/types";
import { Plus, MapPin, Clock, Navigation, Trash2, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@/hooks/useQuery";

export default function Plans() {
  const { data: plans = [], refresh, loading } = useQuery(() => getPlans());
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", location: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "", end_time: "", travel_time: "", notes: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [detailPlan, setDetailPlan] = useState<typeof plans[0] | null>(null);

  const setField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  // Calculate departure time
  const departureTime = useMemo(() => {
    if (!form.start_time || !form.travel_time) return null;
    const [h, m] = form.start_time.split(":").map(Number);
    const travel = parseInt(form.travel_time) || 0;
    const totalMin = h * 60 + m - travel;
    const dh = Math.floor(totalMin / 60);
    const dm = totalMin % 60;
    return `${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`;
  }, [form.start_time, form.travel_time]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Enter a title"); return; }
    if (!form.date) { toast.error("Select a date"); return; }
    setAddLoading(true);
    try {
      await addPlan({
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        date: form.date,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        travel_time_minutes: form.travel_time ? parseInt(form.travel_time) : undefined,
        departure_time: departureTime || undefined,
        status: "upcoming",
        notes: form.notes.trim() || undefined,
      });
      toast.success("Plan added!");
      setForm({ title: "", location: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "", end_time: "", travel_time: "", notes: "" });
      setAddOpen(false); refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setAddLoading(false); }
  };

  const handleStatusChange = async (id: string, status: PlanStatus) => {
    try {
      await updatePlan(id, { status });
      toast.success(status === "done" ? "Marked done!" : status === "cancelled" ? "Cancelled" : "Updated");
      setDetailPlan(null); refresh();
    } catch { toast.error("Failed"); }
  };

  const upcoming = plans.filter((p) => p.status === "upcoming" || p.status === "in_progress");
  const past = plans.filter((p) => p.status === "done" || p.status === "cancelled");

  const statusColors: Record<PlanStatus, string> = {
    upcoming: "bg-primary/10 text-primary",
    in_progress: "bg-amber-500/10 text-amber-500",
    done: "bg-emerald-500/10 text-emerald-500",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Plans</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-card border border-border/50 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Upcoming</h3>
              {upcoming.map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-card border border-border/50 p-4 cursor-pointer active:scale-[0.99] transition-all" onClick={() => setDetailPlan(plan)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{plan.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{format(new Date(plan.date), "d MMM, EEE")}</span>
                        {plan.start_time && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {plan.start_time.slice(0, 5)}
                            {plan.end_time && ` - ${plan.end_time.slice(0, 5)}`}
                          </span>
                        )}
                        {plan.location && (
                          <span className="text-[11px] text-primary flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {plan.location}
                          </span>
                        )}
                      </div>
                      {plan.departure_time && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Navigation className="h-3 w-3 text-amber-500" />
                          <span className="text-[11px] text-amber-500 font-semibold">Leave by {plan.departure_time.slice(0, 5)}</span>
                          {plan.travel_time_minutes && <span className="text-[10px] text-muted-foreground">({plan.travel_time_minutes} min travel)</span>}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${statusColors[plan.status]}`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Past</h3>
              {past.map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-card border border-border/50 p-4 opacity-60 cursor-pointer" onClick={() => setDetailPlan(plan)}>
                  <p className="text-sm font-bold">{plan.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{format(new Date(plan.date), "d MMM")}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColors[plan.status]}`}>{plan.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {plans.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold">No plans yet</h3>
              <p className="text-sm text-muted-foreground mt-1.5">Add your upcoming plans</p>
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button onClick={() => setAddOpen(true)} className="fixed bottom-20 right-5 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Add Plan Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 max-h-[90vh] overflow-y-auto scrollbar-hide" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <SheetHeader className="p-0 pb-4"><SheetTitle className="text-xl font-bold">Add Plan</SheetTitle></SheetHeader>
          <div className="space-y-4 mb-5">
            <div>
              <Label className="label-caps text-muted-foreground">What's the plan?</Label>
              <Input placeholder="e.g. Doctor appointment" value={form.title} onChange={(e) => setField("title", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Location</Label>
              <Input placeholder="Where?" value={form.location} onChange={(e) => setField("location", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps text-muted-foreground">Start Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setField("start_time", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
              <div>
                <Label className="label-caps text-muted-foreground">End Time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setField("end_time", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Travel Time (minutes)</Label>
              <Input type="number" placeholder="e.g. 30" value={form.travel_time} onChange={(e) => setField("travel_time", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              {departureTime && (
                <p className="text-xs text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> You should leave by {departureTime}
                </p>
              )}
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Notes</Label>
              <Input placeholder="Any notes..." value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={addLoading} className="w-full h-14 text-base font-bold rounded-2xl">
            {addLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Adding...</> : "Add Plan"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!detailPlan} onOpenChange={(v) => { if (!v) setDetailPlan(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          {detailPlan && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">{detailPlan.title}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${statusColors[detailPlan.status]}`}>{detailPlan.status}</span>
              </div>

              <div className="rounded-2xl bg-secondary/40 p-4 space-y-2.5">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm font-medium">{format(new Date(detailPlan.date), "d MMM yyyy, EEEE")}</span></div>
                {detailPlan.start_time && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm font-medium">{detailPlan.start_time.slice(0, 5)}{detailPlan.end_time ? ` - ${detailPlan.end_time.slice(0, 5)}` : ""}</span></div>}
                {detailPlan.location && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Location</span><span className="text-sm font-medium text-primary">{detailPlan.location}</span></div>}
                {detailPlan.departure_time && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Leave by</span><span className="text-sm font-bold text-amber-500">{detailPlan.departure_time.slice(0, 5)}</span></div>}
                {detailPlan.notes && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm font-medium">{detailPlan.notes}</span></div>}
              </div>

              {(detailPlan.status === "upcoming" || detailPlan.status === "in_progress") && (
                <div className="flex gap-2">
                  <Button onClick={() => handleStatusChange(detailPlan.id, "done")} className="flex-1 h-12 rounded-2xl font-bold gap-1.5">
                    <Check className="h-4 w-4" /> Done
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange(detailPlan.id, "cancelled")} className="flex-1 h-12 rounded-2xl font-bold gap-1.5">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
              <Button variant="destructive" onClick={async () => { try { await deletePlan(detailPlan.id); toast.success("Deleted"); setDetailPlan(null); refresh(); } catch { toast.error("Failed"); } }} className="w-full h-12 rounded-2xl font-bold">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
