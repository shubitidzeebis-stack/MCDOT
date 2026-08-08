// TEMPORARY — contact sheet for reviewing rendered creatives. Delete after use.
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const FONTS = path.join(process.cwd(), "docs/ad-samples/fonts");

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const dir = q.get("dir")!;
  const COLS = Number(q.get("cols") ?? 4);
  const CW = Number(q.get("cw") ?? 270);
  const CH = Number(q.get("ch") ?? 338);

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
  const cells = files.map((f) => {
    const ext = f.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return {
      id: f.replace(/\.(png|jpe?g)$/i, "").replace(/^veritor_/, "").slice(0, 24),
      uri: `data:image/${ext};base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}`,
    };
  });

  const rows = Math.ceil(cells.length / COLS);

  return new ImageResponse(
    (
      <div
        style={{
          width: COLS * CW,
          height: rows * CH,
          display: "flex",
          flexWrap: "wrap",
          background: "#111",
          fontFamily: "Inter",
        }}
      >
        {cells.map((c) => (
          <div
            key={c.id}
            style={{ width: CW, height: CH, display: "flex", position: "relative" }}
          >
            <img src={c.uri} width={CW} height={CH} />
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                display: "flex",
                padding: "2px 6px",
                background: "rgba(0,0,0,0.8)",
                color: "#ff8a1a",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {c.id}
            </div>
          </div>
        ))}
      </div>
    ),
    {
      width: COLS * CW,
      height: rows * CH,
      fonts: [
        {
          name: "Inter",
          data: fs.readFileSync(path.join(FONTS, "Inter-SemiBold.ttf")),
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
