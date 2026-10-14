import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save, Rocket, Plus, Trash2, Monitor, Smartphone, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { saveWebsiteProject, publishWebsiteProject } from "@/lib/ai.functions";
import { toSiteCopy, type SiteCopy } from "@/lib/site-copy";
import { renderSiteHtml, type SiteBusiness } from "@/lib/site-render";

type Props = {
  workspaceId: string;
  project: { id: string; name: string; strategy: unknown; status: string; slug?: string | null };
  business: SiteBusiness;
  onClose: () => void;
  onSaved: () => void;
};

export function SiteEditor({ workspaceId, project, business, onClose, onSaved }: Props) {
  const [copy, setCopy] = useState(() => toSiteCopy(project.strategy));
  const [savedCopy, setSavedCopy] = useState(() => JSON.stringify(toSiteCopy(project.strategy)));
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [mobile, setMobile] = useState(false);
  const [liveUrl, setLiveUrl] = useState(project.status === "published" && project.slug ? `/sites/${project.slug}` : "");
  const save = useServerFn(saveWebsiteProject);
  const publish = useServerFn(publishWebsiteProject);
  const dirty = JSON.stringify(copy) !== savedCopy;
  const update = <K extends keyof SiteCopy>(key: K, value: SiteCopy[K]) => setCopy((current) => ({ ...current, [key]: value }));
  const close = () => { if (!busy && (!dirty || window.confirm("Discard unsaved changes?"))) onClose(); };
  async function submit(mode: "save" | "publish") {
    setBusy(mode);
    try {
      const result = await (mode === "save" ? save : publish)({ data: { workspaceId, projectId: project.id, copy } });
      if (!result.ok) { toast.error(result.error); return; }
      setSavedCopy(JSON.stringify(copy));
      if ("url" in result) setLiveUrl(result.url);
      onSaved();
      toast.success(mode === "save" ? "Draft saved. The live site is unchanged." : "Your edited site is published.");
    } catch { toast.error("Changes could not be saved. Please retry."); }
    finally { setBusy(null); }
  }
  const field = (key: "hero_headline" | "hero_subheadline" | "cta" | "about" | "contact" | "strategy", label: string, max: number, multiline = false) => (
    <label className="block space-y-2" key={key}>
      <span className="text-sm font-medium">{label}</span>
      {multiline ? <Textarea value={copy[key]} maxLength={max} rows={3} onChange={(event) => update(key, event.target.value)} />
        : <Input value={copy[key]} maxLength={max} onChange={(event) => update(key, event.target.value)} />}
    </label>
  );
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="flex h-[92dvh] max-w-[1400px] flex-col gap-0 overflow-hidden p-0" onEscapeKeyDown={(event) => { event.preventDefault(); close(); }} onInteractOutside={(event) => event.preventDefault()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 pr-12">
          <div><DialogTitle>{project.name}</DialogTitle><DialogDescription>{dirty ? "Unsaved changes" : "Draft saved"}{liveUrl ? " · Published" : " · Not published"}</DialogDescription></div>
          <div className="flex flex-wrap gap-2">
            {liveUrl && <Button asChild variant="ghost" size="sm"><a href={liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />View live site</a></Button>}
            <Button variant="secondary" size="sm" disabled={Boolean(busy) || !dirty} onClick={() => void submit("save")}><Save className="mr-2 size-4" />{busy === "save" ? "Saving…" : "Save draft"}</Button>
            <Button size="sm" disabled={Boolean(busy)} onClick={() => void submit("publish")}><Rocket className="mr-2 size-4" />{busy === "publish" ? "Publishing…" : liveUrl ? "Publish changes" : "Publish site"}</Button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[380px_1fr] lg:overflow-hidden">
          <div className="space-y-6 border-b border-border p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            {field("hero_headline", "Headline", 160)}
            {field("hero_subheadline", "Supporting copy", 300, true)}
            {field("cta", "Button label", 120)}
            {field("about", "About", 900, true)}
            {(["services", "testimonials"] as const).map((key) => <div className="space-y-2" key={key}>
              <div className="flex items-center justify-between"><h3 className="text-sm font-medium">{key === "services" ? "Services" : "Testimonials"}</h3><Button size="icon" variant="ghost" aria-label={`Add ${key === "services" ? "service" : "testimonial"}`} disabled={copy[key].length >= (key === "services" ? 9 : 3)} onClick={() => update(key, [...copy[key], ""])}><Plus className="size-4" /></Button></div>
              {copy[key].map((item, index) => <div className="flex gap-1" key={index}><Textarea aria-label={`${key} ${index + 1}`} maxLength={300} value={item} onChange={(event) => update(key, copy[key].map((entry, i) => i === index ? event.target.value : entry))} /><Button size="icon" variant="ghost" aria-label={`Remove ${key} ${index + 1}`} onClick={() => update(key, copy[key].filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>)}
            </div>)}
            <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">FAQ</h3><Button size="icon" variant="ghost" aria-label="Add FAQ" disabled={copy.faq.length >= 6} onClick={() => update("faq", [...copy.faq, { q: "", a: "" }])}><Plus className="size-4" /></Button></div>
              {copy.faq.map((item, index) => <div className="space-y-2 border-b border-border pb-3" key={index}><div className="flex gap-1"><Input aria-label={`Question ${index + 1}`} maxLength={200} value={item.q} onChange={(event) => update("faq", copy.faq.map((entry, i) => i === index ? { ...entry, q: event.target.value } : entry))} /><Button size="icon" variant="ghost" aria-label={`Remove FAQ ${index + 1}`} onClick={() => update("faq", copy.faq.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div><Textarea aria-label={`Answer ${index + 1}`} maxLength={500} value={item.a} onChange={(event) => update("faq", copy.faq.map((entry, i) => i === index ? { ...entry, a: event.target.value } : entry))} /></div>)}
            </div>
            {field("contact", "Contact copy", 500, true)}
            {field("strategy", "Search description", 1500, true)}
          </div>
          <div className="flex min-h-[600px] min-w-0 flex-col bg-panel2 lg:min-h-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2"><span className="label-mono">Preview</span><div className="flex gap-1"><Button size="icon" variant={mobile ? "ghost" : "secondary"} aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor className="size-4" /></Button><Button size="icon" variant={mobile ? "secondary" : "ghost"} aria-label="Mobile preview" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone className="size-4" /></Button></div></div>
            <iframe title="Website preview" sandbox="" srcDoc={renderSiteHtml(business, copy)} className={`mx-auto min-h-[540px] flex-1 border-0 ${mobile ? "w-full max-w-[390px]" : "w-full"}`} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}