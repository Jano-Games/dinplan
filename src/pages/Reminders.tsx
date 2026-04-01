import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getReminders, addReminder, dismissReminder, deleteReminder } from "@/lib/store";
import { subscribeToPush } from "@/lib/push";
import { Plus, Bell, BellOff, Trash2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@/hooks/useQuery";

export default function Reminders() {
  const { data: reminders = [], refresh, loading } = useQuery(getReminders);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindDate, setRemindDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [remindTime, setRemindTime] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [permStatus, setPermStatus] = useState<string>(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  // Request notification permission + subscribe to push
  const requestPermission = async () => {
    const success = await subscribeToPush();
    if (success) {
      setPermStatus("granted");
      toast.success("Notifications enabled! You'll get alerts even when app is closed.");
    } else {
      if ("Notification" in window) setPermStatus(Notification.permission);
      toast.error("Could not enable notifications");
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Enter a title"); return; }
    if (!remindTime) { toast.error("Set a time"); return; }
    const remindAt = new Date(`${remindDate}T${remindTime}`).toISOString();
    if (new Date(remindAt) < new Date()) { toast.error("Time must be in the future"); return; }
    setAddLoading(true);
    try {
      await requestPermission();
      await addReminder({
        type: "custom",
        title: title.trim(),
        body: body.trim() || undefined,
        remind_at: remindAt,
      });
      toast.success("Reminder set!");
      setTitle(""); setBody(""); setRemindTime("");
      setAddOpen(false); refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setAddLoading(false); }
  };

  const pending = reminders.filter((r) => !r.is_fired && !r.is_dismissed);
  const fired = reminders.filter((r) => r.is_fired && !r.is_dismissed);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Reminders</h1>

      {permStatus !== "granted" && permStatus !== "unsupported" && (
        <button
          onClick={requestPermission}
          className="w-full rounded-2xl bg-primary/5 border border-primary/15 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">Get alerted when reminders fire</p>
            </div>
          </div>
        </button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 rounded-2xl bg-card border border-border/50 animate-pulse" />)}
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Upcoming ({pending.length})</h3>
              {pending.map((rem) => (
                <div key={rem.id} className="rounded-2xl bg-card border border-border/50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{rem.title}</p>
                        {rem.body && <p className="text-xs text-muted-foreground mt-0.5">{rem.body}</p>}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(rem.remind_at), "d MMM, h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={async () => { try { await deleteReminder(rem.id); toast.success("Deleted"); refresh(); } catch { toast.error("Failed"); } }} className="text-muted-foreground/40 hover:text-destructive p-1.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fired.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-caps text-muted-foreground">Fired</h3>
              {fired.map((rem) => (
                <div key={rem.id} className="rounded-2xl bg-card border border-border/50 p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{rem.title}</p>
                        <span className="text-[11px] text-muted-foreground">{format(new Date(rem.remind_at), "d MMM, h:mm a")}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={async () => { await dismissReminder(rem.id); refresh(); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Dismiss</button>
                      <button onClick={async () => { await deleteReminder(rem.id); refresh(); }} className="text-muted-foreground/40 hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reminders.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold">No reminders</h3>
              <p className="text-sm text-muted-foreground mt-1.5">Set reminders for important things</p>
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button onClick={() => setAddOpen(true)} className="fixed bottom-20 right-5 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Add Reminder Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8" showCloseButton={false}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <SheetHeader className="p-0 pb-4"><SheetTitle className="text-xl font-bold">Set Reminder</SheetTitle></SheetHeader>
          <div className="space-y-4 mb-5">
            <div>
              <Label className="label-caps text-muted-foreground">What to remind?</Label>
              <Input placeholder="e.g. Take medicine" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div>
              <Label className="label-caps text-muted-foreground">Details (optional)</Label>
              <Input placeholder="Additional info..." value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps text-muted-foreground">Date</Label>
                <Input type="date" value={remindDate} onChange={(e) => setRemindDate(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
              <div>
                <Label className="label-caps text-muted-foreground">Time</Label>
                <Input type="time" value={remindTime} onChange={(e) => setRemindTime(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-border/60" />
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={addLoading} className="w-full h-14 text-base font-bold rounded-2xl">
            {addLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Setting...</> : "Set Reminder"}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
