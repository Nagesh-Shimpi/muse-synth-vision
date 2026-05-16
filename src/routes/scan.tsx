import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Uploader } from "@/components/Uploader";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { analyzeInstrument } from "@/lib/vision.functions";
import { mapToPlayable } from "@/lib/instruments";
import { useHistoryStore } from "@/lib/history-store";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan — Virtual Instrument Vision AI" },
      { name: "description", content: "Upload or capture a photo of an instrument and let AI identify it." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const analyze = useServerFn(analyzeInstrument);
  const navigate = useNavigate();
  const { add, setCurrent } = useHistoryStore();

  const onPicked = async (dataUrl: string) => {
    setImage(dataUrl);
    setLoading(true);
    try {
      const result = await analyze({ data: { imageDataUrl: dataUrl } });
      const playable = mapToPlayable(result.instrument);
      const item = {
        id: crypto.randomUUID(),
        imageDataUrl: dataUrl,
        detection: { ...result, playable },
        createdAt: Date.now(),
      };
      add(item);
      setCurrent(item);
      navigate({ to: "/result" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      toast.error(msg);
      setLoading(false);
      setImage(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center">
        Scan an <span className="neon-text">instrument</span>
      </h1>
      <p className="mt-3 text-center text-muted-foreground">
        Any photo, painting, or museum piece will do.
      </p>
      <div className="mt-8">
        {loading && image ? <AnalyzingOverlay src={image} /> : <Uploader onPicked={onPicked} loading={loading} />}
      </div>
    </div>
  );
}
